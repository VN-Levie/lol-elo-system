export const INITIAL_ELO = 1200;
export const TOTAL_PLAYERS_INIT = 1000; // just for initialization/testing
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


export const MAX_PBR_POSITIVE_ADJUSTMENT = 10;
export const MAX_PBR_NEGATIVE_ADJUSTMENT = -10;

export const STREAK_THRESHOLDS = {
    WIN_STREAK_BONUS: [ 
        { count: 3, bonus: 1 },
        { count: 5, bonus: 2 },
        { count: 7, bonus: 3 } 
    ],
    LOSS_STREAK_MALUS: [ 
        { count: 3, malus: 1 },
        { count: 5, malus: 2 },
        { count: 7, malus: 3 }
    ]
};

export const STREAK_CONFIG = {
    BASE_WIN_STREAK_ELO_PER_MATCH: 0.5, // Elo cộng thêm cho mỗi trận thắng trong chuỗi (sau trận đầu tiên)
    BASE_LOSS_STREAK_ELO_PER_MATCH: -0.5, // Elo trừ thêm cho mỗi trận thua trong chuỗi (sau trận đầu tiên)
    
    // Bonus thêm tại các mốc cụ thể (cộng dồn với base_per_match)
    WIN_STREAK_MILESTONES: [
        { count: 3, additional_bonus: 0.5 }, // Tổng bonus tại streak 3 = (0.5 * 2) + 0.5 = 1.5 (nếu streak 1 ko tính)
        { count: 5, additional_bonus: 1.0 }, // Cộng thêm 1.0 tại mốc 5
        { count: 7, additional_bonus: 1.0 }  // Cộng thêm 1.0 tại mốc 7
    ],
    LOSS_STREAK_MILESTONES: [
        { count: 3, additional_malus: -0.5 }, // Malus là giá trị âm
        { count: 5, additional_malus: -1.0 },
        { count: 7, additional_malus: -1.0 }
    ],
    MAX_STREAK_EFFECT: 5 // Giới hạn tổng điểm cộng/trừ từ streak để không quá lớn
};