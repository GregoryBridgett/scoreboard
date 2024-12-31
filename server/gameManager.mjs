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
import logger from './logger.mjs';

const workerThreads = {};
const gameTimers = new Map();
const gameScoreboardMapping = new Map(); // gamesheetId => Set<scoreboardId>

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
     * @param {string} gamesheetId - The ID of the game.
     * @returns {object} - The game state object.
     */
    getGameState(gamesheetId) {
        // Replace with your actual game state logic
        return {
            gamesheetId: gamesheetId,
            score: { team1: 0, team2: 0 },
            status: 'in progress',
        };
    }

    /**
     * Registers a scoreboard with a game.
     * Starts a new worker thread for the game if it's the first scoreboard registered.
     * @param {string} gamesheetId - The ID of the gamesheet.
     * @param {string} scoreboardId - The ID of the scoreboard.
     */
    registerScoreboard(scoreboardId, divisionId, gamesheetId) {
        if (!gameScoreboardMapping.has(gamesheetId)) {
            gameScoreboardMapping.set(gamesheetId, new Set());
            startGame(divisionId, gamesheetId); // Start worker thread if it's the first scoreboard for this game
        }
        gameScoreboardMapping.get(gamesheetId).add(scoreboardId);
    }

    /**
     * Deregisters a scoreboard from a game.
     * Terminates the worker thread for the game if no more scoreboards are registered.
     * @param {string} gamesheetId - The ID of the gamesheet.
     * @param {string} scoreboardId - The ID of the scoreboard.
     */
    deregisterScoreboard(gamesheetId, scoreboardId) {
        if (gameScoreboardMapping.has(gamesheetId)) {
            gameScoreboardMapping.get(gamesheetId).delete(scoreboardId);
            if (gameScoreboardMapping.get(gamesheetId).size === 0) {
                terminateWorker(gamesheetId); // Terminate worker if no more scoreboards for this game
                gameScoreboardMapping.delete(gamesheetId);
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
        for (const [gamesheetId, scoreboards] of gameScoreboardMapping) {
            if (scoreboards.has(scoreboardId)) {
                this.deregisterScoreboard(gamesheetId, scoreboardId); // Trigger unregistration logic
                break;
            }
        }
    }
}

/**
 * Starts a new worker thread for a game.
 * @param {string} gamesheetId - The ID of the gamesheet to start.
 * @param {string} divisionId - The divisionId where the gamesheet can be found.
 * @returns {Worker} - The worker thread instance.
 */
function startGame(divisionId, gamesheetId) {
    const gamesheetUrl = `https://ringetteontario.com/division/0/${divisionId}/gamesheet/${gamesheetId}`;
    const worker = new Worker('./server/gameWorker.mjs', {
        workerData: { gamesheetUrl },
    });

    // Send game state changes to the connectionManager
    worker.on('message', (message) => {
        if (message.type === 'gameDataUpdate') {
            // Get all scoreboards for this game
            const scoreboards = gameScoreboardMapping.get(message.data.gamesheetId);

            // Send update to connectionManager to broadcast to clients
            this.connectionManager.broadcastGameUpdate(message.data.gamesheetId, message.data, scoreboards);
        }

        // ... other message handling logic from server.mjs for this worker
    });

    workerThreads[gamesheetId] = worker;
    return worker;
}

/**
 * Terminates the worker thread for a game.
 * @param {string} gamesheetId - The ID of the game to terminate.
 */
function terminateWorker(gamesheetId) {
    if (workerThreads[gamesheetId]) {
        workerThreads[gamesheetId].terminate();
        delete workerThreads[gamesheetId];
        gameTimers.delete(gamesheetId);
        logger.info({ module: 'gameManager', function: 'terminateWorker', message: `Worker terminated for gamesheetId: ${gamesheetId}` });
    }
}

/**
 * Forces an update for a game.
 * @param {string} gamesheetId - The ID of the game to update.
 */
function forceUpdate(gamesheetId) {
    if (gamesheetId && workerThreads[gamesheetId]) {
        workerThreads[gamesheetId].postMessage({ type: 'forceUpdate' });
    }
}
