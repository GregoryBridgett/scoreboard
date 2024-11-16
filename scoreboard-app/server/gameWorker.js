const { parentPort, workerData } = require('worker_threads');
const { scrapeGameData, getGameIdByScoreboardId } = require('./server'); // Assuming server.js is in the same directory
const fetch = require('node-fetch');

const scoreboardId = workerData.scoreboardId;

// Initial scraping
(async () => {
  try {
    const response = await fetch(`http://localhost:3000/getGameId/${scoreboardId}`);
    const { gameId } = await response.json();
    
    const scrapedData = await scrapeGameData(gameId); 
    const initialData = {
      gameId: gameId,
      scoreboardId: scoreboardId,
      gameStatus: scrapedData.gameStatus,
      homeTeam: scrapedData.homeTeam,
      awayTeam: scrapedData.awayTeam,
      currentPeriod: scrapedData.currentPeriod,
      timeRemaining: scrapedData.timeRemaining,
      homeTeamShots: scrapedData.homeTeamShots,
      awayTeamShots: scrapedData.awayTeamShots,
    };   
    parentPort.postMessage({ type: 'initial', data: initialData });
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
        gameStatus: updates.gameStatus,
        homeScore: updates.homeScore,
        awayScore: updates.awayScore,
        currentPeriod: updates.currentPeriod,
        timeRemaining: updates.timeRemaining,
        homeTeam: updates.homeTeam,
        awayTeam: updates.awayTeam,
        homeTeamShots: updates.homeTeamShots,
        awayTeamShots: updates.awayTeamShots,
        events: updates.events // Assuming events include goals and penalties
      };
      parentPort.postMessage({ type: 'update', data: updateData, scoreboardId: scoreboardId });
    }
  } catch (error) {
    console.error('Error during update scraping:', error);
  }
}, 5000); // Update every 5 seconds