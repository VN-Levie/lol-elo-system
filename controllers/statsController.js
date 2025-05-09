import { getDB } from '../db/mongo.js';
import { PLAYERS_COLLECTION } from '../config/constants.js';

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