import { getDB } from '../db/mongo.js';
import { MATCHES_COLLECTION } from '../config/constants.js';

export async function getMatchById(matchId) {
    const db = await getDB();
    return await db.collection(MATCHES_COLLECTION).findOne({ matchId: matchId });
}

export async function getMatchesByPlayerId(playerId, limit = 20, page = 1) {
    const db = await getDB();
    const query = { 
        $or: [ 
            { "teamA.players.playerId": playerId }, 
            { "teamB.players.playerId": playerId } 
        ] 
    };
    
    const options = {
        sort: { timestamp: -1 }, // Sort by newest first
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit)
    };

    const matches = await db.collection(MATCHES_COLLECTION).find(query, options).toArray();
    const totalMatches = await db.collection(MATCHES_COLLECTION).countDocuments(query);
    
    return {
        matches,
        totalMatches,
        totalPages: Math.ceil(totalMatches / limit),
        currentPage: parseInt(page)
    };
}