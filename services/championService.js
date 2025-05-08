import { getDB } from '../db/mongo.js';
import { CHAMPIONS_COLLECTION } from '../config/constants.js';

let allChampionsCache = null; // Simple in-memory cache

export async function getAllChampions(forceRefresh = false) {
    if (allChampionsCache && !forceRefresh) {
        return allChampionsCache;
    }
    const db = await getDB();
    allChampionsCache = await db.collection(CHAMPIONS_COLLECTION).find({}).toArray();
    return allChampionsCache;
}

export async function getChampionById(championId) {
    // Can use cache if available, or fetch directly
    if (allChampionsCache) {
        return allChampionsCache.find(champ => champ.championId === championId) || null;
    }
    const db = await getDB();
    return await db.collection(CHAMPIONS_COLLECTION).findOne({ championId: championId });
}

export async function getRandomChampion(role = null) {
    const champions = await getAllChampions();
    if (champions.length === 0) return null;

    let eligibleChampions = champions;
    if (role) {
        const roleLower = role.toLowerCase();
        eligibleChampions = champions.filter(champ => 
            champ.primaryRole.toLowerCase() === roleLower || 
            (champ.secondaryRoles && champ.secondaryRoles.some(sr => sr.toLowerCase() === roleLower))
        );
        if (eligibleChampions.length === 0) { // Fallback if no champ for specific role, pick any
            eligibleChampions = champions;
        }
    }
    
    const randomIndex = Math.floor(Math.random() * eligibleChampions.length);
    return eligibleChampions[randomIndex];
}