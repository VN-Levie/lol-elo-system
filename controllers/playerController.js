import * as playerService from '../services/playerService.js';

export async function getPlayersList(req, res) {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;
        const page = req.query.page ? parseInt(req.query.page) : 1; // Lấy page từ query
        
        const result = await playerService.getAllPlayers(limit, page, true); // Truyền page vào service
        
        res.json({
            success: true,
            data: result.players, // Dữ liệu người chơi cho trang hiện tại
            pagination: { // Thông tin phân trang cho client
                currentPage: result.currentPage,
                totalPages: result.totalPages,
                totalPlayers: result.totalPlayers,
                limit: result.limit
            }
        });
    } catch (error) {
        console.error("Error fetching players:", error);
        res.status(500).json({ success: false, message: "Error fetching player data", error: error.message });
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