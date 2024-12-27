// apiRoutes.mjs
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { getDivisionNames, getLeagues } from '../server/getRampDivisionIds.mjs'; 

export default function configureRoutes(app, connectionManager) {

    // I. Client and UI Registration (Management)
    app.get('/client/overlay/:scoreboardID', (req, res) => {
       // const scoreboardID = req.params.scoreboardID;
        const filePath = path.join(__dirname, '..', 'overlay', 'overlay.html'); 

        res.sendFile(filePath, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(404).send('Scoreboard client app not found'); 
            }
        });
    });    

    app.post('/client/overlay/:scoreboardID', (req, res) => {
        const scoreboardID = req.params.scoreboardID;

        try {
            // Register the client and get the generated clientID
            const clientID = connectionManager.registerClient(scoreboardID);
            
            res.status(201).json({ message: 'Registered for events', sseEndpoint: `/api/scoreboard/${scoreboardID}/events`, clientID });
        } catch (error) {
            console.error('Error registering client:', error);
            return res.status(500).json({ error: 'Failed to register client' });
        }
    });    

    app.get('/client/ui/:scoreboardID', (req, res) => {
       // const scoreboardID = req.params.scoreboardID;
        const filePath = path.join(__dirname, '..', 'ui', 'ui.html'); 

        res.sendFile(filePath, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(404).send('UI client app not found'); 
            }
        });
    });

    app.post('/client/ui/:scoreboardID', (req, res) => {
        const scoreboardID = req.params.scoreboardID;
        try {
            const clientID = connectionManager.registerClient(scoreboardID);
            res.status(201).json({ message: 'Registered for events', sseEndpoint: `/api/scoreboard/${scoreboardID}/events`, clientID });
        } catch (error) {
            console.error('Error registering client:', error);
            return res.status(500).json({ error: 'Failed to register client' });
        }
    });

    // II. Real-time Event Stream (SSE)
    app.get('/scoreboard/:scoreboardId/events', (req, res) => {
        const scoreboardId = req.params.scoreboardId
        const clientId = req.query.clientId // Get clientID from the query string
        
        if (!clientId) {
            return res.status(400).send('Missing clientID')
        }
    
        connectionManager.handleSSEConnection(req, res, scoreboardId, clientId) 
    });

    // III. Schedule Management (Read-Only)
    app.get('/schedule/tournaments', (req, res) => {
        const tournamentUrl = `http://ringetteontariogames.msa4.rampinteractive.com/tournaments`;
        document = await fetchDocument(tournamentUrl);
        if (!document) return;
        const tournamentList = getTournaments(document);
        res.status(200).json(JSON.stringify(tournamentList)); // Placeholder response
    });

    app.get('/schedule/leagues', (req, res) => {
        const ringetteUrl = `http://ringetteontariogames.msa4.rampinteractive.com`;
        document = await fetchDocument(ringetteUrl);
        if (!document) return;
        const leagues = getLeagues();
        res.status(200).json(leagues); 
    });

    app.get('/schedule/leagues/:leagueName/divisions', (req, res) => {
        const leagueName = req.params.leagueName;
        const ringetteUrl = `http://ringetteontariogames.msa4.rampinteractive.com`;
        document = await fetchDocument(ringetteUrl);
        if (!document) return;
        const divisionNames = getDivisionNames(document, leagueName);
        res.status(200).json(divisionNames); 
    });

    app.get('/schedule/leagues/:leagueName/divisions/:divisionName/teams', (req, res) => {
        // ... Implementation to get teams within a division
        res.status(200).json([]); // Placeholder response
    });

    app.get('/schedule/leagues/:leagueID/divisions/:divisionID/team/:teamID/games', (req, res) => {
        // ... Implementation to get games for a specific team
        res.status(200).json([]); // Placeholder response
    });

    // IV. Gamesheet Management (Read-Only)
    app.get('/gamesheet/:gamesheetID/status', (req, res) => {
        // ... Implementation to retrieve the status of a gamesheet
        res.status(200).json({ status: 'Not Started' }); // Placeholder response
    });

    // V. Scoreboard Control (Write Operations)
    app.put('/scoreboard/:scoreboardID/score/:homeaway/:score', (req, res) => {
        // ... Implementation using connectionManager to set the home score
        res.status(200).send('Home score updated'); // Placeholder response
    });

    app.post('/scoreboard/:scoreboardID/gametimer/:enable', (req, res) => { /* ... */ });
    app.put('/scoreboard/:scoreboardID/gametimer/:time', (req, res) => { /* ... */ });
    app.post('/scoreboard/:scoreboardID/gametimer/start', (req, res) => { /* ... */ });
    app.post('/scoreboard/:scoreboardID/gametimer/stop', (req, res) => { /* ... */ });
    app.put('/scoreboard/:scoreboardID/penalty/', (req, res) => { /* ... */ });
    app.delete('/scoreboard/:scoreboardID/penalty', (req, res) => { /* ... */ });
    app.put('/scoreboard/:scoreboardID/shots', (req, res) => { /* ... */ });
    app.put('/scoreboard/:scoreboardID/period', (req, res) => { /* ... */ });

}