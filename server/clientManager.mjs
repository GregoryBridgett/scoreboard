// clientManager.mjs
import * as EventEmitter from 'events';

const clients = new Set();
const gameEventEmitter = new EventEmitter();

export function addClient(response, gameId) {
    response.gameId = gameId; // Store gameId with the client
    clients.add(response);

    response.on('close', () => {
        clients.delete(response);
        // Additional logic for handling client disconnections can be added here.
        // For example, emitting an event or checking for game termination.
    });
}

export function removeClient(response) {
    clients.delete(response);
}

export function broadcastUpdate(update) {
    for (const client of [...clients]) {
        // Check if the client is still connected before sending data
        if (!client.destroyed) {
            try {
                client.write(`data: ${JSON.stringify(update)}\n\n`);
            } catch (err) {
                // Handle errors, such as client disconnections during the loop
                console.error('Error sending data to client:', err);
                clients.delete(client); // Remove the disconnected client
            }
        } else {
            clients.delete(client); // Remove the disconnected client
        }
    }
}

export const getGameEventEmitter = () => gameEventEmitter;