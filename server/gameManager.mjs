// gameManager.mjs
import { Worker } from 'worker_threads';

const workerThreads = {};
const gameTimers = new Map();

export default class GameManager {
    constructor(sseManager) {
        this.sseManager = sseManager;
    }

    getGameState(gameId) {
        // Replace with your actual game state logic
        return {
            gameId: gameId,
            score: { team1: 0, team2: 0 },
            status: 'in progress' 
        };
    }

}

export function startGame(gameId) {
    const worker = new Worker('./server/gameWorker.mjs', {
        workerData: { gameId }
    });


    worker.on('message', (message) => {
        if (message.type === 'gameDataUpdate') {
            this.sseManager.sendGameUpdate(message.data);
        }

        // ... other message handling logic from server.mjs for this worker
    });

    workerThreads[gameId] = worker;
    return worker;
}

export function terminateWorker(gameId) {
    if (workerThreads[gameId]) {
        workerThreads[gameId].terminate();
        delete workerThreads[gameId];
        // ... any other cleanup logic from server.mjs for terminating a worker
        gameTimers.delete(gameId);
        console.log(`Worker terminated for gameId: ${gameId}`);
    }
}

export function forceUpdate(gameId) {
    if (gameId && workerThreads[gameId]) {
        workerThreads[gameId].postMessage({ type: 'forceUpdate' });
    }
}
