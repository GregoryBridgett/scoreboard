import { PlayerGoalInfo, GameData, PlayerPenaltyInfo } from './dataModel.mjs';

/**
 * Extracts scoring play data from the provided HTML document.
 *
 * @param {Document} document - The HTML document to extract data from.
 * @returns {Array<object>} An array of scoring play objects.
 */
export function extractScoringPlaysData(document) {
  const scoringPlays = [];

  // Find the table following the "Scoring Summary" h3 tag
  const scoringSummaryHeading = Array.from(document.querySelectorAll('h3')).find(h3 => h3.textContent.trim() === 'Scoring Summary'
  );

  if (scoringSummaryHeading) {
    const scoringTable = scoringSummaryHeading.nextElementSibling;
    if (scoringTable && scoringTable.tagName === 'TABLE') {
      const rows = scoringTable.querySelectorAll('tbody tr');

      let period = null;
      for (const row of rows) {
        // Check if the row represents a period header
        const periodHeaderMatch = row.textContent.trim().match(/^Period (\d+)$/);
        if (periodHeaderMatch) {
          period = periodHeaderMatch[1];
          continue; // Skip processing this row if it's a period header
        }

        // Extract team information
        const teamLink = row.querySelector('a[href^="/team/"]');
        const teamName = teamLink ? teamLink.textContent.trim() : null;
        const teamId = teamName ? teamLink.href.match(/team\/.*\/(\d+)$/)[1] : null;

        // Extract goal time
        const goalTimeMatch = row.textContent.match(/\bat\s*(\d{1,2}:\d{2})\b/);
        const time = goalTimeMatch ? goalTimeMatch[1] : null;

        // Extract scorer name from the second link
        const links = row.querySelectorAll('a[href*="/player/"]');
        const scorerName = links.length > 0 ? links[0].textContent.trim() : null; // Assuming scorer is the first link
        const scorerIdMatch = scorerName ? links[0].href.match(/player\/(\d+)$/) : null; //Updated to user links[0]
        const scorerId = scorerIdMatch ? scorerIdMatch[1] : null; // Extract scorer ID

        const firstAssisterName = links.length > 1 ? links[1].textContent.trim() : null;
        const firstAssisterIdMatch = firstAssisterName ? links[1].href.match(/player\/(\d+)$/) : null;
        const firstAssisterId = firstAssisterIdMatch ? firstAssisterIdMatch[1] : null;

        const secondAssisterName = links.length > 2 ? links[2].textContent.trim() : null;
        const secondAssisterIdMatch = secondAssisterName ? links[2].href.match(/player\/(\d+)$/) : null;
        const secondAssisterId = secondAssisterIdMatch ? secondAssisterIdMatch[1] : null;

        // Create scoring play object
        const scoringPlay = new PlayerGoalInfo(); 
        scoringPlay.teamName = teamName;
        scoringPlay.teamId = teamId;
        scoringPlay.time = time;
        scoringPlay.period = period; 
        scoringPlay.scorerName = scorerName;
        scoringPlay.scorerNumber = scorerId; // No scorer number available in the HTML
        scoringPlay.firstAssisterName = firstAssisterName;
        scoringPlay.firstAssisterNumber = firstAssisterId; // No assister number available in the HTML
        scoringPlay.secondAssisterName = secondAssisterName;
        scoringPlay.secondAssisterNumber = secondAssisterId; // No assister number available in the HTML
        
        scoringPlays.push(scoringPlay);
      }
    }
  }
  return scoringPlays;
}

/**
 * Extracts penalty data from the provided HTML document.
 *
 * @param {Document} document - The HTML document to extract data from.
 * @returns {Array<object>} An array of penalty objects.
 */
export function extractPenaltyData(document) {
  const penaltyData = [];

  // Find the table following the "Scoring Summary" h3 tag
  const penaltySummaryHeading = Array.from(document.querySelectorAll('h3')).find(h3 => h3.textContent.trim() === 'Penalty Summary'
  );

  if (penaltySummaryHeading) {
    const penaltyTable = penaltySummaryHeading.nextElementSibling;
    if (penaltyTable && penaltyTable.tagName === 'TABLE') {
      const rows = penaltyTable.querySelectorAll('tbody tr');

      let period = null;
      for (const row of rows) {
        // Check if the row represents a period header
        const periodHeaderMatch = row.textContent.trim().match(/^Period (\d+)$/);
        if (periodHeaderMatch) {
          period = periodHeaderMatch[1];
          continue; // Skip processing this row if it's a period header
        }

        // Extract team information
        const teamLink = row.querySelector('a[href^="/team/"]');
        const teamName = teamLink ? teamLink.textContent.trim() : null;
        const teamId = teamName ? teamLink.href.match(/team\/.*\/(\d+)$/)[1] : null;

        // Extract penalty time
        const penaltyTimeMatch = row.textContent.match(/\bat\s*(\d{1,2}:\d{2})\b/);
        const time = penaltyTimeMatch ? penaltyTimeMatch[1] : null;

        // Extract player name from the second link
        const links = row.querySelectorAll('a[href*="/player/"]');
        const playerName = links.length > 0 ? links[0].textContent.trim() : null; // Assuming player is the first link
        const playerIdMatch = playerName ? links[0].href.match(/player\/(\d+)$/) : null; //Updated to user links[0]
        const playerId = playerIdMatch ? playerIdMatch[1] : null; // Extract player ID


        // Extract penalty name
        console.log(links[0].textContent);
        const penaltyNameMatch = playerId ? row.textContent.match(/.*for (.*)/) : null;
        const penaltyDescription = penaltyNameMatch ? penaltyNameMatch[1].trim() : null;

        // Create scoring play object
        const penalty = new PlayerPenaltyInfo();
        penalty.teamName = teamName;
        penalty.teamId = teamId;
        penalty.time = time;
        penalty.period = period;
        penalty.playerName = playerName;
        penalty.playerNumber = playerId; // No player number available in the HTML
        penalty.penaltyDescription = penaltyDescription;

        penaltyData.push(penalty);
      }
    }
  }
  return penaltyData;
}

/**
 * Extracts the current game data from the provided HTML document.
 *
 * @param {Document} document - The HTML document to extract data from.
 * @returns {object} An object containing the current game data.
 */
export function getScoreData(document) {
  const homeScoreElement = document.getElementById('homeGoalClock');
  const awayScoreElement = document.getElementById('awayGoalClock');

  const homeScore = homeScoreElement ? parseInt(homeScoreElement.textContent.trim(), 10) : 0;
  const awayScore = awayScoreElement ? parseInt(awayScoreElement.textContent.trim(), 10) : 0;

  return {
    homeScore,
    awayScore,
  };
}

/**
 * Extracts game information from the provided HTML document.
 *
 * @param {Document} document - The HTML document to extract data from.
 * @returns {object} An object containing the extracted game information.
 */
export function getGameInfo(document) {
  const gameData = new GameData();

  const scheduleTable = document.getElementById('tblSchedule');
  if (scheduleTable) {
    const rows = scheduleTable.querySelectorAll('tbody tr');
    if (rows.length > 0) { // Check if there's at least one data row (excluding header)
      const dataRow = rows[0]; // Get the first data row
      const columns = dataRow.querySelectorAll('td');

      // Assuming the order of columns is: gameNumber, gameDate, gameLocation, homeTeamName, awayTeamName
      if (columns.length === 5) {
        gameData.gameNumber = columns[0].textContent.trim();
        gameData.gameDate = columns[1].textContent.trim();
        gameData.gameLocation = columns[2].textContent.trim();
        gameData.homeTeamName = columns[3].textContent.trim();
        gameData.awayTeamName = columns[4].textContent.trim();
      } else {
        console.warn('Unexpected number of columns in schedule table row.');
      }
    } else {
      console.warn('No data rows found in schedule table.');
    }
  } else {
    console.warn('Schedule table not found.');
  }
  gameData.goals = [];
  gameData.penalties = [];
  return gameData;
}