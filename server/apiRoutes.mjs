// apiRoutes.mjs
import express from 'express';

export function configureRoutes(app, gameManager, clientManager) {
    const gameEventEmitter = clientManager.getGameEventEmitter();

    app.get('/scoreboard-updates', (req, res) => {
        const scoreboardId = req.query.scoreboardId;
        if (!scoreboardId) {
            return res.status(400).json({ error: 'scoreboardId is required' });
        }

        // Use clientManager to handle the client connection.
        // ... (Implementation using clientManager.addClient and related logic)
    });

    app.get('/getGameId/:scoreboardId', (req, res) => {
        // ... (Implementation using gameManager if needed)
    });

    app.post('/startGame/:scoreboardId', (req, res) => {
        const scoreboardId = req.params.scoreboardId;
        const gameId = Math.random().toString(36).substring(2, 15);
        
        const worker = gameManager.startGame(scoreboardId, gameId);

        // ... (Rest of the start game logic, now using gameManager)
    });

    app.post('/forceUpdate/:scoreboardId', (req, res) => {
        const scoreboardId = req.params.scoreboardId;
        // ... (Implementation using gameManager.forceUpdate)
    });

    app.get('/gameInfo/:scoreboardId', (req, res) => {
        const scoreboardId = req.params.scoreboardId;
        // ... (Implementation using gameManager.getGameInfo)
    });

    app.post('/scores/:scoreboardId', (req, res) => {
        const scoreboardId = req.params.scoreboardId;
        const updatedScores = req.body;

        // ... (Implementation using gameManager.updateScores)

    });

    // ... other routes using gameManager and clientManager
    
    gameEventEmitter.on('gameUpdate', (update) => {
      clientManager.broadcastUpdate(update)
    });
}