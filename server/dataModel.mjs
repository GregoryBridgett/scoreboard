// Goal object definition
const PlayerGoalInfo = {
  teamName: null,
  teamId: null,
  time: null,
  period: null,
  scorerName: null,
  scorerNumber: null,
  firstAssisterName: null,
  firstAssisterNumber: null,
  secondAssisterName: null,
  secondAssisterNumber: null
};

const PlayerPenaltyInfo = {
  teamName: null,
  teamId: null,
  period: null,
  time: null,
  playerName: null,
  playerNumber: null,
  penaltyDescription: null
}

const GameTimeData = {
  period: null,
  timeRemaining: null,
  homeTeamShots: null,       // Number, Number of shots by home team
  awayTeamShots: null,       // Number, Number of shots by away team
  homePenalties: [],        // Array of PenaltyTimeData
  awayPenalties: []
}

const PenaltyTimeData = {
  time: null,
  playerNumber: null
}

// GameData object definition
const GameData = {
  gameSheetId: null,              // String, ID for the game
  divisionId: null,
  gameNumber: null,
  homeTeamId: null,
  awayTeamId: null,
  gameLocation: null,
  homeTeamGoals: null,
  awayTeamGoals: null,
  homeTeamName: null,
  awayTeamName: null,
  goals: [],                // Array<Goal>, Goals scored during the game
  penalties: [],           // Array<Penalty>, Penalties incurred during the game
};

// Export the object definitions
module.exports = {
    GameTimeData, 
    PenaltyTimeData,
    PlayerGoalInfo,
    PlayerPenaltyInfo,
    GameData,
};