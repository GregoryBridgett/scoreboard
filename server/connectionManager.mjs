/**
 * @file Manages client connections, subscriptions, and game updates using Server-Sent Events (SSE).
 *
 * The `ConnectionManager` is a central component responsible for:
 *
 * - **Client Registration:** Registers new clients, assigning them unique IDs and establishing SSE connections.
 * - **Subscriptions:**  Manages client subscriptions to specific scoreboards.
 * - **Game Updates:** Broadcasts game updates to subscribed clients via SSE.
 * - **Heartbeats:** Handles client heartbeats to monitor connections and detect idle clients.
 * - **Idle Scoreboard Detection:**  Detects idle scoreboards (those with no active clients) and notifies the `GameManager`.
 *
 * **Interaction with `GameManager`:**
 *
 * - The `ConnectionManager` receives game updates from the `GameManager` and broadcasts them to the appropriate clients.
 * - It notifies the `GameManager` when scoreboards become idle, allowing the `GameManager` to terminate worker threads.
 *
 * **Interaction with Clients:**
 *
 * - Clients connect to the `ConnectionManager` via SSE.
 * - Clients register for specific scoreboards using the API.
 * - Clients send periodic heartbeats to maintain their connection status.
 */
// connectionManager.mjs
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

class ConnectionManager extends EventEmitter {
    /**
     * Manages client connections, subscriptions, and broadcasts game updates using Server-Sent Events (SSE).
     * 
     * This class is responsible for:
     * - Registering and removing clients.
     * - Maintaining mappings between clients, games, and scoreboards.
     * - Sending game updates to subscribed clients.
     * - Handling client heartbeats and detecting idle scoreboards.
     * 
     * @param {GameManager} gameManager - An instance of the GameManager class.
     */
    constructor(gameManager) {
        super();
        this.gameManager = gameManager;
        /** @type {Map<string, { res: import('http').ServerResponse, gameId: string }>} */
        this.clients = new Map(); 
        /** @type {Map<string, Set<string>>} */
        this.clientGameSubscriptions = new Map(); 
        /** @type {Map<string, number>} */
        this.clientLastMessageIds = new Map(); 
    }

    /**
     * Registers a client to a scoreboard and starts sending game updates.
     * 
     * Generates a unique client ID, sets up the SSE connection, and adds
     * the client to the clientGameSubscriptions map.
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
            console.warn(`Client ${clientId} already exists (collision). Generating a new one.`);
            return this.registerClient(scoreboardId, res); // Retry with a new ID
        }

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        });

        this.clients.set(clientId, { res, gameId: scoreboardId });

        if (!this.clientGameSubscriptions.has(clientId)) {
            this.clientGameSubscriptions.set(clientId, new Set());
        }
        this.clientGameSubscriptions.get(clientId).add(scoreboardId);

        res.on('close', () => {
            this.removeClient(clientId);
        });


        this.sendGameUpdate(clientId);
        console.log(`Client ${clientId} connected to scoreboard ${scoreboardId}`);
    }

    /**
     * Removes a client from the connection manager.
     * 
     * @param {string} clientId - The ID of the client to remove.
     * @returns {void}
     */
    removeClient(clientId) {
        if (this.clients.has(clientId)) {
            const { res, gameId } = this.clients.get(clientId);
            res.end();
            this.clients.delete(clientId);

            if (this.clientGameSubscriptions.has(clientId)) {
                this.clientGameSubscriptions.get(clientId).delete(gameId);
                if (this.clientGameSubscriptions.get(clientId).size === 0) {
                    this.clientGameSubscriptions.delete(clientId);
                }
            }
            console.log(`Client ${clientId} disconnected from scoreboard ${gameId}`);
        } else {
            console.warn(`Client ${clientId} not found for removal`);
        }
    }

    /**
     * Sends a game update to a specific client.
     * 
     * @param {string} clientId - The ID of the client to send the update to.
     * @returns {void}
     */
    sendGameUpdate(clientId) {
        try {
            const { gameId, res } = this.clients.get(clientId);
            const gameState = this.gameManager.getGameStateForScoreboard(gameId); 
            const data = `data: ${JSON.stringify(gameState)}\n\n`;
            res.write(data);
        } catch (error) {
            console.error('Error sending game update:', error);
        }
    }

    /**
     * Broadcasts a game update to all clients subscribed to a specific scoreboard.
     * 
     * @param {string} scoreboardId - The ID of the scoreboard to broadcast the update to.
     * @returns {void}
     */
    broadcastGameUpdate(scoreboardId) {
        // Get clients subscribed to the scoreboard
        const clients = this.gameManager.getClientsForScoreboard(scoreboardId); 
        if (clients) {
            for (const clientId of clients) {
                try {
                    this.sendGameUpdate(clientId);
                } catch (error) {
                    console.error(`Error sending update to client ${clientId}:`, error);
                    // Consider removing the client if it's disconnected
                    this.removeClient(clientId);
                }
            }
        }
    }

    /**
     * Handles client heartbeats to track activity and detect idle scoreboards.
     * 
     * @param {string} clientId - The ID of the client sending the heartbeat.
     * @param {number} lastReceivedMessageId - The last message ID received by the client.
     * @returns {void}
     */
    handleHeartbeat(clientId, lastReceivedMessageId) {
        this.clientLastMessageIds.set(clientId, lastReceivedMessageId);

        // Check for idle scoreboards
        const gameId = this.getClientGameId(clientId); 
        if (this.getSubscriptionCountForGame(gameId) === 0) {
            this.gameManager.handleIdleScoreboard(gameId); 
        }
    }

    /**
     * Gets the last message ID received by a client.
     * 
     * @param {string} clientId - The ID of the client.
     * @returns {number} The last received message ID, or 0 if not found.
     */
    getClientLastMessageId(clientId) {
        return this.clientLastMessageIds.get(clientId) || 0; 
    }

    /**
     * Gets the number of clients subscribed to a specific game.
     * 
     * @param {string} gameId - The ID of the game.
     * @returns {number} The number of subscribed clients.
     */
    getSubscriptionCountForGame(gameId) {
        let count = 0;
        for (const clients of this.clientGameSubscriptions.values()) {
            if (clients.has(gameId)) {
                count++;
            }
        }
        return count;
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
            console.error(`Client ${clientId} not found for SSE connection`);
            return res.status(404).send('Client not found');
        }
    
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        });
    
        // Send an initial update
        this.sendGameUpdate(clientId);
    
        res.on('close', () => {
            this.removeClient(clientId);
        });
    
        console.log(`Client ${clientId} connected to SSE stream for scoreboard ${scoreboardId}`);
    }
}


export default ConnectionManager;