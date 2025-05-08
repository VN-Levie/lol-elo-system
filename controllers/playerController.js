import * as playerService from '../services/playerService.js';

export async function getPlayersList(req, res) {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 10; // Default to top 10 for API
        const players = await playerService.getAllPlayers(limit, true);
        res.json(players);
    } catch (error) {
        console.error("Error fetching players:", error);
        res.status(500).json({ message: "Error fetching player data", error: error.message });
    }
}

export async function getSinglePlayer(req, res) {
    try {
        const playerId = req.params.playerId;
        const player = await playerService.getPlayerByIdOrName(playerId);
        if (!player) {
            return res.status(404).json({ message: "Player not found" });
        }
        res.json(player);
    } catch (error) {
        console.error(`Error fetching player ${req.params.playerId}:`, error);
        res.status(500).json({ message: "Error fetching player details", error: error.message });
    }
}

export async function initSystem(req, res) {
    try {
        const forceReset = req.body.forceReset === true;
        const result = await playerService.initializePlayers(forceReset);
        res.json(result);
    } catch (error) {
        console.error("Error initializing system:", error);
        res.status(500).json({ message: "Error initializing system", error: error.message });
    }
}