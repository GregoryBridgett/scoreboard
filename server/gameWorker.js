const { parentPort, workerData } = require('worker_threads');
const { scrapeGameData, getGameIdByScoreboardId } = require('./server'); // Assuming server.js is in the same directory
const fetch = require('node-fetch');

const scoreboardId = workerData.scoreboardId;
const thirdPartyUrl = workerData.thirdPartyUrl;

// Initial scraping
try {
  (async () => {
    try {
      const response = await fetch(`${thirdPartyUrl}`, { method: 'POST', body: JSON.stringify({ scoreboardId }), headers: { 'Content-Type': 'application/json' } });
      const data = await response.json();
      const scrapedData = await scrapeGameData(data);
      if (response.ok) {
        const initialData = {
          scoreboardId: scoreboardId,
          gameId: scrapedData.gameId,
          gameStatus: scrapedData.gameStatus,
          homeTeam: scrapedData.homeTeam,
          awayTeam: scrapedData.awayTeam,
          currentPeriod: scrapedData.currentPeriod,
          timeRemaining: scrapedData.timeRemaining,
          homeTeamShots: scrapedData.homeTeamShots,
          awayTeamShots: scrapedData.awayTeamShots,
        };
        parentPort.postMessage({ type: 'initial', data: initialData });
      }
    } catch (error) {
      console.error('Error during initial scraping:', error);
    }
  })();

  // Periodic updates
  setInterval(async () => {
    try {
      const response = await fetch(`${thirdPartyUrl}`, { method: 'POST', body: JSON.stringify({ scoreboardId }), headers: { 'Content-Type': 'application/json' } });
      const data = await response.json();
      const updates = await scrapeGameData(data);
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
      }

      parentPort.postMessage({ 
        type: 'gameDataUpdate', 
        scoreboardId: scoreboardId, 
        data: updateData 
      });
    }
    catch (error) {
      console.error('Error during update scraping:', error);
    }
  }, 5000); // Update every 5 seconds
}
catch (error) {
  console.error('Worker thread error:', error);
}