import { getDB } from '../db/mongo.js';
import {
    PLAYERS_COLLECTION,
    INITIAL_ELO,
    TOTAL_PLAYERS_INIT,
    MATCHES_COLLECTION,
    STANDARD_ROLES
} from '../config/constants.js';
import * as championService from './championService.js';
import { faker } from '@faker-js/faker';

let matchIdCounter = 0;

export async function getAllPlayers(limit = 100, sortByElo = true) {
    const db = await getDB();
    const query = db.collection(PLAYERS_COLLECTION).find();
    if (sortByElo) {
        query.sort({ elo: -1 });
    }
    if (limit) {
        query.limit(Number(limit));
    }
    return await query.toArray();
}

export async function getPlayerByIdOrName(identifier) {
    const db = await getDB();
    return await db.collection(PLAYERS_COLLECTION).findOne({
        $or: [{ playerId: identifier }, { playerName: identifier }]
    });
}

export async function initializePlayers(forceReset = false) {
    const db = await getDB();
    const playersCollection = db.collection(PLAYERS_COLLECTION);
    const matchesCollection = db.collection(MATCHES_COLLECTION);

    if (forceReset) {
        await playersCollection.deleteMany({});
        await matchesCollection.deleteMany({});
        console.log("Previous player and match data cleared for initialization.");
    }

    const existingPlayerCount = await playersCollection.countDocuments();
    if (existingPlayerCount > 0 && !forceReset) {
        const lastMatchDoc = await matchesCollection.find().sort({ timestamp: -1 }).limit(1).toArray();
        if (lastMatchDoc.length > 0 && lastMatchDoc[0].matchId) {
            const idNum = parseInt(lastMatchDoc[0].matchId.split('_')[1]);
            if (!isNaN(idNum)) {
                setMatchIdCounter(idNum);
            } else {
                setMatchIdCounter(0);
            }
        } else {
            setMatchIdCounter(0);
        }
        return {
            message: `${existingPlayerCount} players already exist. Initialization skipped. Match counter set to ${matchIdCounter}.`,
            count: existingPlayerCount,
            matchIdCounter
        };
    }

    const allChampions = await championService.getAllChampions();
    const newPlayers = [];
    const generatedPlayerNames = new Set(); // To ensure unique names, if desired

    for (let i = 1; i <= TOTAL_PLAYERS_INIT; i++) {
        const shuffledPlayerRoles = [...STANDARD_ROLES].sort(() => 0.5 - Math.random());
        const numPreferredRoles = Math.random() < 0.7 ? 1 : 2;
        const preferredRoles = shuffledPlayerRoles.slice(0, numPreferredRoles);

        const championPool = [];
        const numChampionsInPool = Math.floor(Math.random() * 3) + 3;

        for (const role of preferredRoles) {
            const champsForRole = allChampions.filter(c =>
                c.primaryRole === role || (c.secondaryRoles && c.secondaryRoles.includes(role))
            );
            if (champsForRole.length > 0 && championPool.length < numChampionsInPool) {
                const champToAdd = champsForRole[Math.floor(Math.random() * champsForRole.length)];
                if (!championPool.find(cId => cId === champToAdd.championId)) {
                    championPool.push(champToAdd.championId);
                }
            }
        }
        while (championPool.length < numChampionsInPool && allChampions.length > 0) {
            const randomChamp = allChampions[Math.floor(Math.random() * allChampions.length)];
            if (!championPool.find(cId => cId === randomChamp.championId)) {
                championPool.push(randomChamp.championId);
            }
            if (championPool.length >= allChampions.length) break;
        }


        let playerName;
        let attempts = 0;
        do {
            // Kết hợp first name + từ ngẫu nhiên (animal, adjective, số)
            const first = faker.person.firstName(); // Ví dụ: "Kai"
            const tail = faker.animal.type().replace(/\s+/g, ''); // Ví dụ: "Tiger", "Lizard"
            const number = faker.number.int({ min: 1, max: 99 }); // 1~99

            // Gộp lại, cắt bớt nếu dài quá
            playerName = `${first}${tail}${number}`.substring(0, 16);
            attempts++;
        } while (generatedPlayerNames.has(playerName) && attempts < 10);

        generatedPlayerNames.add(playerName);


        newPlayers.push({
            playerId: `player_${i}`,
            // playerName: `Player ${i}`, // OLD
            playerName: playerName,      // <<<< NEW: Use Faker generated name
            elo: INITIAL_ELO,
            gamesPlayed: 0,
            matchHistory: [],
            currentWinStreak: 0,
            currentLossStreak: 0,
            preferredRoles: preferredRoles,
            championPool: championPool
        });
    }
    await playersCollection.insertMany(newPlayers);
    setMatchIdCounter(0); // Reset match counter after full initialization
    return {
        message: `${TOTAL_PLAYERS_INIT} players initialized/re-initialized with Faker names. Match counter reset.`,
        count: TOTAL_PLAYERS_INIT,
        matchIdCounter
    };
}

export function getNextMatchId() {
    matchIdCounter++;
    return `match_${matchIdCounter}`;
}

export function setMatchIdCounter(value) {
    matchIdCounter = value;
}