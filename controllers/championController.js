import * as championService from '../services/championService.js';

export async function getChampionsList(req, res) {
    try {
        const champions = await championService.getAllChampions();
        res.json(champions);
    } catch (error) {
        console.error("Error fetching champions:", error);
        res.status(500).json({ message: "Error fetching champion data" });
    }
}

export async function getSingleChampion(req, res) {
    try {
        const championId = req.params.championId;
        const champion = await championService.getChampionById(championId);
        if (!champion) {
            return res.status(404).json({ message: "Champion not found" });
        }
        res.json(champion);
    } catch (error) {
        console.error(`Error fetching champion ${req.params.championId}:`, error);
        res.status(500).json({ message: "Error fetching champion details" });
    }
}