import { parentPort, workerData } from 'worker_threads';
import { fetchGameSheetList } from './fetchRampData.mjs';
import * as dataModel from './dataModel.mjs';
import _ from 'lodash'; // Import Lodash

const gameId = workerData.gameId;
const thirdPartyUrl = workerData.thirdPartyUrl;

// Initial scraping
try {
  (async () => {
    try {
      const document = await fetchDocument(thirdPartyUrl);
      
      // Create initial data object using the data model (no need for deep copy here)
      const initialData = _.cloneDeep(dataModel.GameData); // Deep copy using Lodash
      initialData.gameId = gameId;
      initialData.gameStatus = gameData.gameStatus;
      initialData.homeTeam = gameData.homeTeam;
      initialData.awayTeam = gameData.awayTeam;
      initialData.currentPeriod = gameData.currentPeriod;
      initialData.timeRemaining = gameData.timeRemaining;
      initialData.homeTeamShots = gameData.homeTeamShots;
      initialData.awayTeamShots = gameData.awayTeamShots;
      // ... add other properties as needed
      
      parentPort.postMessage({ type: 'initial', data: initialData });
    } catch (error) {
      console.error('Error during initial scraping:', error);
    }
  })();

  // Periodic updates
  setInterval(async () => {
    try {
      const currentGameData = await fetchGameSheetList(thirdPartyUrl);

      // Deep copy the current game data
      const newGameData = _.cloneDeep(currentGameData);

      // Calculate the changes (diff)
      const changedElements = {};
      for (const key in newGameData) {
          if (!_.isEqual(newGameData[key], previousGameData[key])) { 
              changedElements[key] = newGameData[key];
          }
      }

      // Send updates only if there are changes
      if (Object.keys(changedElements).length > 0) {
          // Deep copy to update previousGameData
          previousGameData = _.cloneDeep(newGameData); 

          // Send the changes to the main thread
          parentPort.postMessage({ type: 'gameDataUpdate', gameId: gameId, data: changedElements });
      }

    } catch (error) {
      console.error('Error during update scraping:', error);
      parentPort.postMessage({ type: 'gameDataError', gameId: gameId, error: error.message });
    }
  }, 5000); // Update every 5 seconds
}
catch (error) {
  console.error('Worker thread error:', error);
}

let previousGameData = _.cloneDeep(dataModel.GameData); // Initialize with a deep copy