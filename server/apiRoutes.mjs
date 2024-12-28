// *** TODO *** I should only fetch the document once when the server loads and then reuse it.
// apiRoutes.mjs
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { getDivisionNames, getIncompleteGames, getLeagues, getTeamNames, getDivisionId, getTournaments, getIncompleteGames, getLiveStatus } from '../server/getRampDivisionIds.mjs';
import { fetchDocument } from '../server/fetchRampData.mjs';

function handleError(message, error) { console.error(message, error); } // Basic error handling

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
        const document = fetchDocument(tournamentUrl);
        if (!document) return;
        const tournamentList = getTournaments(document);
        res.status(200).json(tournamentList); // Placeholder response
    });

    app.get('/schedule/leagues', (req, res) => {
        getLeagues()
            .then(leagues => res.status(200).json(leagues))
            .catch(error => {
                console.error('Error fetching leagues:', error);
                res.status(500).json({ error: 'Failed to fetch leagues' });
            });
    });

    app.get('/schedule/leagues/:leagueName/divisions', (req, res) => {
        const leagueName = req.params.leagueName;

        getDivisionNames(leagueName)
            .then(divisionNames => res.status(200).json(divisionNames))
            .catch(error => {
                console.error('Error fetching division names:', error);
                res.status(500).json({ error: 'Failed to fetch division names' });
            });
    });

    app.get('/schedule/leagues/:leagueName/divisions/:divisionName/teams', (req, res) => {
        const leagueName = req.params.leagueName;
        const divisionName = req.params.divisionName;

        getTeamNames(leagueName, divisionName)
            .then(teamNames => res.status(200).json(teamNames))
            .catch(error => {
                console.error('Error fetching team names:', error);
                res.status(500).json({ error: 'Failed to fetch team names' });
            });
    });

    app.get('/schedule/leagues/:leagueName/divisions/:divisionName/team/:teamName/games', (req, res) => {
        const divisionName = req.params.divisionName;
        const leagueName = req.params.leagueName;
        const teamName = req.params.teamName;

         getIncompleteGames(leagueName, divisionName, teamName)
            .then(incompleteGames => res.status(200).json(incompleteGames))
            .catch(error => {
                console.error('Error fetching incomplete games:', error);
                res.status(500).json({ error: 'Failed to fetch incomplete games' });
            });
    });

    app.get('/schedule/league/:leagueName/division/:divisionName/divisionId', (req,res) => {
        const leagueName = req.params.leagueName;
        const divisionName = req.params.divisionName;

        getDivisionId(leagueName, divisionName)
        .then(divisionId => res.status(200).json(divisionId))
        .catch(error => {
            console.error('Error fetching divisionId:', error);
            res.status(500).json({ error: 'Failed to fetch divisionId' });
        });    
    });

    // IV. Gamesheet Management (Read-Only)
    app.get('/scoreboard/division/:divisionId/gamesheet/:gamesheetID/status', (req, res) => {
        const divisionName = req.params.divisionName;
        const gamesheetId = req.params.gamesheetId;
        const divisionId = getDivisionId(divisionName);

        getLiveStatus(divisionId, gamesheetId)
        .then(liveStatus => res.status(200).json(liveStatus))
        .catch(error => {
            console.error('Error fetching live status:', error);
            res.status(500).json({ error: 'Failed to fetch live status' });
        });
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