import { parentPort, workerData } from 'worker_threads';
import { fetchDocument } from './fetchRampData.mjs';
import { getGameInfo, extractPenaltyData, extractScoringPlaysData, getScoreData } from './processRampGameSheet.mjs';
import * as dataModel from './dataModel.mjs';
import { isEqual } from 'lodash-es';
/**
 * This worker thread monitors a Ramp online gamesheet and reports changes in game data to the main thread. 
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
let previousGameData = new dataModel.GameData(); // Will hold the previous state of the game data for comparison

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

      // Initialize previousGameData with the initial scrape
      Object.assign(previousGameData, gameInfo, {
        gamesheetId: gamesheetId,
        divisionId: divisionId,
        homeTeamGoals: 0, 
        awayTeamGoals: 0,
        goals: [],
        penalties: []
      });

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
      
      const newGoals = extractScoringPlaysData(document);
      const newPenalties = extractPenaltyData(document);
      const newScoreData = getScoreData(document)

      const changedData = {};

      // Check for changes in goals and penalties
      if (!isEqual(previousGameData.goals, newGoals)) {
          changedData.goals = newGoals;
      }
      if (!isEqual(previousGameData.penalties, newPenalties)) {
          changedData.penalties = newPenalties;
      }

      // Check for score changes
      if (previousGameData.awayTeamGoals !== newScoreData.awayTeamGoals) {
          changedData.awayTeamGoals = newScoreData.awayTeamGoals;
      }
      if (previousGameData.homeTeamGoals !== newScoreData.homeTeamGoals) {
          changedData.homeTeamGoals = newScoreData.homeTeamGoals;
      }

      // If there are changes, send gameDataUpdate message with only the changes
      if (Object.keys(changedData).length > 0) {
        parentPort.postMessage({
          type: 'gameDataUpdate',
          gameId: gamesheetId,          
          data: changedData
        });
        // Update previousGameData with the new values
        previousGameData.goals = [...newGoals];
        previousGameData.penalties = [...newPenalties];
        previousGameData.awayTeamGoals = newScoreData.awayTeamGoals;
        previousGameData.homeTeamGoals = newScoreData.homeTeamGoals;
      }

    } catch (error) {
      console.error('Error during periodic update:', error);
      // parentPort.postMessage({ type: 'gameDataError', gamesheetId: gamesheetId, error: error.message }); // Send error message to main thread if needed
    } finally {
      document = null; // Nullify document after use to aid garbage collection
    }
  }, updateInterval);
}
catch (error) {
  console.error('Worker thread error:', error);
}