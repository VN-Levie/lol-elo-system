// services/matchService.js
import { getDB } from '../db/mongo.js';
import { PLAYERS_COLLECTION, MATCH_HISTORY_LENGTH } from '../config/constants.js';
import * as eloService from './eloService.js';
import * as playerService from './playerService.js'; // To use getNextMatchId

async function updatePlayerAfterMatch(db, playerId, eloChange, matchRecordForHistory) {
    const player = await db.collection(PLAYERS_COLLECTION).findOne({ playerId: playerId });
    if (!player) return null; // Should not happen if players were selected correctly

    const newElo = player.elo + eloChange;
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
    return { playerName: player.playerName, oldElo: player.elo, newElo, eloChange };
}

export async function simulateNewMatch() {
    const db = await getDB();
    const playerCount = await db.collection(PLAYERS_COLLECTION).countDocuments();

    if (playerCount < 10) {
        return { success: false, message: "Not enough players in DB to simulate a match (need at least 10)." };
    }

    const currentMatchId = playerService.getNextMatchId(); // Using the shared counter

    const participants = await db.collection(PLAYERS_COLLECTION).aggregate([
        { $sample: { size: 10 } }
    ]).toArray();

    const teamAData = participants.slice(0, 5);
    const teamBData = participants.slice(5, 10);

    const calculateTeamAvgElo = (team) => team.reduce((sum, p) => sum + p.elo, 0) / team.length;
    
    const avgEloTeamA = calculateTeamAvgElo(teamAData);
    const avgEloTeamB = calculateTeamAvgElo(teamBData);

    const probTeamAWins = eloService.calculateExpectedScore(avgEloTeamA, avgEloTeamB); // Team A's perspective
    const teamAWins = Math.random() < probTeamAWins; // If prob is 0.6, 60% chance Team A wins

    const matchResults = {
        matchId: currentMatchId,
        teamA: {
            players: teamAData.map(p => ({ playerId: p.playerId, playerName: p.playerName, eloBefore: p.elo })),
            avgElo: avgEloTeamA,
            won: teamAWins
        },
        teamB: {
            players: teamBData.map(p => ({ playerId: p.playerId, playerName: p.playerName, eloBefore: p.elo })),
            avgElo: avgEloTeamB,
            won: !teamAWins
        },
        updates: []
    };

    // Update Elo for players in Team A
    for (const player of teamAData) {
        const eloDelta = eloService.calculateEloDelta(player.elo, player.gamesPlayed, teamAWins, avgEloTeamA, avgEloTeamB);
        const matchRecord = { 
            matchId: currentMatchId, 
            myTeamAvgElo: avgEloTeamA, 
            opponentTeamAvgElo: avgEloTeamB, 
            result: teamAWins ? "win" : "loss",
            eloChange: eloDelta,
            timestamp: new Date()
        };
        const updateDetail = await updatePlayerAfterMatch(db, player.playerId, eloDelta, matchRecord);
        if (updateDetail) matchResults.updates.push(updateDetail);
    }

    // Update Elo for players in Team B
    for (const player of teamBData) {
        const eloDelta = eloService.calculateEloDelta(player.elo, player.gamesPlayed, !teamAWins, avgEloTeamB, avgEloTeamA);
        const matchRecord = {
            matchId: currentMatchId,
            myTeamAvgElo: avgEloTeamB,
            opponentTeamAvgElo: avgEloTeamA,
            result: !teamAWins ? "win" : "loss",
            eloChange: eloDelta,
            timestamp: new Date()
        };
        const updateDetail = await updatePlayerAfterMatch(db, player.playerId, eloDelta, matchRecord);
        if (updateDetail) matchResults.updates.push(updateDetail);
    }
    
    return { success: true, message: "Match simulated successfully.", data: matchResults };
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