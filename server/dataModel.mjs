import logger from './logger.mjs';

// Goal class definition
export class PlayerGoalInfo {
  constructor() {
    this.teamName = null;
    this.teamId = null;
    this.time = null;
    this.period = null;
    this.scorerName = null;
    this.scorerNumber = null;
    this.firstAssisterName = null;
    this.firstAssisterNumber = null;
    this.secondAssisterName = null;
    this.secondAssisterNumber = null;
  }
}

export class PlayerPenaltyInfo {
  constructor() {
    this.teamName = null;
    this.teamId = null;
    this.period = null;
    this.time = null;
    this.playerName = null;
    this.playerNumber = null;
    this.penaltyDescription = null;
  }
}

export class GameTimeData {
  constructor() {
    this.period = null;
    this.timeRemaining = null;
    this.homeTeamShots = null;       // Number, Number of shots by home team
    this.awayTeamShots = null;       // Number, Number of shots by away team
    this.homePenalties = [];        // Array of PenaltyTimeData
    this.awayPenalties = [];
  }
}

export class PenaltyTimeData {
  constructor() {
    this.time = null;
    this.playerNumber = null;
  }
}

export class GameData {
  constructor() {
    this.gameSheetId = null;              // String, ID for the game
    this.divisionId = null;
    this.gameNumber = null;
    this.homeTeamId = null;
    this.awayTeamId = null;
    this.gameLocation = null;
    this.homeTeamGoals = null;
    this.awayTeamGoals = null;
    this.homeTeamName = null;
    this.awayTeamName = null;
    this.goals = [];                // Array<Goal>, Goals scored during the game
    this.penalties = [];           // Array<Penalty>, Penalties incurred during the game
  }
}