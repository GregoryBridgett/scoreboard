const fetch = require('node-fetch');

async function scrapeGameData(gameId) {
  try {
    const response = await fetch(`/gameData?gameId=${gameId}`);
    const data = await response.json();

    // Assuming the API response structure
    return {
      homeTeamName: data.homeTeam.name,
      awayTeamName: data.awayTeam.name,
      homeTeamScore: data.homeTeam.score,
      awayTeamScore: data.awayTeam.score,
      gameTime: data.gameTime,
      goals: data.goals,
      penalties: data.penalties,
    };
  } catch (error) {
    console.error('Error fetching game data:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

module.exports = { scrapeGameData };