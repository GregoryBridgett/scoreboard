

function generateShortId(length = 12) {
    const characters = 'abcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function generateUniqueShortId(length = 12, existingIds) {
    let newId;
    do {
        newId = generateShortId(length);
    } while (existingIds.has(newId));
    return newId;
}

export default class ClientManager {
    constructor(io) {
        this.io = io;
        this.gameSubscriptions = new Map(); // Map game IDs to Sets of client IDs
        this.clientData = new Map(); // clientId => { socketId, gameSheetId }
    }

    on(event, callback) {
        if (event === 'subscribeToGame' || event === 'unsubscribeFromGame') {
            this.io.on('connection', (socket) => {
                socket.on(event, (data) => {
                    callback(data, socket); 
                });
            });
        }
    }

    handleConnection(socket) {
        const clientId = generateUniqueShortId(12, this.clientData.keys());
        this.clientData.set(clientId, { socketId: socket.id, gameSheetId: null });

        socket.on("subscribeToGame", (gameId) => {
            const clientId = this.findClientIdBySocketId(socket.id);
            if (clientId) {
                this.clientData.get(clientId).gameSheetId = gameId;
            }
            if (!this.gameSubscriptions.has(gameId)) {
                this.gameSubscriptions.set(gameId, new Set());
            }
            this.gameSubscriptions.get(gameId).add(socket.id);
            console.log(`Client ${socket.id} subscribed to game ${gameId}`);
            this.io.emit('clientSubscribed', { clientId, gameId }); 
        });

        socket.on("unsubscribeFromGame", (gameId) => {
            const clientId = this.findClientIdBySocketId(socket.id);
            if (clientId) {
                this.clientData.get(clientId).gameSheetId = null; 
            }
            if (this.gameSubscriptions.has(gameId)) {
                this.gameSubscriptions.get(gameId).delete(socket.id);
                console.log(`Client ${socket.id} unsubscribed from game ${gameId}`);
                if (this.gameSubscriptions.get(gameId).size === 0) {
                    this.gameSubscriptions.delete(gameId); // Remove empty game subscription
                }
            }
            this.io.emit('clientUnsubscribed', { clientId, gameId });
        });
    }

    findClientIdBySocketId(socketId) {
        for (const [clientId, clientInfo] of this.clientData) {
            if (clientInfo.socketId === socketId) {
                return clientId;
            }
        }
        return null; 
    }
}