// services/matchService.js
import { getDB } from '../db/mongo.js';
import { 
    PLAYERS_COLLECTION, 
    MATCH_HISTORY_LENGTH, 
    STANDARD_ROLES, 
    MATCHES_COLLECTION ,
    STREAK_THRESHOLDS
} from '../config/constants.js';
import * as eloService from './eloService.js';
import * as playerService from './playerService.js';
import * as championService from './championService.js';


function generatePerformanceStats(playerCurrentElo, playerRole, didPlayerWin, championPlayed, avgMatchElo, avgTeamElo, avgOpponentElo) {

    let kills, deaths, assists, cs, gold;
    const baseValues = {
        "Top":    { kills: 3, deaths: 4, assists: 5, cs: 180, gold: 11000 },
        "Jungle": { kills: 4, deaths: 4, assists: 8, cs: 140, gold: 10500 },
        "Mid":    { kills: 5, deaths: 4, assists: 6, cs: 200, gold: 12000 },
        "ADC":    { kills: 6, deaths: 4, assists: 5, cs: 220, gold: 12500 },
        "Support":{ kills: 1, deaths: 5, assists: 15,cs: 40,  gold: 8500  }
    };
    const roleBase = baseValues[playerRole] || baseValues["Top"];
    const eloDifference = Math.max(-500, Math.min(500, playerCurrentElo - avgMatchElo));
    let skillFactor = 1 + (eloDifference / 1000); 
    const winFactor = didPlayerWin ? 1.15 : 0.85;
    const deathFactorOnLoss = didPlayerWin ? 0.9 : 1.15;
    const teamEloAdvantage = avgTeamElo - avgOpponentElo;
    let teamPerformanceFactor = 1 + (teamEloAdvantage / 1500);
    teamPerformanceFactor = Math.max(0.7, Math.min(1.3, teamPerformanceFactor));
    kills = roleBase.kills * skillFactor * winFactor * teamPerformanceFactor;
    deaths = roleBase.deaths / (skillFactor > 1 ? skillFactor * 0.8 : Math.max(0.5, skillFactor)) * deathFactorOnLoss / teamPerformanceFactor;
    assists = roleBase.assists * skillFactor * winFactor * teamPerformanceFactor;
    cs = roleBase.cs * skillFactor * (didPlayerWin ? 1.1 : 0.95);
    if (playerRole === "Jungle") {
        cs = roleBase.cs * skillFactor * (didPlayerWin ? 1.05 : 0.95);
    }
    kills = Math.max(0, Math.round(kills + (Math.random() * 3 - 1.5)));
    deaths = Math.max(0, Math.round(deaths + (Math.random() * 3 - 1.5)));
    assists = Math.max(0, Math.round(assists + (Math.random() * 5 - 2.5)));
    cs = Math.max(0, Math.round(cs + (Math.random() * (playerRole === "Support" ? 20 : 50) - (playerRole === "Support" ? 10 : 25))));
    gold = roleBase.gold * skillFactor * winFactor * teamPerformanceFactor;
    gold += (kills * 250) + (assists * 100) - (deaths * 150) + (cs * 18);
    gold = Math.max(2500, Math.round(gold + (Math.random() * 1500 - 750)));
    if (skillFactor > 1.3 && didPlayerWin) {
        kills = Math.max(kills, Math.round(roleBase.kills * 1.5 * skillFactor));
        deaths = Math.min(deaths, Math.round(roleBase.deaths * 0.5 / skillFactor));
    }
    if (skillFactor < 0.7 && !didPlayerWin) {
        deaths = Math.max(deaths, Math.round(roleBase.deaths * 1.5 / skillFactor));
    }
    return { kda: { kills, deaths, assists }, cs, gold };
}



async function updatePlayerAfterMatch(db, playerId, calculatedEloDelta, matchRecordForHistory) {

    const player = await db.collection(PLAYERS_COLLECTION).findOne({ playerId: playerId });
    if (!player) return null;

    let finalEloDeltaWithPBR = calculatedEloDelta; 

    let newWinStreak = player.currentWinStreak || 0;
    let newLossStreak = player.currentLossStreak || 0;
    const didPlayerWinThisMatch = matchRecordForHistory.result === "win";

    if (didPlayerWinThisMatch) {
        newWinStreak++;
        newLossStreak = 0;
    } else {
        newLossStreak++;
        newWinStreak = 0;
    }

    let streakAdjustment = 0;    
    if (newWinStreak >= (STREAK_THRESHOLDS?.WIN_STREAK_BONUS?.[0]?.count || 3) ) { // Added safe navigation
        for (const threshold of (STREAK_THRESHOLDS?.WIN_STREAK_BONUS || [])) {
            if (newWinStreak >= threshold.count) {
                streakAdjustment = threshold.bonus; 
            } else { break; }
        }
    } else if (newLossStreak >= (STREAK_THRESHOLDS?.LOSS_STREAK_MALUS?.[0]?.count || 3) ) {
        for (const threshold of (STREAK_THRESHOLDS?.LOSS_STREAK_MALUS || [])) {
            if (newLossStreak >= threshold.count) {
                streakAdjustment = -threshold.malus;
            } else { break; }
        }
    }
    let finalEloDeltaWithStreak = finalEloDeltaWithPBR + streakAdjustment;

    let newElo = player.elo + finalEloDeltaWithStreak;
    let actualEloChangeForHistory = finalEloDeltaWithStreak;

    if (newElo < 0) {
        newElo = 0;
        actualEloChangeForHistory = 0 - player.elo; 
    }
    
    const newGamesPlayed = player.gamesPlayed + 1;
    
    const finalMatchRecordForPlayerHistory = {
        ...matchRecordForHistory,
        eloChange: actualEloChangeForHistory,
        streakAdjustment: streakAdjustment 
    };

    await db.collection(PLAYERS_COLLECTION).updateOne(
        { playerId: playerId },
        {
            $set: { 
                elo: newElo, 
                gamesPlayed: newGamesPlayed,
                currentWinStreak: newWinStreak,
                currentLossStreak: newLossStreak
            },
            $push: {
                matchHistory: {
                    $each: [finalMatchRecordForPlayerHistory],
                    $slice: -MATCH_HISTORY_LENGTH
                }
            }
        }
    );
    return { 
        playerName: player.playerName, 
        oldElo: player.elo, 
        newElo,
        eloChange: actualEloChangeForHistory, 
        baseEloPlusPbrDelta: finalEloDeltaWithPBR,
        streakAdjustment: streakAdjustment,
        playerId: player.playerId, 
        championId: finalMatchRecordForPlayerHistory.championPlayed.championId,
        championName: finalMatchRecordForPlayerHistory.championPlayed.championName,
        role: finalMatchRecordForPlayerHistory.role,
        kda: finalMatchRecordForPlayerHistory.kda,
        cs: finalMatchRecordForPlayerHistory.cs,
        gold: finalMatchRecordForPlayerHistory.gold,
        eloBefore: player.elo,
        eloAfter: newElo
    };
}


async function assignRolesAndChampions(participantsFromDB) {
 
    const gameParticipants = [];
    const teamAAssignments = new Map();
    const teamBAssignments = new Map();

    let teamAPlayers = [];
    let teamBPlayers = [];

    
    const shuffledParticipants = [...participantsFromDB].sort(() => 0.5 - Math.random());
    const potentialTeamA = shuffledParticipants.slice(0, 5);
    const potentialTeamB = shuffledParticipants.slice(5, 10);

    const assignToTeam = async (team, availableRolesSource) => {
        const assignedPlayers = [];
        let availableRoles = [...availableRolesSource];
      
        for (const playerDoc of team) {
            let assignedRoleThisPlayer = null;
            if (playerDoc.preferredRoles && playerDoc.preferredRoles.length > 0) {
                for (const prefRole of playerDoc.preferredRoles) {
                    const roleIndex = availableRoles.indexOf(prefRole);
                    if (roleIndex > -1) {
                        assignedRoleThisPlayer = availableRoles.splice(roleIndex, 1)[0];
                        break;
                    }
                }
            }
            assignedPlayers.push({ ...playerDoc, tempAssignedRole: assignedRoleThisPlayer });
        }

       
        for (const playerWithRole of assignedPlayers) {
            if (!playerWithRole.tempAssignedRole && availableRoles.length > 0) {
                playerWithRole.tempAssignedRole = availableRoles.splice(Math.floor(Math.random() * availableRoles.length), 1)[0];
            }
        }
        
     
        const finalTeamMembers = [];
        for (const p of assignedPlayers) {
            if (!p.tempAssignedRole) { 
                 console.warn(`Player ${p.playerId} could not be assigned a role.`);
                 continue;
            }
            let chosenChampion = null;
            let eligibleChampionsFromPool = [];
            if (p.championPool && p.championPool.length > 0) {
                const allChamps = await championService.getAllChampions();
                eligibleChampionsFromPool = p.championPool
                    .map(cpId => allChamps.find(c => c.championId === cpId))
                    .filter(champ => champ && (champ.primaryRole === p.tempAssignedRole || (champ.secondaryRoles && champ.secondaryRoles.includes(p.tempAssignedRole))));
            }

            if (eligibleChampionsFromPool.length > 0) {
                chosenChampion = eligibleChampionsFromPool[Math.floor(Math.random() * eligibleChampionsFromPool.length)];
            } else {
                chosenChampion = await championService.getRandomChampion(p.tempAssignedRole);
            }
            finalTeamMembers.push({
                ...p,
                role: p.tempAssignedRole,
                champion: chosenChampion ? { championId: chosenChampion.championId, championName: chosenChampion.championName } : { championId: "unknown", championName: "Unknown" },
            });
        }
        return finalTeamMembers;
    };

    teamAPlayers = await assignToTeam(potentialTeamA, STANDARD_ROLES);
    teamBPlayers = await assignToTeam(potentialTeamB, STANDARD_ROLES);
    
   
    if (teamAPlayers.length !== 5 || teamBPlayers.length !== 5) {
        console.warn("Advanced role assignment might have issues, using basic fallback for team structure.");
        teamAPlayers = []; teamBPlayers = []; // Reset
        const allChampsList = await championService.getAllChampions(); // Get all champs once
        for (let i = 0; i < 10; i++) {
            const playerDoc = participantsFromDB[i]; // Use original order or re-shuffle
            const assignedRole = STANDARD_ROLES[i % 5]; // Simple cyclic role assignment
            const suitableChamps = allChampsList.filter(c => c.primaryRole === assignedRole || (c.secondaryRoles && c.secondaryRoles.includes(assignedRole)));
            const champion = suitableChamps.length > 0 ? suitableChamps[Math.floor(Math.random() * suitableChamps.length)] : await championService.getRandomChampion(assignedRole);

            const playerWithDetails = {
                ...playerDoc,
                role: assignedRole,
                champion: champion ? { championId: champion.championId, championName: champion.championName } : { championId: "unknown", championName: "Unknown" },
            };
            if (i < 5) teamAPlayers.push(playerWithDetails);
            else teamBPlayers.push(playerWithDetails);
        }
    }
    return { teamAData: teamAPlayers, teamBData: teamBPlayers };
}


// --- Main Service Function: simulateNewMatch ---
export async function simulateNewMatch() {
    const db = await getDB();
    const playerCount = await db.collection(PLAYERS_COLLECTION).countDocuments();

    if (playerCount < 10) {
        return { success: false, message: "Not enough players in DB to simulate a match (need at least 10)." };
    }

    const currentMatchId = playerService.getNextMatchId();
    const matchTimestamp = new Date();

  
    const participantsFromDB = await db.collection(PLAYERS_COLLECTION).aggregate([
        { $match: { gamesPlayed: { $gte: 0 } } },
        { $sample: { size: 10 } }
    ]).toArray();

    if (participantsFromDB.length < 10) {
        return { success: false, message: "Could not sample 10 players for the match." };
    }

   
    const { teamAData, teamBData } = await assignRolesAndChampions(participantsFromDB);

    if (!teamAData || teamAData.length !== 5 || !teamBData || teamBData.length !== 5) {
        console.error("Failed to form complete teams.", { teamALength: teamAData?.length, teamBLength: teamBData?.length });
        return { success: false, message: "Internal error: Failed to form complete teams for the match." };
    }
    
    const calculateTeamAvgElo = (team) => team.reduce((sum, p) => sum + p.elo, 0) / team.length;
    const avgEloTeamA_before = calculateTeamAvgElo(teamAData);
    const avgEloTeamB_before = calculateTeamAvgElo(teamBData);
    const avgMatchElo = (avgEloTeamA_before + avgEloTeamB_before) / 2;

    const probTeamAWins = eloService.calculateExpectedScore(avgEloTeamA_before, avgEloTeamB_before);
    const teamAWins = Math.random() < probTeamAWins;

   
    teamAData.forEach(p => {
        p.performance = generatePerformanceStats(p.elo, p.role, teamAWins, p.champion, avgMatchElo, avgEloTeamA_before, avgEloTeamB_before);
    });
    teamBData.forEach(p => {
        p.performance = generatePerformanceStats(p.elo, p.role, !teamAWins, p.champion, avgMatchElo, avgEloTeamB_before, avgEloTeamA_before);
    });

    const updatedTeamAPlayerInfo = [];
    const updatedTeamBPlayerInfo = [];

    // Update Elo for players in Team A
    for (const player of teamAData) {
        const eloDeltaFromService = eloService.calculateEloDelta(
            player.elo, player.gamesPlayed, teamAWins, 
            avgEloTeamA_before, avgEloTeamB_before,
            player.role, player.performance.kda, player.performance.cs, player.performance.gold,
            avgMatchElo
        );
        const matchRecordForPlayerHistory = { 
            matchId: currentMatchId, 
            myTeamAvgElo: avgEloTeamA_before, 
            opponentTeamAvgElo: avgEloTeamB_before, 
            result: teamAWins ? "win" : "loss",
            timestamp: matchTimestamp,
            role: player.role,
            championPlayed: player.champion, 
            kda: player.performance.kda,
            cs: player.performance.cs,
            gold: player.performance.gold
        };
        const updateResult = await updatePlayerAfterMatch(db, player.playerId, eloDeltaFromService, matchRecordForPlayerHistory);
        if (updateResult) updatedTeamAPlayerInfo.push(updateResult);
    }

    // Update Elo for players in Team B
    for (const player of teamBData) {
        const eloDeltaFromService = eloService.calculateEloDelta(
            player.elo, player.gamesPlayed, !teamAWins, 
            avgEloTeamB_before, avgEloTeamA_before,
            player.role, player.performance.kda, player.performance.cs, player.performance.gold,
            avgMatchElo
        );
        const matchRecordForPlayerHistory = {
            matchId: currentMatchId,
            myTeamAvgElo: avgEloTeamB_before,
            opponentTeamAvgElo: avgEloTeamA_before,
            result: !teamAWins ? "win" : "loss",
            timestamp: matchTimestamp,
            role: player.role,
            championPlayed: player.champion,
            kda: player.performance.kda,
            cs: player.performance.cs,
            gold: player.performance.gold
        };
        const updateResult = await updatePlayerAfterMatch(db, player.playerId, eloDeltaFromService, matchRecordForPlayerHistory);
        if (updateResult) updatedTeamBPlayerInfo.push(updateResult);
    }
    
   
    const finalMatchDocument = {
        matchId: currentMatchId,
        timestamp: matchTimestamp,
        winningTeam: teamAWins ? "A" : "B",
        teamA: {
            avgEloBefore: avgEloTeamA_before,
            players: updatedTeamAPlayerInfo.map(p => ({
                playerId: p.playerId, playerName: p.playerName,
                championId: p.championId, championName: p.championName,
                role: p.role, eloBefore: p.eloBefore, eloAfter: p.eloAfter,
                eloChange: p.eloChange, kda: p.kda, cs: p.cs, gold: p.gold
            }))
        },
        teamB: {
            avgEloBefore: avgEloTeamB_before,
            players: updatedTeamBPlayerInfo.map(p => ({
                playerId: p.playerId, playerName: p.playerName,
                championId: p.championId, championName: p.championName,
                role: p.role, eloBefore: p.eloBefore, eloAfter: p.eloAfter,
                eloChange: p.eloChange, kda: p.kda, cs: p.cs, gold: p.gold
            }))
        }
    };
    await db.collection(MATCHES_COLLECTION).insertOne(finalMatchDocument);
    
    const apiResponseData = {
        matchId: currentMatchId,
        winningTeam: teamAWins ? "A" : "B",
        teamADetails: updatedTeamAPlayerInfo.map(p => ({
            playerName: p.playerName, eloChange: p.eloChange, 
            newElo: p.eloAfter, championName: p.championName, role: p.role,
            streakAdj: p.streakAdjustment 
        })),
        teamBDetails: updatedTeamBPlayerInfo.map(p => ({
            playerName: p.playerName, eloChange: p.eloChange, 
            newElo: p.eloAfter, championName: p.championName, role: p.role,
            streakAdj: p.streakAdjustment
        })),
    };

    return { success: true, message: "Match simulated with role/champion preference and PBR/streaks.", data: apiResponseData };
}


export async function triggerRandomEloInterference(numberOfPlayersToAffect = 3) {
    
    const db = await getDB();
    const playerCount = await db.collection(PLAYERS_COLLECTION).countDocuments();
    if (playerCount === 0) {
        return { success: false, message: "No players in DB to affect." };
    }
    const numToAffect = Math.min(numberOfPlayersToAffect, playerCount);
    if (numToAffect <= 0) {
         return { success: false, message: "Number of players to affect must be positive." };
    }
    const affectedPlayersDocs = await db.collection(PLAYERS_COLLECTION).aggregate([
        { $sample: { size: numToAffect } }
    ]).toArray();
    const updates = [];
    for (const player of affectedPlayersDocs) {
        const randomAdjustment = Math.floor(Math.random() * 31) - 15;
        const oldElo = player.elo;
        let newElo = player.elo + randomAdjustment; 
        if (newElo < 0) newElo = 0; 
        
        await db.collection(PLAYERS_COLLECTION).updateOne(
            { playerId: player.playerId },
            { $set: { elo: newElo } } 
        );
        updates.push({ 
            playerId: player.playerId, 
            playerName: player.playerName, 
            oldElo: oldElo, 
            newElo: newElo, 
            adjustment: randomAdjustment 
        });
    }
    return { success: true, message: `${updates.length} players randomly affected.`, data: updates };
}