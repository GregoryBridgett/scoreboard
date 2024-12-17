const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');

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
// Use body-parser to parse JSON request bodies
app.use(bodyParser.json());

// Function to scrape game data (replace with actual scraping logic)
async function scrapeGameData() {
    try {
        const response = await axios.get('https://example.com/game-data'); // Replace with the actual URL
        // Process the response and extract game data
        const gameData = response.data; 
        return gameData;
    } catch (error) {
        console.error('Error scraping game data:', error);
        return null;
    }
}

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

    // Add client to the set
    clients.add(response);

    // Send initial data to the client
    const gameId = scoreboardGameMap[scoreboardId];
    if (gameId && scoreboardData[gameId]) {
        const initialData = { type: 'initialData', data: scoreboardData[gameId] }; // Send all game data initially
        response.write(`data: ${JSON.stringify(initialData)}\n\n`); 
    }

    // Remove client from the set when connection closes
    response.on('close', () => {
        clients.delete(response);        
        if (clients.size === 0) {
            // Optional: Start a timer to shut down the server if no clients are connected for a while
            // ... (implementation for server shutdown)
        }
    });
    // If a client connects after the timeout has started, clear the timeout
    if (serverTimeout) {
        clearTimeout(serverTimeout);
        serverTimeout = null;
    }
});

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
        workerData: { gameId, scoreboardId } 
    });

    worker.on('message', (data) => {
        if (data.type === 'gameDataUpdate') {
            const gameId = scoreboardGameMap[data.scoreboardId]; // Get the game ID
            if (gameId) {
                // Update the scoreboard data in the main thread
                scoreboardData[gameId] = data.data;

                // Emit the game update event with the scoreboardId
                gameEventEmitter.emit('gameUpdate', {
                    type: 'gameDataUpdate',
                    scoreboardId: data.scoreboardId, 
                    data: data.data
                });
            } else {
                console.error('Game ID not found for scoreboard ID:', data.scoreboardId);
            }
        }
    });

    res.json({ gameId, scoreboardId });
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

    fs.readFile('teamColors.json', 'utf-8', (err, data) => {
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