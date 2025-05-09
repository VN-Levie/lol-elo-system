// services/matchService.js
import { getDB } from '../db/mongo.js';
import {
    PLAYERS_COLLECTION,
    MATCH_HISTORY_LENGTH,
    STANDARD_ROLES,
    MATCHES_COLLECTION,
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
    if (newWinStreak >= (STREAK_THRESHOLDS?.WIN_STREAK_BONUS?.[0]?.count || 3) ) {
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

function getCombinations(arr, k) {
    if (k < 0 || k > arr.length) return [];
    if (k === 0) return [[]];
    if (arr.length === 0 && k > 0) return [];
    const [head, ...tail] = arr;
    const combsWithHead = getCombinations(tail, k - 1).map(comb => [head, ...comb]);
    const combsWithoutHead = getCombinations(tail, k);
    return [...combsWithHead, ...combsWithoutHead];
}

function findBalancedTeams(selectedPlayers) {
    if (selectedPlayers.length !== 10) return null;

    let bestCombination = null;
    let minEloDiff = Infinity;
    const numPlayers = selectedPlayers.length;
    
    const allPossibleTeamAIndices = getCombinations([...Array(numPlayers).keys()], 5);

    for (const teamAIndices of allPossibleTeamAIndices) {
        if (teamAIndices.length === 0) continue;
        if (teamAIndices[0] > 0 && numPlayers === 10 && allPossibleTeamAIndices.length > 126) {
             // This optimization is tricky with the current combination generator if it's not perfectly ordered
             // For a small set like 10C5, iterating all 252 might be simpler than a complex optimization.
             // The main idea is to check about half if order of players in selectedPlayers is fixed.
        }

        const currentTeamA = teamAIndices.map(index => selectedPlayers[index]);
        const currentTeamB = selectedPlayers.filter((_, index) => !teamAIndices.includes(index));

        if (currentTeamA.length !== 5 || currentTeamB.length !== 5) continue;

        const avgEloA = currentTeamA.reduce((sum, p) => sum + p.elo, 0) / 5;
        const avgEloB = currentTeamB.reduce((sum, p) => sum + p.elo, 0) / 5;
        const eloDiff = Math.abs(avgEloA - avgEloB);

        if (eloDiff < minEloDiff) {
            minEloDiff = eloDiff;
            bestCombination = { teamA: currentTeamA, teamB: currentTeamB, avgEloA, avgEloB, diff: eloDiff };
        }
    }
    return bestCombination;
}

async function assignRolesToTeam(teamPlayers, allChampionsList) {
    let availableRoles = [...STANDARD_ROLES];
    const playersWithRoles = [];

    for (const playerDoc of teamPlayers) {
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
        playersWithRoles.push({ ...playerDoc, tempAssignedRole: assignedRoleThisPlayer });
    }
    for (const p of playersWithRoles) {
        if (!p.tempAssignedRole && availableRoles.length > 0) {
            p.tempAssignedRole = availableRoles.splice(Math.floor(Math.random() * availableRoles.length), 1)[0];
        }
    }
    
    const finalTeam = [];
    for (const p of playersWithRoles) {
        if (!p.tempAssignedRole) continue; 
        let chosenChampion = null;
        let eligibleChampionsFromPool = [];
        if (p.championPool && p.championPool.length > 0) {
            eligibleChampionsFromPool = p.championPool
                .map(cpId => allChampionsList.find(c => c.championId === cpId))
                .filter(champ => champ && (champ.primaryRole === p.tempAssignedRole || (champ.secondaryRoles && champ.secondaryRoles.includes(p.tempAssignedRole))));
        }
        if (eligibleChampionsFromPool.length > 0) {
            chosenChampion = eligibleChampionsFromPool[Math.floor(Math.random() * eligibleChampionsFromPool.length)];
        } else {
            const suitableChampsForRole = allChampionsList.filter(c => c.primaryRole === p.tempAssignedRole || (c.secondaryRoles && c.secondaryRoles.includes(p.tempAssignedRole)));
            if (suitableChampsForRole.length > 0) {
                 chosenChampion = suitableChampsForRole[Math.floor(Math.random() * suitableChampsForRole.length)];
            } else { // Fallback to any champion if no role-specific found (should be rare)
                 chosenChampion = allChampionsList[Math.floor(Math.random() * allChampionsList.length)];
            }
        }
        finalTeam.push({ ...p, role: p.tempAssignedRole, champion: chosenChampion ? { championId: chosenChampion.championId, championName: chosenChampion.championName } : { championId: "unknown", championName: "Unknown" } });
    }
    return finalTeam;
}


export async function simulateNewMatch() {
    const db = await getDB();
    const totalPlayerCount = await db.collection(PLAYERS_COLLECTION).countDocuments();

    if (totalPlayerCount < 10) {
        return { success: false, message: "Not enough players in DB to simulate a match (need at least 10)." };
    }

    let selectedPlayersForMatch = [];
    let attempt = 0;
    const maxAttempts = 5;
    let initialSearchRange = 150;
    const searchRangeIncrement = 100;
    const allChampionsList = await championService.getAllChampions();


    while (selectedPlayersForMatch.length < 10 && attempt < maxAttempts) {
        attempt++;
        selectedPlayersForMatch = []; 

        const seedPlayers = await db.collection(PLAYERS_COLLECTION).aggregate([
            { $sample: { size: 1 } } 
        ]).toArray();

        if (seedPlayers.length === 0) {
            continue; 
        }
        const seedPlayer = seedPlayers[0];
        selectedPlayersForMatch.push(seedPlayer);

        let currentSearchRange = initialSearchRange + (attempt - 1) * searchRangeIncrement;
        const eloLowerBound = seedPlayer.elo - currentSearchRange;
        const eloUpperBound = seedPlayer.elo + currentSearchRange;

        const potentialTeammates = await db.collection(PLAYERS_COLLECTION).find({
            playerId: { $ne: seedPlayer.playerId }, 
            elo: { $gte: eloLowerBound, $lte: eloUpperBound }
        }).limit(30) 
          .toArray();
        
        const shuffledCandidates = potentialTeammates.sort(() => 0.5 - Math.random());
        for (const candidate of shuffledCandidates) {
            if (selectedPlayersForMatch.length < 10 && !selectedPlayersForMatch.find(p => p.playerId === candidate.playerId)) {
                selectedPlayersForMatch.push(candidate);
            }
            if (selectedPlayersForMatch.length === 10) break;
        }
    }

    if (selectedPlayersForMatch.length < 10) {
        selectedPlayersForMatch = await db.collection(PLAYERS_COLLECTION).aggregate([
            { $sample: { size: 10 } }
        ]).toArray();
        if (selectedPlayersForMatch.length < 10) {
             return { success: false, message: "Fallback random selection also failed to get 10 players." };
        }
    }

    const balancedMatch = findBalancedTeams(selectedPlayersForMatch);
    let teamAData_matchmaking, teamBData_matchmaking;

    if (balancedMatch) {
        teamAData_matchmaking = balancedMatch.teamA;
        teamBData_matchmaking = balancedMatch.teamB;
    } else {
        const shuffled = [...selectedPlayersForMatch].sort(() => 0.5 - Math.random());
        teamAData_matchmaking = shuffled.slice(0, 5);
        teamBData_matchmaking = shuffled.slice(5, 10);
    }
    
    const finalTeamAData = await assignRolesToTeam(teamAData_matchmaking, allChampionsList);
    const finalTeamBData = await assignRolesToTeam(teamBData_matchmaking, allChampionsList);

    if (finalTeamAData.length !== 5 || finalTeamBData.length !== 5) {
        const fallbackParticipants = await db.collection(PLAYERS_COLLECTION).aggregate([{ $sample: { size: 10 } }]).toArray();
        const tempTeamA = []; const tempTeamB = [];
        for(let i=0; i<10; i++) {
            const pDoc = fallbackParticipants[i];
            const role = STANDARD_ROLES[i%5];
            const champ = allChampionsList.length > 0 ? allChampionsList[Math.floor(Math.random() * allChampionsList.length)] : {championId:"unknown", championName:"Unknown"};
            const pDetails = {...pDoc, role, champion: champ ? {championId: champ.championId, championName: champ.championName} : {championId:"unknown", championName:"Unknown"}};
            if(i<5) tempTeamA.push(pDetails); else tempTeamB.push(pDetails);
        }
        teamAData_matchmaking = tempTeamA; 
        teamBData_matchmaking = tempTeamB;
    } else {
        teamAData_matchmaking = finalTeamAData;
        teamBData_matchmaking = finalTeamBData;
    }

    const currentMatchId = playerService.getNextMatchId();
    const matchTimestamp = new Date();

    const calculateTeamAvgElo = (team) => team.reduce((sum, p) => sum + p.elo, 0) / team.length;
    const avgEloTeamA_before = calculateTeamAvgElo(teamAData_matchmaking);
    const avgEloTeamB_before = calculateTeamAvgElo(teamBData_matchmaking);
    const avgMatchElo = (avgEloTeamA_before + avgEloTeamB_before) / 2;

    const probTeamAWins = eloService.calculateExpectedScore(avgEloTeamA_before, avgEloTeamB_before);
    const teamAWins = Math.random() < probTeamAWins;

    teamAData_matchmaking.forEach(p => {
        p.performance = generatePerformanceStats(p.elo, p.role, teamAWins, p.champion, avgMatchElo, avgEloTeamA_before, avgEloTeamB_before);
    });
    teamBData_matchmaking.forEach(p => {
        p.performance = generatePerformanceStats(p.elo, p.role, !teamAWins, p.champion, avgMatchElo, avgEloTeamB_before, avgEloTeamA_before);
    });

    const updatedTeamAPlayerInfo = [];
    const updatedTeamBPlayerInfo = [];

    for (const player of teamAData_matchmaking) {
        const eloDeltaFromService = eloService.calculateEloDelta(player.elo, player.gamesPlayed, teamAWins, avgEloTeamA_before, avgEloTeamB_before, player.role, player.performance.kda, player.performance.cs, player.performance.gold, avgMatchElo);
        const matchRecordForPlayerHistory = { 
            matchId: currentMatchId, myTeamAvgElo: avgEloTeamA_before, opponentTeamAvgElo: avgEloTeamB_before, 
            result: teamAWins ? "win" : "loss", timestamp: matchTimestamp, role: player.role,
            championPlayed: player.champion, kda: player.performance.kda,
            cs: player.performance.cs, gold: player.performance.gold
        };
        const updateResult = await updatePlayerAfterMatch(db, player.playerId, eloDeltaFromService, matchRecordForPlayerHistory);
        if (updateResult) updatedTeamAPlayerInfo.push(updateResult);
    }

    for (const player of teamBData_matchmaking) {
        const eloDeltaFromService = eloService.calculateEloDelta(player.elo, player.gamesPlayed, !teamAWins, avgEloTeamB_before, avgEloTeamA_before, player.role, player.performance.kda, player.performance.cs, player.performance.gold, avgMatchElo);
        const matchRecordForPlayerHistory = {
            matchId: currentMatchId, myTeamAvgElo: avgEloTeamB_before, opponentTeamAvgElo: avgEloTeamA_before,
            result: !teamAWins ? "win" : "loss", timestamp: matchTimestamp, role: player.role,
            championPlayed: player.champion, kda: player.performance.kda,
            cs: player.performance.cs, gold: player.performance.gold
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

    return { success: true, message: "Match simulated with improved matchmaking.", data: apiResponseData };
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