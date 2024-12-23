const fetch = require('node-fetch');

async function scrapeGameData(gameId) {
  try {
    const response = await fetch(`/gameData?gameId=${gameId}`);
    const data = await response.json();

    // Map the API response to the common data model
    return {
      gameId: gameId, 
      gameStatus: data.status, // Assuming API provides a status
      gameTime: data.gameTime, 
      teams: {
        home: {
          name: data.homeTeam.name,
          score: data.homeTeam.score,
          shots: data.homeTeamShots || 0, // Initialize to 0 if not available
          players: [], // Assuming player data needs to be fetched separately or is not available in this API call
        },
        away: {
          name: data.awayTeam.name,
          score: data.awayTeam.score,
          shots: data.awayTeamShots || 0, // Initialize to 0 if not available
          players: [], // Assuming player data needs to be fetched separately or is not available in this API call
        },
      },
      events: {
        goals: data.goals.map(goal => ({ ...goal, type: 'goal' })), // Add type to differentiate events
        penalties: data.penalties.map(penalty => ({ ...penalty, type: 'penalty' })), // Add type to differentiate events
      },
      // ... other fields from the data model if available in the API response
    };
  } catch (error) {
    console.error('Error fetching game data:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

module.exports = { scrapeGameData };