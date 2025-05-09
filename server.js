import express from 'express';
import { connectDB, closeDB } from './db/mongo.js';
import * as playerController from './controllers/playerController.js';
import * as simulationController from './controllers/simulationController.js';
import * as championController from './controllers/championController.js';
import * as matchController from './controllers/matchController.js';


const app = express();
const PORT = process.env.PORT || 3000;


app.use(express.json()); 


// Basic Route
app.get('/', (req, res) => {
    res.send('LoL Elo System API is running!');
});

// Player Routes
app.get('/api/players', playerController.getPlayersList);
app.get('/api/players/:playerId', playerController.getSinglePlayer); // This gets player profile + their embedded matchHistory
app.post('/api/players/initialize', playerController.initSystem);

// Champion Routes (if implemented)
if (championController.getChampionsList) { // Check if champion controller routes exist
    app.get('/api/champions', championController.getChampionsList);
    app.get('/api/champions/:championId', championController.getSingleChampion);
}


// Simulation Routes
app.post('/api/simulate/match', simulationController.simulateNewMatchController);
app.post('/api/randomize-event', simulationController.triggerRandomEventController);

// Match Detail Routes 
app.get('/api/matches', matchController.getPlayerMatchHistoryFromMatches); // Example: /api/matches?playerId=player_1&limit=10&page=1
app.get('/api/matches/:matchId', matchController.getMatchDetails);

async function startServer() {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start the server:", error);
        process.exit(1);
    }
}


process.on('SIGINT', async () => {
    console.log('Server is shutting down...');
    await closeDB();
    process.exit(0);
});

startServer();