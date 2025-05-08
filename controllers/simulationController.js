// controllers/simulationController.js
import * as matchService from '../services/matchService.js';

export async function simulateNewMatchController(req, res) {
    try {
        // req.body.numMatches could be used to simulate multiple matches
        const result = await matchService.simulateNewMatch();
        if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (error) {
        console.error("Error simulating match:", error);
        res.status(500).json({ success: false, message: "Error simulating match", error: error.message });
    }
}

export async function triggerRandomEventController(req, res) {
    try {
        const numPlayers = req.body.count ? parseInt(req.body.count) : 3; // Default to 3 if not specified
        const result = await matchService.triggerRandomEloInterference(numPlayers);
         if (!result.success) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (error) {
        console.error("Error triggering random event:", error);
        res.status(500).json({ success: false, message: "Error triggering random event", error: error.message });
    }
}