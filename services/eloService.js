// services/eloService.js
import { K_FACTORS, PBR_BENCHMARKS, AVERAGE_MATCH_DURATION_MINUTES, MAX_PBR_POSITIVE_ADJUSTMENT, MAX_PBR_NEGATIVE_ADJUSTMENT } from '../config/constants.js';

export function getKFactorForPlayer(gamesPlayed, currentElo) {
    if (gamesPlayed < K_FACTORS.NEW_PLAYER_GAMES_THRESHOLD) {
        return K_FACTORS.K_NEW;
    }
    if (currentElo > K_FACTORS.HIGH_ELO_THRESHOLD) {
        return K_FACTORS.K_HIGH_ELO;
    }
    return K_FACTORS.K_REGULAR;
}

export function calculateExpectedScore(playerAvgElo, opponentAvgElo) {
    return 1 / (1 + Math.pow(10, (opponentAvgElo - playerAvgElo) / 400));
}
function getKdaRatio(kda) {
    if (!kda) return 0;
    return (kda.kills + kda.assists) / Math.max(1, kda.deaths);
}
export function calculateEloDelta(currentElo, gamesPlayed, didPlayerWin, playerTeamAvgElo, opponentTeamAvgElo, playerRole, playerKDA, playerCS, playerGold, avgMatchElo = null) {
 
    const kFactor = getKFactorForPlayer(gamesPlayed, currentElo);
    const actualScore = didPlayerWin ? 1 : 0;
    const expectedScore = calculateExpectedScore(playerTeamAvgElo, opponentTeamAvgElo);
    const baseEloChange = kFactor * (actualScore - expectedScore);

 
    let pbrAdjustment = 0;
    const benchmark = PBR_BENCHMARKS[playerRole] || PBR_BENCHMARKS["Top"]; 

    if (playerKDA && playerCS !== undefined && playerGold !== undefined) {
        const playerKdaRatio = getKdaRatio(playerKDA);
        const playerCsPerMin = playerCS / AVERAGE_MATCH_DURATION_MINUTES;
        const playerGoldPerMin = playerGold / AVERAGE_MATCH_DURATION_MINUTES;

        let performanceScore = 0; 

        
        const kdaDiff = playerKdaRatio - benchmark.kdaRatio;       
        performanceScore += (kdaDiff / 1.0) * 0.4;

       
        let csBenchmarkValue = benchmark.csPerMin;
        if (playerRole === "Jungle" && benchmark.totalCS_benchmark) {
            csBenchmarkValue = benchmark.totalCS_benchmark / AVERAGE_MATCH_DURATION_MINUTES;
        }
        const csDiff = playerCsPerMin - csBenchmarkValue;
        
        performanceScore += (csDiff / 1.0) * 0.3;

        
        const goldDiff = playerGoldPerMin - benchmark.goldPerMin;
        
        performanceScore += (goldDiff / 50) * 0.3;
       

        if (performanceScore > 0) {
            pbrAdjustment = Math.min(MAX_PBR_POSITIVE_ADJUSTMENT, Math.round(performanceScore * MAX_PBR_POSITIVE_ADJUSTMENT));
        } else if (performanceScore < 0) {
            pbrAdjustment = Math.max(MAX_PBR_NEGATIVE_ADJUSTMENT, Math.round(performanceScore * Math.abs(MAX_PBR_NEGATIVE_ADJUSTMENT)));
        }

        
        if (didPlayerWin && performanceScore < -0.5) { 
            pbrAdjustment = Math.max(MAX_PBR_NEGATIVE_ADJUSTMENT, pbrAdjustment - 1); 
        } else if (!didPlayerWin && performanceScore > 0.5) { 
            pbrAdjustment = Math.min(MAX_PBR_POSITIVE_ADJUSTMENT, pbrAdjustment + 1);
        }
    }

    const finalEloChange = baseEloChange + pbrAdjustment;
    return Math.round(finalEloChange);
}