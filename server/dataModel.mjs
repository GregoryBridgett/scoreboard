// Goal object definition
const PlayerGoal = {
  teamName: null,
  teamId: null,
  time: null,
  period: null,
  scorerName: null,
  scorerId: null,
  firstAssisterName: null,
  firstAssisterId: null,
  secondAssisterName: null,
  secondAssisterId: null
};

const PlayerPenalty = {
  teamName: null,
  teamId: null,
  time: null,
  period: null,
  playerName: null,
  playerId: null,
  penaltyDescription: null
}

// GameData object definition
const GameData = {
  scoreboardId: null,       // String, ID for the scoreboard
  divisionId: null,
  gameSheetId: null,              // String, ID for the game
  homeTeamGoals: null,
  awayTeamGoals: null,
  homeTeamShots: null,       // Number, Number of shots by home team
  awayTeamShots: null,       // Number, Number of shots by away team
  period: null,
  timeRemaining: null,
  homeTeamName: null,
  homeTeamBgColor: null,
  homeTeamFgColor: null,
  awayTeamName: null,
  awayTeamBgColor: null,
  awayTeamFgColor: null,
  goals: [],                // Array<Goal>, Goals scored during the game
  penalties: [],           // Array<Penalty>, Penalties incurred during the game
};

// Export the object definitions
module.exports = {
    PlayerGoal,
    PlayerPenalty,
    GameData,
};