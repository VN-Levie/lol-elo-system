import { PBR_BENCHMARKS, AVERAGE_MATCH_DURATION_MINUTES } from '../config/constants.js';

export async function getPbrSettings(req, res) {
    try {
        res.json({
            success: true,
            data: {
                benchmarks: PBR_BENCHMARKS,
                averageMatchDurationMinutes: AVERAGE_MATCH_DURATION_MINUTES
            }
        });
    } catch (error) {
        console.error("Error fetching PBR settings:", error);
        res.status(500).json({ success: false, message: "Failed to retrieve PBR settings" });
    }
}