import { parentPort, workerData } from 'worker_threads';
import { fetchDocument } from './fetchRampData.mjs';
import { getGameInfo } from './processGameSheet.mjs';
import * as dataModel from './dataModel.mjs';
import { isEqual } from 'lodash-es'; 

/**
 * This worker thread monitors a Ramp Rosters online gamesheet and reports changes in game data to the main thread. 
 * 
 * It initializes by fetching the initial game data, then periodically checks for updates.  
 * When changes are detected, it sends only the changed elements back to the main thread.
 * 
 * Resource management:
 * - The 'document' variable, which holds the fetched HTML document, is nullified after use to aid garbage collection.
 * 
 * Dependencies:
 * - worker_threads: For communication with the main thread.
 * - fetchRampData.mjs: For fetching the HTML gamesheet.
 * - processGameSheet.mjs: For parsing the gamesheet and extracting game data.
 * - dataModel.mjs: Provides the data model for storing game information.
 * - lodash: Used for deep comparison and cloning of objects.
 */

// Initialize game-related data from workerData
const gamesheetId = workerData.gamesheetId;
const divisionId = workerData.divisionId;
const gamesheetUrl = workerData.gamesheetUrl;
const updateInterval = workerData.updateInterval || 15000; // Default to 15 seconds if updateInterval is not provided.

// Initialize game data variables
let currentGameData = { ...dataModel.GameData }; // Will hold the current state of the game data
let previousGameData = { ...dataModel.GameData }; // Initialize previousGameData with a copy of the default game data model for initial comparison

// Initial scraping
try {
  (async () => {
    let document; // Declare document with let for reassignment and nullification

    try {
      document = await fetchDocument(gamesheetUrl);
      // Validate document.
      if (!document) {
          // Handle case where document is not correctly populated
          console.error("Failed to fetch or parse the document.");
          return; // Or throw an error
      }
      
      const gameInfo = getGameInfo(document);

      // Initialize currentGameData with the initial scrape
      previousGameData.gameNumber = gameInfo.gameNumber;
      previousGameData.gamesheetId = gamesheetId;
      previousGameData.divisionId = divisionId;
      previousGameData.homeTeamName = gameInfo.homeTeamName;
      previousGameData.awayTeamName = gameInfo.awayTeamName;
      previousGameData.gameLocation = gameInfo.gameLocation;
      previousGameData.homeTeamGoals = 0;
      previousGameData.awayTeamGoals = 0;

      parentPort.postMessage({ type: 'gameDataUpdate', data: previousGameData });

    } catch (error) {
      console.error('Error during initial scraping:', error);
    } finally {
      document = null; // Nullify document after use
    }
  })();

  // Periodic updates
  setInterval(async () => {
    let document; // Declare document with let for reassignment and nullification

    try {
      document = await fetchDocument(gamesheetUrl);
      const gameInfo = getGameInfo(document);

      // Update goals, sending new goals to main thread and updating existing ones
      if (Array.isArray(gameInfo.goals)) {
        if (!Array.isArray(currentGameData.goals)) {
          currentGameData.goals = [];
        }

        for (let i = 0; i < gameInfo.goals.length; i++) {
          const newGoal = gameInfo.goals[i];
          if (i >= currentGameData.goals.length) {
            // New goal, send to main thread
            parentPort.postMessage({ type: 'newGoal', gameId: gamesheetId, data: newGoal });
            currentGameData.goals.push(newGoal);
          } else {
            // Existing goal, update if changed
            if (!isEqual(currentGameData.goals[i], newGoal)) {
              currentGameData.goals[i] = newGoal;
              parentPort.postMessage({ type: 'updatedGoal', gameId: gamesheetId, data: newGoal });
            }
          }
        }
      }

      // Update penalties, sending new penalties to main thread and updating existing ones
      if (Array.isArray(gameInfo.penalties)) {
        if (!Array.isArray(currentGameData.penalties)) {
          currentGameData.penalties = [];
        }

        for (let i = 0; i < gameInfo.penalties.length; i++) {
          const newPenalty = gameInfo.penalties[i];
          if (i >= currentGameData.penalties.length) {
            // New penalty, send to main thread
            parentPort.postMessage({ type: 'newPenalty', gameId: gamesheetId, data: newPenalty });
            currentGameData.penalties.push(newPenalty);
          } else {
            // Existing penalty, update if changed
            if (!isEqual(currentGameData.penalties[i], newPenalty)) {
              currentGameData.penalties[i] = newPenalty;
              parentPort.postMessage({ type: 'updatedPenalty', gameId: gamesheetId, data: newPenalty });
            }
          }
        }

        // Update currentGameData's penalties array
        currentGameData.penalties = gameInfo.penalties;
      } else if (Array.isArray(gameInfo.penalties)) { //For cases where current game penalties is null
        currentGameData.penalties = gameInfo.penalties;
      }

      currentGameData.awayTeamGoals = gameInfo.awayTeamGoals;
      currentGameData.homeTeamGoals = gameInfo.homeTeamGoals;

      // Compare goals and send message if changed
      if (currentGameData && previousGameData &&
        (currentGameData.awayTeamGoals !== previousGameData.awayTeamGoals ||
          currentGameData.homeTeamGoals !== previousGameData.homeTeamGoals)) {
        previousGameData.awayTeamGoals = currentGameData.awayTeamGoals;
        previousGameData.homeTeamGoals = currentGameData.homeTeamGoals;
        parentPort.postMessage({
          type: 'goalsUpdated',
          gameId: gameId,
          data: { awayTeamGoals: currentGameData.awayTeamGoals, homeTeamGoals: currentGameData.homeTeamGoals }
        });
      }

    } catch (error) {
      console.error('Error during periodic update:', error);
      parentPort.postMessage({ type: 'gameDataError', gamesheetId: gameId, error: error.message }); // Send error message to main thread
    } finally {
      document = null; // Nullify document after use to aid garbage collection
    }
  }, updateInterval);
}
catch (error) {
  console.error('Worker thread error:', error);
}