// sseManager.mjs
import { EventEmitter } from 'events';

class SseManager extends EventEmitter {
  constructor(gameManager, clientManager) {
    super();
    this.gameManager = gameManager;
    this.clientManager = clientManager;
    this.clients = new Map();
  }

  addClient(clientId, res) {
    if (this.clients.has(clientId)) {
      console.warn(`Client ${clientId} already exists`);
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


  removeClient(clientId) {
    if (!this.clients.has(clientId)) {
      console.warn(`Client ${clientId} not found`);
      return;
    }
    this.clients.get(clientId).end();
    this.clients.delete(clientId);

    this.clientManager.removeClient(clientId);
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


  broadcastGameUpdate() {
    for (const [clientId] of this.clients) {
      this.sendGameUpdate(clientId);
    }
  }
}

export default SseManager;