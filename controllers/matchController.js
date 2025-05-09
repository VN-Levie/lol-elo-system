import * as matchDetailService from '../services/matchDetailService.js';

export async function getMatchDetails(req, res) {
    try {
        const matchId = req.params.matchId;
        const match = await matchDetailService.getMatchById(matchId);
        if (!match) {
            return res.status(404).json({ success: false, message: "Match not found" });
        }
        res.json({ success: true, data: match });
    } catch (error) {
        console.error(`Error fetching match ${req.params.matchId}:`, error);
        res.status(500).json({ success: false, message: "Error fetching match details", error: error.message });
    }
}

export async function getPlayerMatchHistoryFromMatches(req, res) {
    try {
        const playerId = req.query.playerId;
        if (!playerId) {
            return res.status(400).json({ success: false, message: "playerId query parameter is required" });
        }
        const limit = req.query.limit || 20;
        const page = req.query.page || 1;

        const result = await matchDetailService.getMatchesByPlayerId(playerId, limit, page);
        res.json({ success: true, data: result });

    } catch (error) {
        console.error(`Error fetching match history for player ${req.query.playerId}:`, error);
        res.status(500).json({ success: false, message: "Error fetching player match history", error: error.message });
    }
}