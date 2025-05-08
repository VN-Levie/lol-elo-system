// main.js
import { getDB, connectDB, closeDB, DB_NAME } from './db.js';


const INITIAL_ELO = 1200;
const TOTAL_PLAYERS = 100; 
const MATCH_HISTORY_LENGTH = 100;
const PLAYERS_COLLECTION = 'players';


const K_FACTORS = {
    NEW_PLAYER_GAMES_THRESHOLD: 30,
    HIGH_ELO_THRESHOLD: 2200,
    K_NEW: 40,
    K_HIGH_ELO: 10,
    K_REGULAR: 20
};


function getKFactor(gamesPlayed, currentElo) {
    if (gamesPlayed < K_FACTORS.NEW_PLAYER_GAMES_THRESHOLD) {
        return K_FACTORS.K_NEW;
    }
    if (currentElo > K_FACTORS.HIGH_ELO_THRESHOLD) {
        return K_FACTORS.K_HIGH_ELO;
    }
    return K_FACTORS.K_REGULAR;
}

function calculateExpectedScore(playerAvgElo, opponentAvgElo) {
    return 1 / (1 + Math.pow(10, (opponentAvgElo - playerAvgElo) / 400));
}

async function calculateAndUpdatePlayerElo(playerId, didPlayerWin, playerTeamAvgElo, opponentTeamAvgElo, matchDetailsForHistory) {
    const db = await getDB();
    const player = await db.collection(PLAYERS_COLLECTION).findOne({ playerId: playerId });

    if (!player) {
        console.error(`Player ${playerId} not found in DB for ELO update.`);
        return;
    }

    const kFactor = getKFactor(player.gamesPlayed, player.elo);
    const actualScore = didPlayerWin ? 1 : 0;
    const expectedScore = calculateExpectedScore(playerTeamAvgElo, opponentTeamAvgElo);
    const eloChange = Math.round(kFactor * (actualScore - expectedScore));

    const newElo = player.elo + eloChange;
    const newGamesPlayed = player.gamesPlayed + 1;

    
    const newMatchRecord = { ...matchDetailsForHistory, eloChange, timestamp: new Date() };

    await db.collection(PLAYERS_COLLECTION).updateOne(
        { playerId: playerId },
        {
            $set: { elo: newElo, gamesPlayed: newGamesPlayed },
            $push: {
                matchHistory: {
                    $each: [newMatchRecord],
                    $slice: -MATCH_HISTORY_LENGTH 
                }
            }
        }
    );
    return { oldElo: player.elo, newElo, eloChange };
}



let matchIdCounter = 0; 

async function simulateMatch() {
    const db = await getDB();
    const playerCount = await db.collection(PLAYERS_COLLECTION).countDocuments();

    if (playerCount < 10) {
        console.log("Not enough players in DB to simulate a match (need at least 10).");
        return null;
    }

    matchIdCounter++;
    const currentMatchId = `match_${matchIdCounter}`;


    const participants = await db.collection(PLAYERS_COLLECTION).aggregate([
        { $sample: { size: 10 } }
    ]).toArray();

    const teamAData = participants.slice(0, 5);
    const teamBData = participants.slice(5, 10);

    const calculateTeamAvgElo = (team) => team.reduce((sum, p) => sum + p.elo, 0) / team.length;
    
    const avgEloTeamA = calculateTeamAvgElo(teamAData);
    const avgEloTeamB = calculateTeamAvgElo(teamBData);

    const probTeamAWins = 1 / (1 + Math.pow(10, (avgEloTeamB - avgEloTeamA) / 400));
    const teamAWins = Math.random() < probTeamAWins;

    console.log(`\n--- Match ${currentMatchId} ---`);
    console.log(`Team A (Avg Elo: ${avgEloTeamA.toFixed(0)}): ${teamAData.map(p => p.playerName).join(", ")}`);
    console.log(`Team B (Avg Elo: ${avgEloTeamB.toFixed(0)}): ${teamBData.map(p => p.playerName).join(", ")}`);
    console.log(`Result: Team ${teamAWins ? 'A' : 'B'} wins!`);


    for (const player of teamAData) {
        const updateResult = await calculateAndUpdatePlayerElo(
            player.playerId,
            teamAWins,
            avgEloTeamA,
            avgEloTeamB,
            { matchId: currentMatchId, myTeamAvgElo: avgEloTeamA, opponentTeamAvgElo: avgEloTeamB, result: teamAWins ? "win" : "loss" }
        );
        if (updateResult) {
             console.log(`  ${player.playerName} (Team A): Elo ${updateResult.oldElo.toFixed(0)} -> ${updateResult.newElo.toFixed(0)} (${updateResult.eloChange >= 0 ? '+' : ''}${updateResult.eloChange})`);
        }
    }

    for (const player of teamBData) {
        const updateResult = await calculateAndUpdatePlayerElo(
            player.playerId,
            !teamAWins,
            avgEloTeamB,
            avgEloTeamA,
            { matchId: currentMatchId, myTeamAvgElo: avgEloTeamB, opponentTeamAvgElo: avgEloTeamA, result: !teamAWins ? "win" : "loss" }
        );
        if (updateResult) {
            console.log(`  ${player.playerName} (Team B): Elo ${updateResult.oldElo.toFixed(0)} -> ${updateResult.newElo.toFixed(0)} (${updateResult.eloChange >= 0 ? '+' : ''}${updateResult.eloChange})`);
        }
    }

}

async function applyRandomOutcomeInterference(numberOfPlayersToAffect = 3) {
    const db = await getDB();
    const playerCount = await db.collection(PLAYERS_COLLECTION).countDocuments();
    if (playerCount === 0) return;

    console.log(`\n--- Random Outcome Interference ---`);
    
    const affectedPlayers = await db.collection(PLAYERS_COLLECTION).aggregate([
        { $sample: { size: Math.min(numberOfPlayersToAffect, playerCount) } }
    ]).toArray();

    for (const player of affectedPlayers) {
        const randomAdjustment = Math.floor(Math.random() * 31) - 15; 
        const oldElo = player.elo;
        const newElo = player.elo + randomAdjustment;

        await db.collection(PLAYERS_COLLECTION).updateOne(
            { playerId: player.playerId },
            { $set: { elo: newElo } }            
        );
        console.log(`  Player ${player.playerName} Elo randomly adjusted: ${oldElo.toFixed(0)} -> ${newElo.toFixed(0)} (${randomAdjustment >= 0 ? '+' : ''}${randomAdjustment})`);
    }
}


async function initializeSystem(forceReset = false) {
    const db = await getDB();
    const playersCollection = db.collection(PLAYERS_COLLECTION);

    if (forceReset) {
        await playersCollection.deleteMany({});
        console.log("Previous player data cleared.");
    }

    const existingPlayerCount = await playersCollection.countDocuments();
    if (existingPlayerCount > 0 && !forceReset) {
        console.log(`${existingPlayerCount} players already exist in the database. Initialization skipped. Use forceReset=true to override.`);
      
        const lastMatch = await playersCollection.aggregate([
            { $unwind: "$matchHistory" },
            { $sort: { "matchHistory.timestamp": -1 } },
            { $limit: 1 },
            { $project: { _id: 0, matchId: "$matchHistory.matchId" } }
        ]).toArray();
        
        if (lastMatch.length > 0 && lastMatch[0].matchId) {
            const idNum = parseInt(lastMatch[0].matchId.split('_')[1]);
            if (!isNaN(idNum)) matchIdCounter = idNum;
        } else {
            matchIdCounter = 0;
        }
        return;
    }
    
    const newPlayers = [];
    for (let i = 1; i <= TOTAL_PLAYERS; i++) {
        newPlayers.push({
            playerId: `player_${i}`,
            playerName: `Player ${i}`,
            elo: INITIAL_ELO,
            gamesPlayed: 0,
            matchHistory: []
        });
    }
    await playersCollection.insertMany(newPlayers);
    matchIdCounter = 0;
    console.log(`${TOTAL_PLAYERS} players initialized/re-initialized in DB with ${INITIAL_ELO} Elo.`);
}

async function displayLeaderboard(count = 10) {
    const db = await getDB();
    console.log(`\n--- Leaderboard (Top ${count}) ---`);
    const sortedPlayers = await db.collection(PLAYERS_COLLECTION)
        .find()
        .sort({ elo: -1 })
        .limit(count)
        .toArray();

    sortedPlayers.forEach((p, index) => {
        console.log(`#${index + 1}: ${p.playerName} - Elo: ${p.elo.toFixed(0)} (Games: ${p.gamesPlayed})`);
    });
}

async function displayPlayerDetails(playerIdOrName) {
    const db = await getDB();
    const player = await db.collection(PLAYERS_COLLECTION).findOne({
        $or: [{ playerId: playerIdOrName }, { playerName: playerIdOrName }]
    });

    if (!player) {
        console.log(`Player "${playerIdOrName}" not found.`);
        return;
    }
    console.log(`\n--- Player Details: ${player.playerName} ---`);
    console.log(`ID: ${player.playerId}`);
    console.log(`Elo: ${player.elo.toFixed(0)}`);
    console.log(`Games Played: ${player.gamesPlayed}`);
    console.log(`Match History (Last ${player.matchHistory.length > 0 ? player.matchHistory.length : 0}):`);
    
    if (player.matchHistory.length === 0) {
        console.log("  No matches played yet.");
    } else {        
        player.matchHistory.forEach(record => {
             console.log(`  Match ${record.matchId}: ${record.result === "win" ? "Won" : "Lost"} vs Team (Avg Elo ${record.opponentTeamAvgElo.toFixed(0)}), Self Team (Avg Elo ${record.myTeamAvgElo.toFixed(0)}), Elo Change: ${record.eloChange >= 0 ? '+' : ''}${record.eloChange} @ ${record.timestamp.toLocaleDateString()}`);
        });
    }
}

async function main() {
    await connectDB(); 
    await initializeSystem(false); 

    await displayLeaderboard(5);

    console.log("\nRunning 2 match simulations...");
    for(let i=0; i<2; i++) await simulateMatch();
    
    await displayLeaderboard(10);

   
    const randomPlayerSample = await (await getDB()).collection(PLAYERS_COLLECTION).aggregate([{ $sample: { size: 1 } }]).toArray();
    if (randomPlayerSample.length > 0) {
        await displayPlayerDetails(randomPlayerSample[0].playerId);
    } else {
        console.log("No players in DB to display details for.");
    }
    
 
    await applyRandomOutcomeInterference(2);
    await displayLeaderboard(10);


    await closeDB(); 
}

main().catch(console.error);