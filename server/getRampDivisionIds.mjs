import { handleError } from './handleError.mjs';
import { fetchDocument } from './fetchRampData.mjs';

/**
 * Retrieves the division ID from the Ringette Ontario website.
 *
 * @param {string} leagueText - The league name to search for.
 * @param {string} divisionText - The division name to search for within the league.
 * @returns {string|null} The division ID if found, otherwise null.
 *
 * This function fetches the Ringette Ontario website HTML, then:
 * 1. Finds the league list item containing `leagueText`.
 * 2. Finds the division link within that list item containing `divisionText`.
 * 3. Extracts the division ID from the link's href attribute.
 */
export async function getDivisionId(leagueText, divisionText) {
  const document = await fetchDocument();  // Directly use fetchDocument

  if (!document) {
    console.error('Document not available.');
    return null; // Or throw an error
  }

  const leagueListItem = Array.from(document.querySelectorAll('li')).find(li => li.textContent.includes(leagueText)
  );
  if (!leagueListItem) {
    handleError(`List item containing "${leagueText}" not found`, new Error("League list item not found"));
    return null;
  }

  const divisionLink = Array.from(leagueListItem.querySelectorAll('a')).find(a => a.textContent.trim() === divisionText
  );
  if (!divisionLink) {
    handleError(`Link for division "${divisionText}" not found`, new Error("Division link not found"));
    return null;
  }

  const href = divisionLink.href;
  const hrefNumber = href.match(/#div_(\d+)/)?.[1];
  if (!hrefNumber) {
    handleError(`Could not extract href number from "${href}"`, new Error("Invalid href format"));
    return null;
  }
  return hrefNumber;
}
/**
 * Retrieves the current season ID from the Ringette Ontario website.
 *
 * @returns {string|null} The current season ID if found, otherwise null.
 *
 * @throws {Error} If the 'ddlSeason' dropdown element is not found on the page.
 */
export async function getCurrentSeasonId() {
  // Find the selected option in the ddlSeason dropdown
  /*const document = await fetchDocument();  // Directly use fetchDocument

  if (!document) {
    console.error('Document not available.');
    return null; // Or throw an error
  }
  const seasonDropdown = document.querySelector('[name="ddlSeason"]');

  if (!seasonDropdown) {
    console.error("Error: Element with name 'ddlSeason' not found on the page.");
  }
  const selectedSeasonOption = seasonDropdown.querySelector('option[selected]');
  return selectedSeasonOption ? selectedSeasonOption.value : null;
  */
  return '10661';
}

/**
 * Retrieves the list of tournaments and their associated URLs from the Ringette Ontario website.
 *
 * @returns {Array<Object>} An array of objects, where each object has 'name' and 'url' properties.
 */
export async function getTournaments() {
  const document = await fetchDocument();  // Directly use fetchDocument

  if (!document) {
    console.error('Document not available.');
    return null; // Or throw an error
  }
  const tournaments = [];
  const table = document.getElementById('tblPlayers');

  if (table) {
    const rows = table.querySelectorAll('tbody tr');

    rows.forEach(row => {
      if (!row.classList.contains('cf')) { // Skip header rows
        const link = row.querySelector('a');
        if (link) {
          tournaments.push({
            name: link.textContent.trim(),
            url: link.href.replace(/^.*\/\/[^\/]+/, '') // Make URL relative to base URL
          });
        } else {
          console.warn('Row without an <a> tag found:', row.outerHTML);
        }
      }
    });
  } else {
    handleError('Table with id "tblPlayers" not found', new Error('Table not found'));
  }
  return tournaments;
}

/**
 * Retrieves an array of league names from the Ringette Ontario website.
 *
 * @returns {Array<string>} An array of league names.
 */
export async function getLeagues() {
  const document = await fetchDocument();  // Directly use fetchDocument

  if (!document) {
    console.error('Document not available.');
    return null; // Or throw an error
  }

  const leagueElements = document.querySelectorAll('#navbar-collapse-2 > ul > li > a');

  const leagues = [];
  leagueElements.forEach(element => {
    const leagueName = element.textContent.replace(/<b class="caret"><\/b>/, '').trim();
    if (leagueName) { // Check if leagueName is not empty or whitespace
      leagues.push(leagueName);
    }
  });

  return leagues;
}

/**
 * Retrieves an array of division names from the Ringette Ontario website.
 *
 * @param {string} leagueName - The name of the league to get divisions for.
 * @returns {Array<string>} An array of division names.
 */
export async function getDivisionNames(leagueName) {
  const document = await fetchDocument();  // Directly use fetchDocument

  if (!document) {
    console.error('Document not available.');
    return null; // Or throw an error
  }
  // Find the league element
  const leagueElement = Array.from(document.querySelectorAll('#navbar-collapse-2 > ul > li > a')).find(
    a => a.textContent.trim() === leagueName
  );

  if (!leagueElement) {
    handleError(`League element for "${leagueName}" not found`, new Error("League element not found"));
    return [];
  }

  // Find the division elements within the league's section
  const divisionElements = leagueElement.closest('li').querySelectorAll('.panel-group.row h4 a');

  // Extract the division names
  const divisionNames = Array.from(divisionElements).map(a => a.textContent.trim());

  return divisionNames;
}

/**
 * Retrieves an array of team names for a given division from the Ringette Ontario website.
 *
 * @param {string} leagueName - The name of the league.
 * @param {string} divisionName - The name of the division.
 * @returns {Array<string>} An array of team names.
 */
export async function getTeamNames(leagueName, divisionName) {
  const document = await fetchDocument();  // Directly use fetchDocument

  if (!document) {
    console.error('Document not available.');
    return null; // Or throw an error
  }
  const divisionId = await getDivisionId(leagueName, divisionName);
  const divisionDiv = document.getElementById(`div_${divisionId}`);

  if (!divisionDiv) {
    handleError(`Division div with ID "div_${divisionId}" not found`, new Error("Division div not found"));
    return [];
  }

  // Select the second div with class 'row'
  const teamRows = divisionDiv.querySelectorAll('.row');
  const teamRow = teamRows[1]; // Assuming team names are in the second row

  if (!teamRow) {
    handleError(`Team row not found within division div with ID "div_${divisionId}"`, new Error("Team row not found"));
    return [];
  }

  // Extract team names from the selected row
  const teamNameElements = teamRow.querySelectorAll('ul a');
  const teamNames = Array.from(teamNameElements).map(element => element.textContent.trim());

  return teamNames;
}

/**
 * Retrieves the team ID for a given team name within a specific league and division.
 *
 * @param {string} leagueName - The name of the league.
 * @param {string} divisionName - The name of the division.
 * @param {string} teamName - The name of the team to find the ID for.
 * @returns {string|null} The team ID if found, otherwise null.
 */
export async function getTeamId(leagueName, divisionName, teamName) {
  const document = await fetchDocument();  // Directly use fetchDocument

  if (!document) {
    console.error('Document not available.');
    return null; // Or throw an error
  }

  const divisionId = await getDivisionId(leagueName, divisionName);
  if (!divisionId) {
    console.error("Division ID not found");
    return null;
  }

  const divisionDiv = document.getElementById(`div_${divisionId}`);

  if (!divisionDiv) {
    return null;
  }
  const secondRow = divisionDiv.querySelectorAll('.row')[1];

  if (!secondRow) return null;

  const teamLinks = secondRow.querySelectorAll('ul li a');

  for (const link of teamLinks) {
    if (link.textContent.trim() === teamName) {
      const href = link.getAttribute('href');
      const teamId = href.substring(href.lastIndexOf('/') + 1);
      return teamId;
    }
  }

  return null;
}

/**
 * Displays a table of incomplete games from the provided game data.
 *
 * @param {Array<object>} gameData - An array of game objects containing game information.
 *
 * This function filters the game data to find games that are not marked as completed and then outputs a table to the console with the date, home team, and away team for each incomplete game.
 */
export function getIncompleteGames(gameData, teamName) {
  try {
    if (!Array.isArray(gameData)) {
      throw new Error("Invalid game data format. Expected an array.");
    }

    // Filter games where completed is false and team name matches
    const incompleteGames = gameData.filter(game =>
      game &&
      typeof game.completed === 'boolean' &&
      !game.completed &&
      (teamName === game.HomeTeamName || teamName === game.AwayTeamName)
    );

    const incompleteGamesFormatted = incompleteGames.map(game => ({
      gamesheetID: game.GID,
      date: game.eDate,
      homeTeam: game.HomeTeamName,
      awayTeam: game.AwayTeamName,
    }));

    // Output incomplete games as a table
    if (incompleteGames.length > 0) {
      console.log("Incomplete Games:");
      incompleteGamesFormatted.forEach(game => {
        const gameID = game.gamesheetID ? String(game.gamesheetID).padEnd(7) : 'N/A'.padEnd(7);
        const date = game.date ? game.date.substring(0, 10) : 'N/A';
        const homeTeam = game.homeTeam ? game.homeTeam.padEnd(19) : 'N/A'.padEnd(19);
        const awayTeam = game.awayTeam ? game.awayTeam.padEnd(19) : 'N/A'.padEnd(19);
        console.log(`${gameID} | ${date} | ${homeTeam} | ${awayTeam} |`);
      });
    } else {
      console.log("No incomplete games found.");
    }
  } catch (error) {
    handleError("Error displaying incomplete games:", error);
  }
}

/**
 * Retrieves the live status of a game based on its gamesheet ID.
 *
 * @param {Array<object>} gameData - An array of game objects containing game information.
 * @param {number} gamesheetId - The ID of the gamesheet to check for live status.
 * @returns {string|null} The live status ("true" or "false") if found, otherwise null.
 */
export async function getLiveStatus(divisionId, gamesheetId) {
  const gameData = await fetchGameSheetList(divisionId);
  const game = gameData.find(game => game.GID === gamesheetId);

  if (game && typeof game.livescores === 'string') {
    return game.livescores;
  } else {
    return null;
  }
}
/**
 * Fetches game table data from the Ringette Ontario API using the provided URL.
 *
 * @param {string} url - The API endpoint URL to fetch data from.
 * @returns {Promise<object|null>} A Promise that resolves with the game table data as a JSON object, or null if an error occurs.
 *
 * @throws {Error} If there is an error fetching data from the API or parsing the JSON response.
 *
 * This function makes a GET request to the specified API endpoint and parses the JSON response. If an error occurs, it logs the error and returns null.
 */

export async function fetchGameSheetList(divisionId) {
  const seasonId = await getCurrentSeasonId();
  const url = `https://ringetteontario.com/api/leaguegame/get/1648/${seasonId}/0/${divisionId}/0/0/0`;
  const fetch = await import('node-fetch').then(module => module.default);

  console.log(`Fetching game table data from API: ${url}`);
  try {
    const response = await fetch(`${url}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    handleError("Error fetching game table data:", error);
    return null;
  }
}

