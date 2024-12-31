/**
 * @file gameManager.mjs
 * @description This module manages the game logic, worker threads, and the mapping between games and scoreboards.
 * It's responsible for:
 * - Starting and stopping worker threads for each game.
 * - Handling game state updates from worker threads.
 * - Broadcasting game updates to connected clients via the ConnectionManager.
 * - Maintaining a mapping between games and their associated scoreboards.
 * - Terminating worker threads for idle games (no active scoreboards).
 *
 * **Interaction with other modules:**
 * - **ConnectionManager:**  Receives updates from gameManager and broadcasts them to clients subscribed to specific scoreboards.  Sends messages to GameManager when it detects an idle scoreboard, signaling potential worker termination.
 * - **Worker Threads:** Each game is managed by a dedicated worker thread. GameManager starts and stops these threads, sends messages to them, and receives game updates from them.
 * 
 * @module GameManager
 */

// gameManager.mjs
import { Worker } from 'worker_threads';

const workerThreads = {};
const gameTimers = new Map();
const gameScoreboardMapping = new Map(); // gameId => Set<scoreboardId>

/**
 * Class representing the GameManager.
 * Manages game states, worker threads, and the mapping between games and scoreboards.
 */
export default class GameManager {
    /**
     * Create a GameManager.
     * @param {ConnectionManager} connectionManager - The ConnectionManager instance to communicate with.
     */
    constructor(connectionManager) {
        /**
         * @type {ConnectionManager}
         * @private 
         */
        this.connectionManager = connectionManager;
    }

    /**
     * Get the current game state for a given game ID.
     * @param {string} gameId - The ID of the game.
     * @returns {object} - The game state object.
     */
    getGameState(gameId) {
        // Replace with your actual game state logic
        return {
            gameId: gameId,
            score: { team1: 0, team2: 0 },
            status: 'in progress',
        };
    }

    /**
     * Registers a scoreboard with a game.
     * Starts a new worker thread for the game if it's the first scoreboard registered.
     * @param {string} gameId - The ID of the game.
     * @param {string} scoreboardId - The ID of the scoreboard.
     */
    registerScoreboard(gameId, scoreboardId) {
        if (!gameScoreboardMapping.has(gameId)) {
            gameScoreboardMapping.set(gameId, new Set());
            startGame(gameId); // Start worker thread if it's the first scoreboard for this game
        }
        gameScoreboardMapping.get(gameId).add(scoreboardId);
    }

    /**
     * Deregisters a scoreboard from a game.
     * Terminates the worker thread for the game if no more scoreboards are registered.
     * @param {string} gameId - The ID of the game.
     * @param {string} scoreboardId - The ID of the scoreboard.
     */
    deregisterScoreboard(gameId, scoreboardId) {
        if (gameScoreboardMapping.has(gameId)) {
            gameScoreboardMapping.get(gameId).delete(scoreboardId);
            if (gameScoreboardMapping.get(gameId).size === 0) {
                terminateWorker(gameId); // Terminate worker if no more scoreboards for this game
                gameScoreboardMapping.delete(gameId);
            }
        }
    }

    /**
     * Handles an idle scoreboard message from the ConnectionManager.
     * Triggers the deregistration logic for the scoreboard.
     * @param {string} scoreboardId - The ID of the idle scoreboard.
     */
    // Handle idle scoreboard message from connectionManager
    handleIdleScoreboard(scoreboardId) {
        for (const [gameId, scoreboards] of gameScoreboardMapping) {
            if (scoreboards.has(scoreboardId)) {
                this.deregisterScoreboard(gameId, scoreboardId); // Trigger unregistration logic
                break;
            }
        }
    }
}

/**
 * Starts a new worker thread for a game.
 * @param {string} gameId - The ID of the game to start.
 * @returns {Worker} - The worker thread instance.
 */
function startGame(gameId) {
    const worker = new Worker('./server/gameWorker.mjs', {
        workerData: { gameId },
    });

    // Send game state changes to the connectionManager
    worker.on('message', (message) => {
        if (message.type === 'gameDataUpdate') {
            // Get all scoreboards for this game
            const scoreboards = gameScoreboardMapping.get(message.data.gameId);

            // Send update to connectionManager to broadcast to clients
            this.connectionManager.broadcastGameUpdate(message.data.gameId, message.data, scoreboards);
        }

        // ... other message handling logic from server.mjs for this worker
    });

    workerThreads[gameId] = worker;
    return worker;
}

/**
 * Terminates the worker thread for a game.
 * @param {string} gameId - The ID of the game to terminate.
 */
function terminateWorker(gameId) {
    if (workerThreads[gameId]) {
        workerThreads[gameId].terminate();
        delete workerThreads[gameId];
        gameTimers.delete(gameId);
        console.log(`Worker terminated for gameId: ${gameId}`);
    }
}

/**
 * Forces an update for a game.
 * @param {string} gameId - The ID of the game to update.
 */
function forceUpdate(gameId) {
    if (gameId && workerThreads[gameId]) {
        workerThreads[gameId].postMessage({ type: 'forceUpdate' });
    }
}
