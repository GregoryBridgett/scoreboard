import { handleError } from './handleError.mjs';

/**
 * Retrieves the division ID from the Ringette Ontario website.
 *
 * @param {string} leagueText - The text content of the league list item to search for.
 * @param {string} divisionText - The text content of the division link to search for.
 * @param {Document} document - The HTML document to search within.
 * @returns {string|null} The division ID if found, otherwise null.
 *
 * @throws {Error} If the league list item or division link is not found, or if the href number cannot be extracted.
 *
 * This function first finds the league list item containing `leagueText`, then finds the division link within that list item containing `divisionText`.
 * It extracts the division ID from the link's href attribute.
 */
export function getDivisionId(document, leagueText, divisionText) {

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
 * @param {Document} document - The HTML document to search within.
 * @returns {string|null} The current season ID if found, otherwise null.
 *
 * @throws {Error} If the 'ddlSeason' dropdown element is not found on the page.
 */
export function getCurrentSeasonId(document) {
  // Find the selected option in the ddlSeason dropdown
  const seasonDropdown = document.querySelector('[name="ddlSeason"]');

  if (!seasonDropdown) {
    console.error("Error: Element with name 'ddlSeason' not found on the page.");
  }
  const selectedSeasonOption = seasonDropdown.querySelector('option[selected]');
  return selectedSeasonOption ? selectedSeasonOption.value : null;
}

/**
 * Retrieves the list of tournaments and their associated URLs from the Ringette Ontario website.
 *
 * @param {Document} document - The HTML document to search within.
 * @returns {Array<Object>} An array of objects, where each object has 'name' and 'url' properties.
 */
export function getTournaments(document) {
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
 * @param {Document} document - The HTML document to search within.
 * @returns {Array<string>} An array of league names.
 */
export function getLeagues(document) {
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
 * @param {Document} document - The HTML document to search within.
 * @returns {Array<string>} An array of division names.
 */
export function getDivisionNames(document, leagueName) {
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
 * @param {Document} document - The HTML document to search within.
 * @param {string} divisionId - The ID of the division to retrieve teams for.
 * @returns {Array<string>} An array of team names.
 */
export function getTeamNames(document, leagueName, divisionName) {
  const divisionId = getDivisionId(document, leagueName, divisionName);
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
 * @param {Document} document - The HTML document to search within.
 * @param {string} leagueName - The name of the league.
 * @param {string} divisionName - The name of the division.
 * @param {string} teamName - The name of the team to find the ID for.
 * @returns {string|null} The team ID if found, otherwise null.
 */
export function getTeamId(document, leagueName, divisionName, teamName) {
    const divisionId = getDivisionId(document, leagueName, divisionName);
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

