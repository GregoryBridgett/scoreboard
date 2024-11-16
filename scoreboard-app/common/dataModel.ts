interface Goal {
    scorer: string;
    team: string;
    time: string;
    period: number;
    utcTimestamp: number;
  }
  
  interface GameData {
    homeTeamName: string;
    awayTeamName: string;
    homeTeamScore: number;
    awayTeamScore: number;
    gameTime: string;
    homeTeamShots: number;
    awayTeamShots: number;
    gamePeriod: string;
    goals: Goal[];
    gameStatus: string;
  }
  
  export default GameData;
  