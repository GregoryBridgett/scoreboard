/**
 * @file Manages client connections, subscriptions, and scoreboard updates using Server-Sent Events (SSE).
 *
 * The `ConnectionManager` is a central component responsible for:
 *
 * - **Client Registration:** Registers new clients, assigning them unique IDs and establishing SSE connections.
 * - **Subscriptions:**  Manages client subscriptions to specific scoreboards.
 * - **Scoreboard updates:** Broadcasts scoreboard updates to subscribed clients via SSE.
 * - **Idle Scoreboard Detection:**  Detects idle scoreboards (those with no active clients) and notifies the `GameManager`.
 *
 * **Interaction with `GameManager`:**
 *
 * - The `ConnectionManager` receives scoreboard updates from the `GameManager` and broadcasts them to the appropriate clients.
 * - It notifies the `GameManager` when scoreboards become idle, allowing the `GameManager` to terminate worker threads.
 *
 * **Interaction with Clients:**
 *
 * - Clients connect to the `ConnectionManager` via SSE.
 * - Clients register for specific scoreboards using the API.
 */
// connectionManager.mjs
import logger from './logger.mjs';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

class ConnectionManager extends EventEmitter {
    /**
     * Manages client connections, subscriptions, and broadcasts score updates using Server-Sent Events (SSE).
     * 
     * This class is responsible for:
     * - Registering and removing clients.
     * - Maintaining mappings between clients, and scoreboards.
     * - Sending score updates to subscribed clients.
     * 
     * @param {GameManager} gameManager - An instance of the GameManager class.
     */
    constructor(gameManager) {
        super(); 
        this.gameManager = gameManager;
        /** @type {Map<string, { res: import('http').ServerResponse, scoreboardId: string }>} */
        this.clients = new Map();
        /** @type {Map<string, Set<string>>} */
        this.clientScoreboardSubscriptions = new Map();
    }

    /**
     * Registers a client to a scoreboard and starts sending score updates.
     * 
     * Generates a unique client ID, sets up the SSE connection, and adds
     * the client to the clientScoreboardSubscriptions map.
     * 
     * @param {string} scoreboardId - The ID of the scoreboard the client is subscribing to.
     * @param {import('http').ServerResponse} res - The response object of the incoming request.
     * 
     * @returns {void}
     */
    registerClient(scoreboardId, res) {
        const clientId = uuidv4(); // Generate a unique client ID

        // Check if a client with the generated ID already exists (unlikely, but good practice)
        if (this.clients.has(clientId)) {
            logger.warn({ module: 'ConnectionManager', function: 'registerClient', message: `Client ${clientId} already exists (collision). Generating a new one.` });
            return this.registerClient(scoreboardId, res); // Retry with a new ID
        }

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        });

        this.clients.set(clientId, { res, scoreboardId: scoreboardId });

        if (!this.clientScoreboardSubscriptions.has(clientId)) {
            this.clientScoreboardSubscriptions.set(clientId, new Set());
        }
        this.clientScoreboardSubscriptions.get(clientId).add(scoreboardId);

        res.on('close', () => {
            this.removeClient(clientId);
        });

        this.sendScoreboardUpdate(clientId); 
        logger.info({ module: 'ConnectionManager', function: 'registerClient', message: `Client ${clientId} connected to scoreboard ${scoreboardId}` });
    }

    /**
     * Removes a client from the connection manager.
     * 
     * @param {string} clientId - The ID of the client to remove.
     * @returns {void}
     */
    removeClient(clientId) {
        if (this.clients.has(clientId)) {
            const { res, scoreboardId } = this.clients.get(clientId);
            res.end();
            this.clients.delete(clientId);

            if (this.clientScoreboardSubscriptions.has(clientId)) {
                this.clientScoreboardSubscriptions.get(clientId).delete(scoreboardId);
                if (this.clientScoreboardSubscriptions.get(clientId).size === 0) {
                    this.clientScoreboardSubscriptions.delete(clientId);
                }
            }

            // If this was the last client for this scoreboard, deregister it
            if (this.getSubscriptionCountForScoreboard(scoreboardId) === 0) {
                this.gameManager.deregisterScoreboard(scoreboardId);
            }

            logger.info({ module: 'ConnectionManager', function: 'removeClient', message: `Client ${clientId} disconnected from scoreboard ${scoreboardId}` });
        } else {
            logger.warn({ module: 'ConnectionManager', function: 'removeClient', message: `Client ${clientId} not found for removal` });
        }
    }

    /**
     * Sends a scoreboard update to a specific client.
     * 
     * @param {string} clientId - The ID of the client to send the update to.
     * @returns {void}
     */
    sendScoreboardUpdate(clientId) {
        try {
            const { scoreboardId, res } = this.clients.get(clientId);
            const gameState = this.gameManager.getGameStateForScoreboard(scoreboardId);
            const data = `data: ${JSON.stringify(gameState)}\n\n`;
            res.write(data);
        } catch (error) {
            logger.error({ module: 'ConnectionManager', function: 'sendScoreboardUpdate', message: 'Error sending game update', error: error });
        }
    }

    /**
     * Broadcasts a scoreboard update to all clients subscribed to a specific scoreboard.
     * 
     * @param {string} scoreboardId - The ID of the scoreboard to broadcast the update to.
     * @returns {void}
     */
    broadcastScoreboardUpdate(scoreboardId) {
        try {
            // Iterate over all client subscriptions
            for (const [clientId, subscribedScoreboards] of this.clientScoreboardSubscriptions) {
                // If the client is subscribed to the scoreboard, send the update
                if (subscribedScoreboards.has(scoreboardId)) {
                    this.sendScoreboardUpdate(clientId);
                }
            }
        } catch (error) {
            logger.error({ module: 'ConnectionManager', function: 'broadcastScoreboardUpdate', message: 'Error broadcasting game update', error: error });
        }
    }

    /**
     * Gets the number of clients subscribed to a specific scoreboard.
     * 
     * @param {string} scoreboardId - The ID of the scoreboard.
     * @returns {number} The number of subscribed clients.
     */
    getSubscriptionCountForScoreboard(scoreboardId) {
        let count = 0;
        for (const clients of this.clientScoreboardSubscriptions.values()) {
            if (clients.has(scoreboardId)) {
                count++;
            }
        }
        return count;
    }

    liveScoreboardGameDetails(scoreboardId, divisionId, gamesheetId)
    {
        // If this is the first client subscribing to this scoreboard, register it 
        if (this.getSubscriptionCountForScoreboard(scoreboardId) === 1) {
            this.gameManager.registerScoreboard(scoreboardId, divisionId, gamesheetId);
        }        
    }

    /**
     * Gets the scoreboard ID that a client is subscribed to.
     * 
     * @param {string} clientId - The ID of the client.
     * @returns {string | undefined} The scoreboard ID, or undefined if the client is not subscribed to any scoreboard.
     */
    getClientScoreboardId(clientId) {
        const clientData = this.clients.get(clientId);
        return clientData ? clientData.scoreboardId : undefined;
    }

    /**
     * Handles a new SSE connection from a client.
     * 
     * Sets up the SSE headers, registers the client for updates,
     * and manages the connection lifecycle.
     * 
     * @param {import('http').IncomingMessage} req - The incoming request object.
     * @param {import('http').ServerResponse} res - The response object.
     * @param {string} scoreboardId - The ID of the scoreboard the client is subscribing to.
     * @param {string} clientId - The ID of the client.
     * @returns {void}
     */
    handleSSEConnection(req, res, scoreboardId, clientId) {
        if (!this.clients.has(clientId)) {
            logger.error({ module: 'ConnectionManager', function: 'handleSSEConnection', message: `Client ${clientId} not found for SSE connection` });
            return res.status(404).send('Client not found');
        }

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        });

        // Send an initial update
        this.sendScoreboardUpdate(clientId);

        res.on('close', () => {
            this.removeClient(clientId);
        });

        logger.info({ module: 'ConnectionManager', function: 'handleSSEConnection', message: `Client ${clientId} connected to SSE stream for scoreboard ${scoreboardId}` });
    }
}


export default ConnectionManager;