import { parentPort, workerData } from 'worker_threads';
import { fetchDocument } from './fetchRampData.mjs';
import { getGameInfo } from './processGameSheet.mjs';
import * as dataModel from './dataModel.mjs';
import _ from 'lodash'; // Import Lodash

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
const updateInterval = workerData.updateInterval || 5000; // Default to 5 seconds if updateInterval is not provided.

// Initialize game data variables
let currentGameData; // Will hold the current state of the game data
let previousGameData = _.cloneDeep(dataModel.GameData); // Initialize previousGameData with a copy of the default game data model for initial comparison

// Initial scraping
try {
  (async () => {
    let document; // Declare document with let for reassignment and nullification

    try {
      document = await fetchDocument(gamesheetUrl);
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
    
      // Update currentGameData with the latest fetched data
      
      // TODO: Add code here

      // Deep compare currentGameData with previousGameData to detect changes
      const changedElements = _.reduce(currentGameData, (result, value, key) => {
        // For each property in currentGameData
        if (!_.isEqual(value, previousGameData[key])) {
          // If the value is different from the previous value
          // Add the changed property and its new value to the changedElements object
          result[key] = value;
        }
        return result;
      }, {});

      if (Object.keys(changedElements).length > 0) {        
          // Send the changes to the main thread
          parentPort.postMessage({ type: 'gameDataUpdate', gameId: gameId, data: changedElements });
      }

    } catch (error) {
      console.error('Error during periodic update:', error);
      parentPort.postMessage({ type: 'gameDataError', gameId: gameId, error: error.message }); // Send error message to main thread
    } finally {
      document = null; // Nullify document after use to aid garbage collection
    }

    // Update previousGameData with the current data for the next comparison
    previousGameData = _.cloneDeep(currentGameData); 
  }, updateInterval); 
}
catch (error) {
  console.error('Worker thread error:', error);
}