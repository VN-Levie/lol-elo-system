import { getDB } from '../db/mongo.js';
import { PLAYERS_COLLECTION, MATCH_HISTORY_LENGTH } from '../config/constants.js';
import * as eloService from './eloService.js';
import * as playerService from './playerService.js'; 
import * as championService from './championService.js';
import { STANDARD_ROLES } from '../config/constants.js';
function generatePerformanceStats(role, didWin, champion) {
    let kills, deaths, assists, cs, gold;

    // Base values - can be adjusted
    const baseKills = { "Top": 3, "Jungle": 5, "Mid": 6, "ADC": 7, "Support": 1 };
    const baseDeaths = { "Top": 4, "Jungle": 4, "Mid": 4, "ADC": 4, "Support": 5 };
    const baseAssists = { "Top": 5, "Jungle": 8, "Mid": 6, "ADC": 5, "Support": 15 };
    const baseCS = { "Top": 180, "Jungle": 130, "Mid": 200, "ADC": 220, "Support": 40 }; // Jungle CS is camps + some lane
    const baseGold = { "Top": 11000, "Jungle": 10500, "Mid": 12000, "ADC": 12500, "Support": 8500 };

    const winMultiplier = didWin ? 1.2 : 0.8;
    const loseMultiplier = didWin ? 0.9 : 1.1; // For deaths when losing

    // Kills (randomness +/- 2 from base, influenced by win)
    kills = Math.max(0, Math.round(baseKills[role] * winMultiplier + (Math.random() * 4 - 2)));
    // Deaths (randomness +/- 2 from base, influenced by win/loss)
    deaths = Math.max(0, Math.round(baseDeaths[role] * loseMultiplier + (Math.random() * 4 - 2)));
    // Assists (randomness +/- 3 from base, influenced by win)
    assists = Math.max(0, Math.round(baseAssists[role] * winMultiplier + (Math.random() * 6 - 3)));
    
    // CS (randomness +/- 30 from base, less win influence directly, more by game state not modeled here)
    cs = Math.max(0, Math.round(baseCS[role] + (Math.random() * 60 - 30)));
    if (role === "Jungle") cs = Math.max(0, Math.round(baseCS[role] + (Math.random() * 40 - 20)));


    // Gold (influenced by KDA, CS and win) - Simplified
    // A more complex model would use gold per minute, objective gold etc.
    gold = Math.round(baseGold[role] * winMultiplier + (kills * 300) + (assists * 100) - (deaths * 100) + (cs * 15) + (Math.random() * 1000 - 500));
    gold = Math.max(500, gold); // Minimum gold

    return {
        kda: { kills, deaths, assists },
        cs,
        gold
    };
}


async function updatePlayerAfterMatch(db, playerId, eloChange, matchRecordForHistory) {
    const player = await db.collection(PLAYERS_COLLECTION).findOne({ playerId: playerId });
    if (!player) return null; 

    let newElo = player.elo + eloChange;    
    if (newElo < 0) {
        newElo = 0;        
        matchRecordForHistory.eloChange = 0 - player.elo;
    } else {      
        matchRecordForHistory.eloChange = eloChange;
    }
    
    const newGamesPlayed = player.gamesPlayed + 1;
   
    await db.collection(PLAYERS_COLLECTION).updateOne(
        { playerId: playerId },
        {
            $set: { elo: newElo, gamesPlayed: newGamesPlayed },
            $push: {
                matchHistory: {
                    $each: [matchRecordForHistory],
                    $slice: -MATCH_HISTORY_LENGTH
                }
            }
        }
    );
   
    return { 
        playerName: player.playerName, 
        oldElo: player.elo, 
        newElo, 
        eloChange: matchRecordForHistory.eloChange, 
        role: matchRecordForHistory.role, 
        champion: matchRecordForHistory.championPlayed.championName 
    };
}
export async function simulateNewMatch() {
    const db = await getDB();
    const playerCount = await db.collection(PLAYERS_COLLECTION).countDocuments();

    if (playerCount < 10) {
        return { success: false, message: "Not enough players in DB to simulate a match (need at least 10)." };
    }

    const currentMatchId = playerService.getNextMatchId();

    const participantsFromDB = await db.collection(PLAYERS_COLLECTION).aggregate([
        { $sample: { size: 10 } }
    ]).toArray();

    
    const participants = [];
    const shuffledRoles = [...STANDARD_ROLES].sort(() => 0.5 - Math.random()); 
    for (let i = 0; i < 10; i++) {
        const playerDoc = participantsFromDB[i];
        const assignedRole = shuffledRoles[i % 5]; 
        const champion = await championService.getRandomChampion(assignedRole);

        participants.push({
            ...playerDoc, 
            role: assignedRole,
            champion: champion ? { championId: champion.championId, championName: champion.championName } : { championId: "unknown", championName: "Unknown" }, // Store minimal champ info
            // Performance stats will be generated after win/loss is determined
        });
    }
    
    const teamAData = participants.slice(0, 5);
    const teamBData = participants.slice(5, 10);

    const calculateTeamAvgElo = (team) => team.reduce((sum, p) => sum + p.elo, 0) / team.length;
    
    const avgEloTeamA = calculateTeamAvgElo(teamAData);
    const avgEloTeamB = calculateTeamAvgElo(teamBData);

    const probTeamAWins = eloService.calculateExpectedScore(avgEloTeamA, avgEloTeamB);
    const teamAWins = Math.random() < probTeamAWins;

    // Generate performance stats now that we know who won
    teamAData.forEach(p => p.performance = generatePerformanceStats(p.role, teamAWins, p.champion));
    teamBData.forEach(p => p.performance = generatePerformanceStats(p.role, !teamAWins, p.champion));

    const matchResults = {
        matchId: currentMatchId,
        teamA: {
            players: teamAData.map(p => ({ 
                playerId: p.playerId, playerName: p.playerName, eloBefore: p.elo, 
                role: p.role, champion: p.champion, performance: p.performance 
            })),
            avgElo: avgEloTeamA,
            won: teamAWins
        },
        teamB: {
            players: teamBData.map(p => ({ 
                playerId: p.playerId, playerName: p.playerName, eloBefore: p.elo,
                role: p.role, champion: p.champion, performance: p.performance
            })),
            avgElo: avgEloTeamB,
            won: !teamAWins
        },
        updates: [] // To store elo update details
    };

    // Update Elo for players in Team A
    for (const player of teamAData) {
        const eloDelta = eloService.calculateEloDelta( // This will need to be updated for PBR
            player.elo, 
            player.gamesPlayed, 
            teamAWins, 
            avgEloTeamA, 
            avgEloTeamB
            // TODO: Pass player.role, player.performance for PBR calculation
        );
        const matchRecord = { 
            matchId: currentMatchId, 
            myTeamAvgElo: avgEloTeamA, 
            opponentTeamAvgElo: avgEloTeamB, 
            result: teamAWins ? "win" : "loss",
            eloChange: eloDelta,
            timestamp: new Date(),
            role: player.role,
            championPlayed: player.champion, // Now an object { championId, championName }
            kda: player.performance.kda,
            cs: player.performance.cs,
            gold: player.performance.gold
        };
        const updateDetail = await updatePlayerAfterMatch(db, player.playerId, eloDelta, matchRecord);
        if (updateDetail) matchResults.updates.push(updateDetail);
    }

    // Update Elo for players in Team B
    for (const player of teamBData) {
        const eloDelta = eloService.calculateEloDelta( // This will need to be updated for PBR
            player.elo, 
            player.gamesPlayed, 
            !teamAWins, 
            avgEloTeamB, 
            avgEloTeamA
            // TODO: Pass player.role, player.performance for PBR calculation
        );
        const matchRecord = {
            matchId: currentMatchId,
            myTeamAvgElo: avgEloTeamB,
            opponentTeamAvgElo: avgEloTeamA,
            result: !teamAWins ? "win" : "loss",
            eloChange: eloDelta,
            timestamp: new Date(),
            role: player.role,
            championPlayed: player.champion,
            kda: player.performance.kda,
            cs: player.performance.cs,
            gold: player.performance.gold
        };
        const updateDetail = await updatePlayerAfterMatch(db, player.playerId, eloDelta, matchRecord);
        if (updateDetail) matchResults.updates.push(updateDetail);
    }
    
    return { success: true, message: "Match simulated successfully with performance stats.", data: matchResults };
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
        const randomAdjustment = Math.floor(Math.random() * 31) - 15; // +/- 0 to 15
        const oldElo = player.elo;
        const newElo = player.elo + randomAdjustment;

        await db.collection(PLAYERS_COLLECTION).updateOne(
            { playerId: player.playerId },
            { $set: { elo: newElo } }
            // Consider adding a system log/event to player's history for this kind of adjustment
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