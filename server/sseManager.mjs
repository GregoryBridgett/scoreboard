// sseManager.mjs
import { EventEmitter } from 'events';

class SseManager extends EventEmitter {
  constructor(gameManager, clientManager) {
    super();
    this.gameManager = gameManager;
    this.clientManager = clientManager;
    this.clients = new Map();
    this.clientGameSubscriptions = new Map(); // Store client subscriptions

    // Listen for client subscription/unsubscription events
    clientManager.on('clientSubscribed', (clientId, gameId) => {
        this.subscribeClientToGame(clientId, gameId);
    });    
    clientManager.on('clientUnsubscribed', (clientId, gameId) => {
        this.unsubscribeClientFromGame(clientId, gameId);
    }); 

  }

  addClient(clientId, res) {
    if (this.clients.has(clientId)) {
      console.warn(`Client ${clientId} already exists`);
      this.removeClient(clientId)
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    this.clients.set(clientId, res);

    // Handle client disconnections
    res.on('close', () => {
      this.removeClient(clientId);
    });

    // Send initial game state
    this.sendGameUpdate(clientId);

    this.emit('clientConnected', clientId);
    console.log(`Client ${clientId} connected`);
  }

  subscribeClientToGame(clientId, gameId) {
    if (!this.clients.has(clientId)) {
      console.warn(`Client ${clientId} not found for subscription`);
      return;
    }

    if (!this.clientGameSubscriptions.has(clientId)) {
      this.clientGameSubscriptions.set(clientId, new Set()); 
    }

    this.clientGameSubscriptions.get(clientId).add(gameId);
    console.log(`Client ${clientId} subscribed to game ${gameId}`);
  }

  unsubscribeClientFromGame(clientId, gameId) {
    if (this.clientGameSubscriptions.has(clientId)) {
      this.clientGameSubscriptions.get(clientId).delete(gameId);
      console.log(`Client ${clientId} unsubscribed from game ${gameId}`);
    }
  }

  removeClient(clientId) {    
    if (this.clients.has(clientId)) {
      this.clients.get(clientId).end();
      this.clients.delete(clientId);
    } else {
      console.warn(`Client ${clientId} not found for removal`);
    }
  
    //this.clientManager.removeClient(clientId); // ClientManager doesn't handle socket management
    this.clientGameSubscriptions.delete(clientId); // Remove subscriptions
    this.emit('clientDisconnected', clientId);
    console.log(`Client ${clientId} disconnected`);
  }


  sendGameUpdate(clientId) {
    try {
      const gameState = this.gameManager.getGameState();
      const data = `data: ${JSON.stringify(gameState)}\n\n`;

      if (this.clients.has(clientId)) {
        this.clients.get(clientId).write(data);
      } else {
        console.warn(`Client ${clientId} not found for update`);
      }
    } catch (error) {
      console.error('Error sending game update:', error);
      // Consider sending an error message to the client
    }
  }


  getClientsForGame(gameId) {
    const clients = new Set(); 
    for (const [clientId, subscribedGames] of this.clientGameSubscriptions) {
      if (subscribedGames.has(gameId)) {
        clients.add(clientId);
      }
    }
    return clients;
  }

  sendGameUpdateToClients(gameId) {
    const clients = this.getClientsForGame(gameId); 

    for (const clientId of clients) {
      try {
        this.sendGameUpdate(clientId);
      } catch (error) {
        console.error(`Error sending update to client ${clientId}:`, error);
      }
    }
  }
}

export default SseManager;