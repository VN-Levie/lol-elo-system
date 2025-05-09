import express from 'express';
import { createServer } from 'http'; // Import http module
import { Server as SocketIOServer } from 'socket.io'; // Import Server from socket.io
import cors from 'cors';

import { connectDB, closeDB } from './db/mongo.js';
import * as playerController from './controllers/playerController.js';
import * as simulationController from './controllers/simulationController.js';
import * as championController from './controllers/championController.js';
import * as matchController from './controllers/matchController.js';
import * as configController from './controllers/configController.js';
import * as statsController from './controllers/statsController.js';

// Import matchService để gọi hàm mô phỏng từ WebSocket handler
import * as matchService from './services/matchService.js';

const app = express();
const httpServer = createServer(app); // Create HTTP server from Express app
const io = new SocketIOServer(httpServer, { // Attach Socket.IO to the HTTP server
    cors: {
        origin: "*", // Cho phép tất cả các origin trong development. Nên cấu hình chặt chẽ hơn cho production.
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- API Routes (giữ nguyên) ---
app.get('/', (req, res) => res.send('LoL Elo System API is running!'));
app.get('/api/players', playerController.getPlayersList);
app.get('/api/players/:playerId', playerController.getSinglePlayer);
app.post('/api/players/initialize', playerController.initSystem);

if (championController.getChampionsList) {
    app.get('/api/champions', championController.getChampionsList);
    app.get('/api/champions/:championId', championController.getSingleChampion);
}

// API `/api/simulate/match` sẽ được thay thế bằng WebSocket, nhưng vẫn có thể giữ lại cho mục đích test 1 trận
// Hoặc có thể bỏ đi nếu muốn tất cả mô phỏng qua WebSocket
app.post('/api/simulate/match', simulationController.simulateNewMatchController); // Vẫn giữ lại để test nhanh 1 trận nếu cần
app.post('/api/randomize-event', simulationController.triggerRandomEventController);

app.get('/api/matches', matchController.getPlayerMatchHistoryFromMatches);
app.get('/api/matches/:matchId', matchController.getMatchDetails);
app.get('/api/config/pbr-settings', configController.getPbrSettings);

app.get('/api/stats/server-summary', statsController.getServerSummary);
app.get('/api/stats/elo-distribution', statsController.getEloDistribution);
app.get('/api/stats/champion-pick-rates', statsController.getChampionPickRates);
app.get('/api/stats/champion-win-rates', statsController.getChampionWinRates);
// app.get('/api/stats/role-win-rates', statsController.getRoleWinRates); // Bỏ vì không có nhiều ý nghĩa
app.get('/api/stats/average-stats-by-role', statsController.getAverageStatsByRole);


// --- WebSocket Logic ---
let globalSimulationStatus = {
    isRunning: false,
    taskId: null,
    requestedByInfo: null,
    completedMatches: 0,
    totalMatches: 0,
    startTime: null,
    statusMessage: "Idle"
};

io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Gửi trạng thái hiện tại cho client mới kết nối
    if (globalSimulationStatus.isRunning) {
        socket.emit('global_simulation_status_update', globalSimulationStatus);
    } else {
        socket.emit('global_simulation_status_update', { ...globalSimulationStatus, statusMessage: "Idle. Ready to simulate."});
    }


    socket.on('start_simulation_job', async (data) => {
        if (globalSimulationStatus.isRunning) {
            socket.emit('simulation_job_error', { 
                taskId: globalSimulationStatus.taskId, 
                message: 'Another simulation job is already in progress. Please wait.' 
            });
            return;
        }

        const numMatches = parseInt(data.numMatches) || 1;
        const actualNumMatches = Math.min(Math.max(1, numMatches), 500); // Max 500

        const taskId = `sim_${Date.now()}_${socket.id.substring(0,5)}`;
        globalSimulationStatus = {
            isRunning: true,
            taskId: taskId,
            requestedByInfo: { socketId: socket.id, userAgent: socket.handshake.headers['user-agent'] },
            completedMatches: 0,
            totalMatches: actualNumMatches,
            startTime: Date.now(),
            statusMessage: `Simulation task ${taskId} started by ${socket.id}. Preparing...`
        };

        console.log(`Simulation task ${taskId} started by ${socket.id} for ${actualNumMatches} matches.`);
        io.emit('global_simulation_status_update', globalSimulationStatus); // Thông báo cho tất cả

        let lastSuccessfulMatchData = null;

        try {
            for (let i = 0; i < actualNumMatches; i++) {
                if (!globalSimulationStatus.isRunning || globalSimulationStatus.taskId !== taskId) {
                    console.log(`Simulation task ${taskId} was interrupted or a new task started.`);
                    io.emit('global_simulation_status_update', { 
                        ...globalSimulationStatus, 
                        isRunning: false, 
                        statusMessage: `Simulation ${taskId} interrupted.` 
                    });
                    break; 
                }

                globalSimulationStatus.statusMessage = `Task ${taskId}: Simulating match ${i + 1} of ${actualNumMatches}...`;
                io.emit('global_simulation_status_update', globalSimulationStatus); // Cập nhật trạng thái trước khi chạy

                const matchResult = await matchService.simulateNewMatch(); // Gọi hàm mô phỏng 1 trận từ service
                
                if (!matchResult.success) {
                    const errorMessage = `Task ${taskId}: Error at match ${i+1}: ${matchResult.message}`;
                    console.error(errorMessage);
                    globalSimulationStatus.statusMessage = errorMessage;
                    globalSimulationStatus.isRunning = false; // Stop on first critical error
                    io.emit('global_simulation_status_update', globalSimulationStatus);
                    socket.emit('simulation_job_error', { taskId: taskId, message: errorMessage });
                    return; // Dừng hẳn nếu có lỗi trong 1 trận
                }
                
                lastSuccessfulMatchData = matchResult.data; // Lưu lại data của trận cuối
                globalSimulationStatus.completedMatches = i + 1;
                globalSimulationStatus.statusMessage = `Task ${taskId}: Match ${i + 1}/${actualNumMatches} completed.`;
                io.emit('global_simulation_status_update', globalSimulationStatus);
                
                // Thêm một chút delay nhỏ để client có thời gian render, và giảm tải cho server
                // nếu mô phỏng quá nhanh.
                if (actualNumMatches > 50 && (i+1) % 10 === 0) { // Delay sau mỗi 10 trận nếu số lượng lớn
                     await new Promise(resolve => setTimeout(resolve, 50));
                } else if (actualNumMatches <= 50) {
                     await new Promise(resolve => setTimeout(resolve, 20));
                }


            }

            const durationMs = Date.now() - globalSimulationStatus.startTime;
            globalSimulationStatus.isRunning = false;
            globalSimulationStatus.statusMessage = `Task ${taskId} completed ${globalSimulationStatus.completedMatches}/${globalSimulationStatus.totalMatches} matches in ${(durationMs / 1000).toFixed(2)}s.`;
            console.log(globalSimulationStatus.statusMessage);
            io.emit('global_simulation_status_update', globalSimulationStatus);
            
            socket.emit('simulation_job_completed', { // Gửi cho client yêu cầu
                taskId: taskId,
                message: globalSimulationStatus.statusMessage,
                durationMs: durationMs,
                lastMatchData: lastSuccessfulMatchData // Gửi data của trận cuối (tùy chọn)
            });

        } catch (error) {
            console.error(`Critical error during simulation task ${taskId}:`, error);
            globalSimulationStatus.isRunning = false;
            globalSimulationStatus.statusMessage = `Task ${taskId} failed due to server error: ${error.message}`;
            io.emit('global_simulation_status_update', globalSimulationStatus);
            socket.emit('simulation_job_error', { taskId: taskId, message: globalSimulationStatus.statusMessage });
        } finally {
            // Không reset globalSimulationStatus ngay lập tức để các client khác có thể thấy trạng thái cuối cùng
            // Có thể thêm một timeout để reset sau một khoảng thời gian
            // setTimeout(() => {
            //     if (globalSimulationStatus.taskId === taskId && !globalSimulationStatus.isRunning) {
            //         globalSimulationStatus.taskId = null;
            //         globalSimulationStatus.statusMessage = "Idle";
            //         io.emit('global_simulation_status_update', globalSimulationStatus);
            //     }
            // }, 30000); // Reset sau 30s
        }
    });
    
    // (Optional) Admin command to stop/reset a running simulation
    socket.on('admin_force_stop_simulation', (data) => {
        // Implement authentication/authorization for admin actions
        if (globalSimulationStatus.isRunning && (!data.taskId || data.taskId === globalSimulationStatus.taskId)) {
            console.log(`Admin force stopping simulation task: ${globalSimulationStatus.taskId}`);
            const oldTaskId = globalSimulationStatus.taskId;
            globalSimulationStatus.isRunning = false;
            globalSimulationStatus.statusMessage = `Task ${oldTaskId} forcibly stopped by admin.`;
            globalSimulationStatus.taskId = null; // Mark as no longer the active task
            io.emit('global_simulation_status_update', globalSimulationStatus);
        }
    });


    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
        // Xử lý nếu client yêu cầu mô phỏng bị disconnect (hiện tại job vẫn chạy ở server)
    });
});


// --- Start Server ---
async function startApp() {
    try {
        await connectDB();
        httpServer.listen(PORT, () => { // Dùng httpServer.listen thay vì app.listen
            console.log(`Server with WebSocket is running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start the application:", error);
        process.exit(1);
    }
}

process.on('SIGINT', async () => {
    console.log('Server is shutting down...');
    await closeDB();
    io.close(() => { // Đóng socket.io server
        console.log('Socket.IO server closed.');
        process.exit(0);
    });
});

startApp();