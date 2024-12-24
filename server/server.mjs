import express from 'express';
import bodyParser from 'body-parser';
import { Worker } from 'worker_threads';
import * as path from 'path';
import * as fs from 'fs';
import * as EventEmitter from 'events';

const app = express();
const port = process.env.PORT || 3000;

// Store connected clients for SSE
const clients = new Set();
// Timer for server shutdown
let serverTimeout;

// Store scoreboard data for all games
const scoreboardData = {};
// Map scoreboard IDs to game IDs
const scoreboardGameMap = {};
const gameEventEmitter = new EventEmitter();
// Store worker threads by game ID
const workerThreads = {};
// Store timers for each game to track client subscriptions
const gameTimers = new Map();
// Use body-parser to parse JSON request bodies
app.use(bodyParser.json());

// Function to get initial game data (replace with actual logic)
function getInitialGameData(scoreboardId) {
    // Replace with your logic to fetch initial game data based on scoreboardId
    // This is just dummy data for now
    return {
        scoreboardId: scoreboardId,
        scores: [0, 0],
        goals: [],
        homeTeamShots: 0,
        awayTeamShots: 0,
        penalties: [],
        gameInfo: {
            team1: { name: 'Team A', color: 'red' },
            team2: { name: 'Team B', color: 'blue' }
        }
    };
}

// Endpoint for SSE connection
app.get('/scoreboard-updates', (req, response) => {
    const scoreboardId = req.query.scoreboardId;
    if (!scoreboardId) {
        return response.status(400).json({ error: 'scoreboardId is required' });
    }

    response.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });

    const gameId = scoreboardGameMap[scoreboardId];

    // Add client to the set
    clients.add(response);

    // Client subscribed - start or reset the timer
    if (gameTimers.has(gameId)) {
        clearTimeout(gameTimers.get(gameId)); 
    }
    gameTimers.set(gameId, setTimeout(() => {
        // Timer expired - check if there are still no clients
        if (!clientsForGame(gameId)) {
            terminateWorker(gameId);
        }
    }, 120000)); // 2 minutes

    // Send initial data to the client
    if (gameId && scoreboardData[gameId]) {
        const initialData = { type: 'initialData', data: scoreboardData[gameId], gameId: gameId }; // Send all game data initially
        response.write(`data: ${JSON.stringify(initialData)}\n\n`); 
    }

    function clientsForGame(gameId) {
        // Check if any client in the 'clients' set is subscribed to this gameId
        return [...clients].some(client => {
            // Assuming clients store the gameId they are subscribed to (you might need to adjust this)
            return client.gameId === gameId;
        });
    }

    // Remove client from the set when connection closes
    response.on('close', () => {
        clients.delete(response);
        if (clients.size === 0) {
            // Optional: Start a timer to shut down the server if no clients are connected for a while
            // ... (implementation for server shutdown)
        } else {
            // Client unsubscribed - decrement client count and potentially start timer
            if (!clientsForGame(gameId) && gameTimers.has(gameId)) {
                clearTimeout(gameTimers.get(gameId)); // Reset any existing timer
                gameTimers.set(gameId, setTimeout(() => terminateWorker(gameId), 120000)); // 2 minutes
            }
        }
    });
    // If a client connects after the timeout has started, clear the timeout
    if (serverTimeout) {
        clearTimeout(serverTimeout);
        serverTimeout = null;
    }
});

// Function to terminate worker and remove associated data
function terminateWorker(gameId) {
    if (workerThreads[gameId]) {
        workerThreads[gameId].terminate();
        delete workerThreads[gameId];
        const scoreboardId = Object.keys(scoreboardGameMap).find(key => scoreboardGameMap[key] === gameId);
        if (scoreboardId) {
            delete scoreboardGameMap[scoreboardId];
        }
        delete scoreboardData[gameId];
        gameTimers.delete(gameId); 
        console.log(`Worker terminated for gameId: ${gameId}`);
    }
};

// Function to terminate worker and remove associated data
function terminateWorkerAndData(gameId) {
    if (workerThreads[gameId]) {
        workerThreads[gameId].terminate();
        delete workerThreads[gameId];
        const scoreboardId = Object.keys(scoreboardGameMap).find(key => scoreboardGameMap[key] === gameId);
        if (scoreboardId) {
            delete scoreboardGameMap[scoreboardId];
        }
        delete scoreboardData[gameId];
        gameTimers.delete(gameId); 
        console.log(`Worker terminated for gameId: ${gameId}`);
    }
};

// Event listener for game updates
gameEventEmitter.on('gameUpdate', (update) => {
    // Iterate over a copy of the clients set to avoid issues with concurrent modification
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
});

// Endpoint to get the gameId associated with a scoreboardId
app.get('/getGameId/:scoreboardId', (req, res) => {
    const scoreboardId = req.params.scoreboardId;
    const gameId = scoreboardGameMap[scoreboardId];

    if (gameId) {
        res.json({ gameId });
    } else {
        res.status(404).json({ message: 'Scoreboard ID not found' });
    }
});

// Endpoint to start a new game and associate it with a scoreboardId
app.post('/startGame/:scoreboardId', (req, res) => {
    const scoreboardId = req.params.scoreboardId;
    // Generate a unique gameId (you might want to use a library like uuid for this)
    const gameId = Math.random().toString(36).substring(2, 15); 
    scoreboardGameMap[scoreboardId] = gameId;
    scoreboardData[gameId] = { scores: [], goals: [], penalties: [], homeTeamShots: 0, awayTeamShots: 0 };  
    

    const worker = new Worker(path.join(__dirname, 'gameWorker.js'), {
        workerData: { gameId } 
    });

    // Handle messages from workers:
    worker.on('message', async (message) => {
        if (message.type === 'requestData') {
            if (message.dataName === 'teamColors') {
                try {
                    const jsonData = await fs.promises.readFile('server/teamColors.json', 'utf8');
                    const teamColors = JSON.parse(jsonData);
                    worker.postMessage({ type: 'dataResponse', dataName: 'teamColors', data: teamColors });
                } catch (error) {
                    worker.postMessage({ type: 'error', message: `Failed to load teamColors: ${error.message}` });
                }
            }
        }
        // ... other message handling logic
    });

    worker.on('message', (data) => {
        if (data.type === 'gameDataUpdate') {
            if (scoreboardData[data.gameId]) {
                // Apply partial update to the scoreboard data in the main thread
                for (const key in data.data) {
                    scoreboardData[data.gameId][key] = data.data[key];
                }
                // Emit the game update event with the scoreboardId
                gameEventEmitter.emit('gameUpdate', {
                    type: 'gameDataUpdate',
                    scoreboardId: data.scoreboardId, 
                    data: data.data
                });
            } else {
                console.error('Game ID not found:', data.gameId);
            }
        }
    });

    // Store the worker in the dictionary
    workerThreads[gameId] = worker;

    res.json({ gameId, scoreboardId });
});

// Endpoint to force an update in the worker thread
app.post('/forceUpdate/:scoreboardId', (req, res) => {
    const scoreboardId = req.params.scoreboardId;
    const gameId = scoreboardGameMap[scoreboardId];

    if (gameId && workerThreads[gameId]) { 
        workerThreads[gameId].postMessage({ type: 'forceUpdate' });
        res.json({ message: 'Update signal sent to worker.' });
    } else {
        res.status(404).json({ message: 'Game not found.' });
    }
});


// Endpoint to get current scores, goals, and penalties
app.get('/scores', (req, res) => {
    res.json(scoreboardData); 
});

// Endpoint to get initial game information
app.get('/gameInfo/:scoreboardId', (req, res) => {
    const scoreboardId = req.params.scoreboardId;
    const gameId = scoreboardGameMap[scoreboardId];

    if (!gameId) {
        return res.status(404).json({ message: 'Scoreboard ID not found' });
    }

    if (scoreboardData[gameId]) {
        // Return the full game data
        res.json(scoreboardData[gameId]);
    } else {
        // Game data not found for this gameId
        res.status(404).json({ message: 'Game data not found for this scoreboard ID' });
    }
});

// Endpoint to update scores for a specific game
app.post('/scores/:scoreboardId', (req, res) => {
    const scoreboardId = req.params.scoreboardId;
    const gameId = scoreboardGameMap[scoreboardId];

    if (!gameId) {
        return res.status(404).json({ message: 'Scoreboard ID not found' });
    }

    const updatedScores = req.body; // Expecting an array of scores

    if (scoreboardData[gameId]) {
        // Update existing game data
        scoreboardData[gameId] = { ...scoreboardData[gameId], ...updatedScores };

        // Send the score update to clients
        const update = { type: 'scoreUpdate', data: updatedScores };
        gameEventEmitter.emit('gameUpdate', update);

        res.status(200).json({ message: 'Score updated successfully' });
    } else {
        // Game data not found for this gameId
        res.status(404).json({ message: 'Game data not found for this scoreboard ID' });
    }
});

// Endpoint to get team colors
app.get('/teamColors/:teamId/:colorSet', (req, res) => {
    const teamId = req.params.teamId;
    const colorSet = req.params.colorSet; // 'home' or 'away'

    fs.readFile(path.join(__dirname, 'teamColors.json'), 'utf-8', (err, data) => {
        if (err) {
            console.error("Error reading teamColors.json:", err);
            return res.status(500).json({ message: "Error retrieving team colors" });
        }

        try {
            const teamColorsData = JSON.parse(data);
            const teamData = teamColorsData.teams.find(team => team.teamId === teamId);

            if (!teamData) {
                return res.status(404).json({ message: "Team not found" });
            }

            const clubName = teamData.clubName;
            const colors = teamColorsData.clubs[clubName][colorSet];

            res.json(colors);
        } catch (error) {
            console.error("Error parsing teamColors.json:", error);
            return res.status(500).json({ message: "Error retrieving team colors" });
        }
    });    
});


const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});