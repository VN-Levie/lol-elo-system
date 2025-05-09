import { getDB } from '../db/mongo.js';
import { PLAYERS_COLLECTION, MATCHES_COLLECTION, STANDARD_ROLES, CHAMPIONS_COLLECTION } from '../config/constants.js';

// API: GET /api/stats/server-summary
export async function getServerSummary(req, res) {
    try {
        const db = await getDB();
        const playersCollection = db.collection(PLAYERS_COLLECTION);
        const matchesCollection = db.collection(MATCHES_COLLECTION);

        const totalPlayers = await playersCollection.countDocuments();
        const totalMatches = await matchesCollection.countDocuments();
        
        const eloAggregation = await playersCollection.aggregate([
            { $group: { _id: null, averageElo: { $avg: "$elo" }, totalElo: { $sum: "$elo" } } }
        ]).toArray();
        
        const averageElo = (eloAggregation.length > 0 && totalPlayers > 0) ? (eloAggregation[0].totalElo / totalPlayers) : 0;


        res.json({
            success: true,
            data: {
                totalPlayers,
                totalMatches,
                averageElo: parseFloat(averageElo.toFixed(0)) // Làm tròn Elo trung bình
            }
        });
    } catch (error) {
        console.error("Error fetching server summary:", error);
        res.status(500).json({ success: false, message: "Failed to fetch server summary" });
    }
}


// API: GET /api/stats/champion-pick-rates
export async function getChampionPickRates(req, res) {
    try {
        const db = await getDB();
        const matchesCollection = db.collection(MATCHES_COLLECTION);
        const championsCollection = db.collection(CHAMPIONS_COLLECTION);

        const allChampions = await championsCollection.find({}, { projection: { championId: 1, championName: 1, _id: 0 } }).toArray();
        const championMap = new Map(allChampions.map(champ => [champ.championId, champ.championName]));

        const pickAggregation = await matchesCollection.aggregate([
            { $project: { players: { $concatArrays: ["$teamA.players", "$teamB.players"] } } },
            { $unwind: "$players" },
            { $group: { _id: "$players.championId", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
            // { $limit: 20 } // Optionally limit to top N picks on backend
        ]).toArray();

        const totalPicksInMatches = pickAggregation.reduce((sum, champ) => sum + champ.count, 0);
        
        const labels = [];
        const data = [];

        pickAggregation.forEach(item => {
            labels.push(championMap.get(item._id) || item._id); // Use championName if available
            data.push(totalPicksInMatches > 0 ? parseFloat(((item.count / totalPicksInMatches) * 100).toFixed(2)) : 0);
        });
        
        res.json({
            success: true,
            data: {
                labels: labels,
                datasets: [{
                    label: 'Pick Rate (%)', // Frontend sẽ dùng data này, không phải label này
                    data: data
                }]
            }
        });
    } catch (error) {
        console.error("Error fetching champion pick rates:", error);
        res.status(500).json({ success: false, message: "Failed to fetch champion pick rates" });
    }
}

// API: GET /api/stats/champion-win-rates
export async function getChampionWinRates(req, res) {
    try {
        const db = await getDB();
        const matchesCollection = db.collection(MATCHES_COLLECTION);
        const championsCollection = db.collection(CHAMPIONS_COLLECTION);

        const allChampions = await championsCollection.find({}, { projection: { championId: 1, championName: 1, _id: 0 } }).toArray();
        const championMap = new Map(allChampions.map(champ => [champ.championId, champ.championName]));


        // Aggregate games played and wins per champion
        const statsAggregation = await matchesCollection.aggregate([
            { $project: { 
                winningTeamLetter: "$winningTeam",
                teamAPlayers: "$teamA.players",
                teamBPlayers: "$teamB.players"
            }},
            { $project: {
                players: { $concatArrays: [
                    { $map: { input: "$teamAPlayers", as: "p", in: { championId: "$$p.championId", won: { $eq: ["$winningTeamLetter", "A"] } } } },
                    { $map: { input: "$teamBPlayers", as: "p", in: { championId: "$$p.championId", won: { $eq: ["$winningTeamLetter", "B"] } } } }
                ]}
            }},
            { $unwind: "$players" },
            { $group: {
                _id: "$players.championId",
                gamesPlayed: { $sum: 1 },
                wins: { $sum: { $cond: ["$players.won", 1, 0] } }
            }},
            { $project: {
                _id: 0,
                championId: "$_id",
                gamesPlayed: 1,
                wins: 1,
                winRate: { 
                    $cond: [ { $eq: ["$gamesPlayed", 0] }, 0, { $multiply: [ { $divide: ["$wins", "$gamesPlayed"] }, 100 ] } ]
                }
            }},
            // { $match: { gamesPlayed: { $gte: 10 } } }, // Optional: Filter by min games on backend
            // { $sort: { winRate: -1 } },
            // { $limit: 20 } // Optional: Limit to top N on backend
        ]).toArray();
        
        // Add championName to the results
        const resultWithNames = statsAggregation.map(stat => ({
            ...stat,
            championName: championMap.get(stat.championId) || stat.championId,
            winRate: parseFloat(stat.winRate.toFixed(2))
        }));

        res.json({
            success: true,
            data: resultWithNames // Frontend will sort and filter this array of objects
        });
    } catch (error) {
        console.error("Error fetching champion win rates:", error);
        res.status(500).json({ success: false, message: "Failed to fetch champion win rates" });
    }
}


// API: GET /api/stats/role-win-rates (Đã phác thảo trước đó, giờ hoàn thiện)
export async function getRoleWinRates(req, res) {
    try {
        const db = await getDB();
        const matches = await db.collection(MATCHES_COLLECTION).find({}).toArray();
        
        const roleStats = {};
        STANDARD_ROLES.forEach(role => {
            roleStats[role] = { wins: 0, games: 0 };
        });

        matches.forEach(match => {
            const winningTeamLetter = match.winningTeam;
            const processTeam = (teamData, isWinningTeam) => {
                teamData.players.forEach(player => {
                    if (player.role && roleStats[player.role]) {
                        roleStats[player.role].games++;
                        if (isWinningTeam) {
                            roleStats[player.role].wins++;
                        }
                    }
                });
            };
            processTeam(match.teamA, winningTeamLetter === 'A');
            processTeam(match.teamB, winningTeamLetter === 'B');
        });

        const labels = STANDARD_ROLES;
        const winRatesData = labels.map(role => {
            const stats = roleStats[role];
            return stats.games > 0 ? parseFloat(((stats.wins / stats.games) * 100).toFixed(2)) : 0;
        });

        res.json({
            success: true,
            data: {
                labels: labels,
                datasets: [{
                    label: 'Win Rate by Role (%)', // Frontend sẽ dùng data, không phải label này
                    data: winRatesData,
                    backgroundColor: 'rgba(153, 102, 255, 0.6)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }]
            }
        });
    } catch (error) {
        console.error("Error fetching role win rates:", error);
        res.status(500).json({ success: false, message: "Failed to get role win rates" });
    }
}


export async function getEloDistribution(req, res) {
    try {
        const db = await getDB(); // Ensure getDB is imported
        const players = await db.collection(PLAYERS_COLLECTION).find({}, { projection: { elo: 1 } }).toArray();
        
        const eloRanges = [
            { label: '0-399', min: 0, max: 399, count: 0 },
            { label: '400-799', min: 400, max: 799, count: 0 },
            { label: '800-1199', min: 800, max: 1199, count: 0 },
            { label: '1200-1599', min: 1200, max: 1599, count: 0 },
            { label: '1600-1999', min: 1600, max: 1999, count: 0 },
            { label: '2000-2399', min: 2000, max: 2399, count: 0 },
            { label: '2400+', min: 2400, max: Infinity, count: 0 },
        ];

        players.forEach(player => {
            for (const range of eloRanges) {
                if (player.elo >= range.min && player.elo <= range.max) {
                    range.count++;
                    break;
                }
            }
        });

        res.json({
            success: true,
            data: {
                labels: eloRanges.map(r => r.label),
                datasets: [{
                    label: 'Number of Players',
                    data: eloRanges.map(r => r.count),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            }
        });
    } catch (error) {
        console.error("Error fetching Elo distribution:", error);
        res.status(500).json({ success: false, message: "Failed to get Elo distribution" });
    }
}