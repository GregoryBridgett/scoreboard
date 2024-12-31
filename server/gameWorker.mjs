import { parentPort, workerData } from 'worker_threads';
import { fetchDocument, getLiveStatus } from './fetchRampData.mjs';
import { getGameInfo, extractPenaltyData, extractScoringPlaysData, getScoreData } from './processRampGameSheet.mjs';
import * as dataModel from './dataModel.mjs';
import { isEqual } from 'lodash-es';
import logger from './logger.mjs';
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
const gamesheetUrl = workerData.gamesheetUrl;
const updateInterval = workerData.updateInterval || 15000; // Default to 15 seconds if updateInterval is not provided.
let isUpdating = false; 

async function startMonitoring() {
  let previousGameData = new dataModel.GameData();

  // First wait until the game goes live
  while (true) {
    try {
      const isLive = await getLiveStatus(gamesheetUrl);
      if (isLive) {
        logger.info({ module: 'gameWorker', function: 'startMonitoring' }, 'Gamesheet is live. Starting monitoring.');
        break; 
      } else {
        logger.info({ module: 'gameWorker', function: 'startMonitoring' }, 'Gamesheet is not live. Waiting...');
        await new Promise(resolve => setTimeout(resolve, updateInterval)); 
      }
    } catch (error) {
      logger.error({ module: 'gameWorker', function: 'startMonitoring', error }, 'Error checking live status');
      await new Promise(resolve => setTimeout(resolve, updateInterval));
    }
  }

  // Then get all of the initial data
  try {
    let document = await fetchDocument(gamesheetUrl);
    
    if (!document) {
      logger.error({ module: 'gameWorker', function: 'startMonitoring' }, "Failed to fetch or parse the document.");
      return;
    }

    const gameInfo = getGameInfo(document);

    Object.assign(previousGameData, gameInfo, {
      homeTeamGoals: 0,
      awayTeamGoals: 0,
      goals: [],
      penalties: []
    });

    parentPort.postMessage({ type: 'gameDataUpdate', data: previousGameData });
    document = null;

  } catch (error) {
    logger.error({ module: 'gameWorker', function: 'startMonitoring', error }, 'Error during initial scraping');
  }

  // Then perform periodic web scraping
  setInterval(async () => {
    if (!isUpdating) {
      isUpdating = true; 
      let document;

      try {
        document = await fetchDocument(gamesheetUrl);
        
        const newGoals = extractScoringPlaysData(document);
        const newPenalties = extractPenaltyData(document);
        const newScoreData = getScoreData(document);

        const changedData = {};

        if (!isEqual(previousGameData.goals, newGoals)) {
          changedData.goals = newGoals;
        }
        if (!isEqual(previousGameData.penalties, newPenalties)) {
          changedData.penalties = newPenalties;
        }

        if (previousGameData.awayTeamGoals !== newScoreData.awayTeamGoals) {
          changedData.awayTeamGoals = newScoreData.awayTeamGoals;
        }
        if (previousGameData.homeTeamGoals !== newScoreData.homeTeamGoals) {
          changedData.homeTeamGoals = newScoreData.homeTeamGoals;
        }

        if (Object.keys(changedData).length > 0) {
          parentPort.postMessage({
            type: 'gameDataUpdate',
            gameId: gamesheetId,
            data: changedData
          });

          previousGameData.goals = [...newGoals];
          previousGameData.penalties = [...newPenalties];
          previousGameData.awayTeamGoals = newScoreData.awayTeamGoals;
          previousGameData.homeTeamGoals = newScoreData.homeTeamGoals;
        }

      } catch (error) {
        logger.error({ module: 'gameWorker', function: 'startMonitoring', error }, 'Error during periodic update');
      } finally {
        document = null;
        isUpdating = false; 
      }
    }
  }, updateInterval);
}

// Start the monitoring process
try {
  startMonitoring();
} catch (error) {
  logger.error({ module: 'gameWorker', error }, 'Worker thread error');
}