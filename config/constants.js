export const INITIAL_ELO = 0;
export const TOTAL_PLAYERS_INIT = 100; // just for initialization/testing
export const MATCH_HISTORY_LENGTH = 100;
export const PLAYERS_COLLECTION = 'players';
export const CHAMPIONS_COLLECTION = 'champions';
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
