import * as matchService from '../services/matchService.js';

export async function simulateNewMatchController(req, res) {
    try {
        const numMatches = req.body.numMatches ? parseInt(req.body.numMatches) : 1; 
        if (isNaN(numMatches) || numMatches <= 0) {
            return res.status(400).json({ success: false, message: "numMatches must be a positive integer" });
        }
        const matches = [];
        for (let i = 0; i < numMatches; i++) {
            const result = await matchService.simulateNewMatch();
            if (!result.success) {
                return res.status(400).json(result);
            }
            matches.push(result);
        }
        res.json({ success: true, matches });
        
    } catch (error) {
        console.error("Error simulating match:", error);
        res.status(500).json({ success: false, message: "Error simulating match", error: error.message });
    }
}

export async function triggerRandomEventController(req, res) {
    try {
        const numPlayers = req.body.count ? parseInt(req.body.count) : 5; 
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