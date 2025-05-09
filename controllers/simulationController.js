import * as matchService from '../services/matchService.js';

export async function simulateNewMatchController(req, res) {
    try {
        const numMatches = parseInt(req.body.numMatches) || 1; 
        const maxMatches = 500;
        const actualNumMatches = Math.min(Math.max(1, numMatches), maxMatches);

        let overallSuccess = true;
        const individualMatchResults = [];
        let errorMessage = '';

        for (let i = 0; i < actualNumMatches; i++) {            
            const result = await matchService.simulateNewMatch();
            if (!result.success) {
                overallSuccess = false;
                errorMessage = result.message || "An error occurred during one of the simulations.";               
                individualMatchResults.push({success: false, matchNumber: i+1, message: result.message });
            } else {
                individualMatchResults.push({success: true, matchNumber: i+1, data: result.data});
            }
        }

        if (!overallSuccess) {            
            return res.status(400).json({ 
                success: false, 
                message: `Simulated ${actualNumMatches} matches, but some failed. ${errorMessage}`,
                details: individualMatchResults 
            });
        }

        res.json({ 
            success: true, 
            message: `Successfully simulated ${actualNumMatches} matches.`,            
        });

    } catch (error) {
        console.error("Error in simulateNewMatchController:", error);
        res.status(500).json({ success: false, message: "Server error during match simulation", error: error.message });
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