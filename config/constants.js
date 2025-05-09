export const INITIAL_ELO = 0;
export const TOTAL_PLAYERS_INIT = 100; // just for initialization/testing
export const MATCH_HISTORY_LENGTH = 100;
export const PLAYERS_COLLECTION = 'players';
export const CHAMPIONS_COLLECTION = 'champions';
export const MATCHES_COLLECTION = 'matches'
export const STANDARD_ROLES = ["Top", "Jungle", "Mid", "ADC", "Support"];
export const K_FACTORS = {
    NEW_PLAYER_GAMES_THRESHOLD: 30,
    HIGH_ELO_THRESHOLD: 2200,
    K_NEW: 40,
    K_HIGH_ELO: 10,
    K_REGULAR: 20
};

export const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
export const DB_NAME = 'lol_elo_system';


export const AVERAGE_MATCH_DURATION_MINUTES = 30;

export const PBR_BENCHMARKS = {
    "Top": {
        kdaRatio: 2.5,
        csPerMin: 7.0,
        goldPerMin: 380
    },
    "Jungle": {
        kdaRatio: 3.0,
        totalCS_benchmark: 150, // Assuming 30 min game
        goldPerMin: 360
    },
    "Mid": {
        kdaRatio: 3.5,
        csPerMin: 7.5,
        goldPerMin: 420
    },
    "ADC": {
        kdaRatio: 3.5,
        csPerMin: 8.0,
        goldPerMin: 440
    },
    "Support": {
        kdaRatio: 2.8,
        csPerMin: 1.5,
        goldPerMin: 300
    }
};


export const MAX_PBR_POSITIVE_ADJUSTMENT = 5;
export const MAX_PBR_NEGATIVE_ADJUSTMENT = -5;

