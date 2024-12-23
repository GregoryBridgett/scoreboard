const { parentPort, workerData } = require('worker_threads');
const { scrapeGameData, getGameIdByScoreboardId } = require('./server'); // Assuming server.js is in the same directory
const fetch = require('node-fetch');

const scoreboardId = workerData.scoreboardId;

// Initial scraping
(async () => {
  try {
    const response = await fetch(`http://localhost:3000/getGameId/${scoreboardId}`);
    const { gameId } = await response.json();
    
    const initialData = await scrapeGameData(gameId);    
    parentPort.postMessage({ type: 'initial', data: initialData, scoreboardId });
  } catch (error) {
    console.error('Error during initial scraping:', error);
  }
})();

// Periodic updates
setInterval(async () => {
  try {
    const response = await fetch(`http://localhost:3000/getGameId/${scoreboardId}`);
    const { gameId } = await response.json();
    
    if (gameId) {
      const updates = await scrapeGameData(gameId);
      const updateData = {
        scores: updates.scores,
        goals: updates.goals,
        penalties: updates.penalties,
      };
      parentPort.postMessage({ type: 'update', data: updateData, scoreboardId });
    }
  } catch (error) {
    console.error('Error during update scraping:', error);
  }
}, 5000); // Update every 5 seconds