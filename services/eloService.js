// services/eloService.js
import { K_FACTORS } from '../config/constants.js';

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

export function calculateEloDelta(currentElo, gamesPlayed, didPlayerWin, playerTeamAvgElo, opponentTeamAvgElo) {
    const kFactor = getKFactorForPlayer(gamesPlayed, currentElo);
    const actualScore = didPlayerWin ? 1 : 0;
    const expectedScore = calculateExpectedScore(playerTeamAvgElo, opponentTeamAvgElo);
    
    const eloChange = kFactor * (actualScore - expectedScore);
    return Math.round(eloChange);
}