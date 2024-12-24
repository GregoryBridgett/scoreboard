// gameManager.mjs
import { Worker } from 'worker_threads';
import * as path from 'path';
import * as fs from 'fs';

const workerThreads = {};
const gameTimers = new Map();

export function startGame(scoreboardId, gameId) {
    const worker = new Worker(path.join(__dirname, 'gameWorker.js'), {
        workerData: { gameId }
    });

    worker.on('message', async (message) => {
        if (message.type === 'requestData' && message.dataName === 'teamColors') {
            try {
                const jsonData = await fs.promises.readFile('server/teamColors.json', 'utf8');
                const teamColors = JSON.parse(jsonData);
                worker.postMessage({ type: 'dataResponse', dataName: 'teamColors', data: teamColors });
            } catch (error) {
                worker.postMessage({ type: 'error', message: `Failed to load teamColors: ${error.message}` });
            }
        }
        // ... other message handling logic from server.mjs for this worker
    });

    // ... other message handling logic from server.mjs for gameDataUpdate, initialGameData, etc.

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

export function getGameInfo(gameId, scoreboardId) {
    if (gameId && workerThreads[gameId]) {
        workerThreads[gameId].postMessage({ type: 'getGameInfo', scoreboardId });
    }
}

export function updateScores(gameId, scoreboardId, updatedScores) {
    if (gameId && workerThreads[gameId]) {
        workerThreads[gameId].postMessage({ type: 'updateScores', scoreboardId, data: updatedScores });
    }
}