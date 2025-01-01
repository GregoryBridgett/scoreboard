// apiRoutes.mjs
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { getDivisionNames, getIncompleteGames, getLeagues, getTeamNames, getDivisionId, getTournaments, getLiveStatus } from '../server/getRampDivisionIds.mjs';
import { logger } from '../server/server.mjs'; 
import { fetchDocument } from '../server/fetchRampData.mjs';

export default function configureRoutes(app, connectionManager) {

    // I. Client and UI Registration (Management)
    app.get('/client/overlay/:scoreboardID', (req, res) => {
        // const scoreboardID = req.params.scoreboardID;
        const filePath = path.join(__dirname, '..', 'overlay', 'overlay.html');

        res.sendFile(filePath, (err) => {
            if (err) {
                logger.error({ module: 'apiRoutes', function: 'app.get_client_overlay', message: 'Error sending file:', error: err });
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
            logger.error({ module: 'apiRoutes', function: 'app.post_client_overlay', message: 'Error registering client:', error });
            return res.status(500).json({ error: 'Failed to register client' });
        }
    });

    app.get('/client/ui/:scoreboardID', (req, res) => {
        // const scoreboardID = req.params.scoreboardID;
        const filePath = path.join(__dirname, '..', 'ui', 'ui.html');

        res.sendFile(filePath, (err) => {
            if (err) {
                logger.error({ module: 'apiRoutes', function: 'app.get_client_ui', message: 'Error sending file:', error: err });
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
            logger.error({ module: 'apiRoutes', function: 'app.post_client_ui', message: 'Error registering client:', error });
            return res.status(500).json({ error: 'Failed to register client' });
        }
    });

    // II. Real-time Event Stream (SSE)
    app.get('/scoreboard/:scoreboardId/:clientID/events', (req, res) => {
        const scoreboardId = req.params.scoreboardId
        const clientId = req.params.clientId

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
                logger.error({ module: 'apiRoutes', function: 'app.get_schedule_leagues', message: 'Error fetching leagues:', error });
                res.status(500).json({ error: 'Failed to fetch leagues' });
            });
    });

    app.get('/schedule/leagues/:leagueName/divisions', (req, res) => {
        const leagueName = req.params.leagueName;

        getDivisionNames(leagueName)
            .then(divisionNames => res.status(200).json(divisionNames))
            .catch(error => {
                logger.error({ module: 'apiRoutes', function: 'app.get_schedule_leagues_divisions', message: 'Error fetching division names:', error });
                res.status(500).json({ error: 'Failed to fetch division names' });
            });
    });

    app.get('/schedule/leagues/:leagueName/divisions/:divisionName/teams', (req, res) => {
        const leagueName = req.params.leagueName;
        const divisionName = req.params.divisionName;

        getTeamNames(leagueName, divisionName)
            .then(teamNames => res.status(200).json(teamNames))
            .catch(error => {
                logger.error({ module: 'apiRoutes', function: 'app.get_schedule_leagues_divisions_teams', message: 'Error fetching team names:', error });
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
                logger.error({ module: 'apiRoutes', function: 'app.get_schedule_leagues_divisions_team_games', message: 'Error fetching incomplete games:', error });
                res.status(500).json({ error: 'Failed to fetch incomplete games' });
            });
    });

    app.get('/schedule/league/:leagueName/division/:divisionName/divisionId', (req, res) => {
        const leagueName = req.params.leagueName;
        const divisionName = req.params.divisionName;

        getDivisionId(leagueName, divisionName)
            .then(divisionId => res.status(200).json(divisionId))
            .catch(error => {
                logger.error({ module: 'apiRoutes', function: 'app.get_schedule_league_division_divisionId', message: 'Error fetching divisionId:', error });
                res.status(500).json({ error: 'Failed to fetch divisionId' });
            });
    });

    // IV. Gamesheet Management 
    app.get('/scoreboard/division/:divisionId/gamesheet/:gamesheetID/livestatus', (req, res) => {
        const divisionName = req.params.divisionName;
        const gamesheetId = req.params.gamesheetId;
        const divisionId = getDivisionId(divisionName);

        getLiveStatus(divisionId, gamesheetId)
            .then(liveStatus => res.status(200).json(liveStatus))
            .catch(error => {
                logger.error({ module: 'apiRoutes', function: 'app.get_scoreboard_division_gamesheet_livestatus', message: 'Error fetching live status:', error });
                res.status(500).json({ error: 'Failed to fetch live status' });
            });
    });

    app.post('/scoreboard/:scoreboardId/division/:divisionId/gamesheet/:gamesheetId/live', (req, res) => {
        const scoreboardID = req.params.scoreboardId;
        const gamesheetID = req.body.gamesheetId; 
        const divisionID = req.body.divisionId;

        try {
            // Update the connectionManager or gameManager with the game details
            connectionManager.liveScoreboardGameDetails(scoreboardID, gamesheetID, divisionID);

            res.status(200).json({ message: 'Game details updated for scoreboard' });
        } catch (error) {
            logger.error({ module: 'apiRoutes', function: 'app.post_scoreboard_division_gamesheet_live', message: 'Error updating game details:', error });
            res.status(500).json({ error: 'Failed to update game details' });
        }
    });

    // V. Scoreboard Control (Write Operations)
    app.put('/scoreboard/:scoreboardID/score/:homeaway/:score', (req, res) => {
        const scoreboardID = req.params.scoreboardID;

        try {
            connectionManager.broadcastGameUpdate(scoreboardID);
            res.status(200).json({ message: 'Score update broadcasted' });
        } catch (error) {
            logger.error({ module: 'apiRoutes', function: 'app.put_scoreboard_score', message: 'Error updating score:', error });
            res.status(500).json({ error: 'Failed to update score' });
        }
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