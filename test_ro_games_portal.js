function handleError(message, error) {
  console.error(message, error);
  // You might want to throw an error here to stop execution or handle it differently
  // throw new Error(message); 
}

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
function getDivisionId(leagueText, divisionText, document) {
  const leagueListItem = Array.from(document.querySelectorAll('li')).find(li =>
    li.textContent.includes(leagueText)
  );
  if (!leagueListItem) {
    handleError(`List item containing "${leagueText}" not found`, new Error("League list item not found"));
    return null;
  }

  const divisionLink = Array.from(leagueListItem.querySelectorAll('a')).find(a =>
    a.textContent.trim() === divisionText
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
function getCurrentSeasonId(document) {
  // Find the selected option in the ddlSeason dropdown
  const seasonDropdown = document.querySelector('[name="ddlSeason"]');

  if (seasonDropdown) {
  } else {
    console.error("Error: Element with name 'ddlSeason' not found on the page.");
  }
  const selectedSeasonOption = seasonDropdown.querySelector('option[selected]');
  return selectedSeasonOption ? selectedSeasonOption.value : null;
}

/**
 * Fetches the HTML content of a given URL and returns a parsed document object.
 *
 * @param {string} url - The URL to fetch.
 * @returns {Promise<Document>} A Promise that resolves with the parsed document object.
 *
 * @throws {Error} If there is an error fetching the URL or parsing the HTML.
 */
async function getDocument(url) {
  const { JSDOM } = await import('jsdom');
  const fetch = await import('node-fetch').then(module => module.default);
  console.log(`(getDocument) Fetching URL: ${url}`);
  let document;
  try {
    const response = await fetch(url);
    const html = await response.text();
    const dom = new JSDOM(html);
    document = dom.window.document;
  } catch (error) {
    handleError(`Error fetching or parsing document from ${url}`, error);
    return null; // Or throw an error to stop execution
  }
  return document;
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
async function fetchGameTableDataWithJson(url) {
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

/**
 * Displays a table of incomplete games from the provided game data.
 *
 * @param {Array<object>} gameData - An array of game objects containing game information.
 *
 * This function filters the game data to find games that are not marked as completed and then outputs a table to the console with the date, home team, and away team for each incomplete game.
 */
function displayIncompleteGames(gameData) {
  try {
    if (!Array.isArray(gameData)) {
      throw new Error("Invalid game data format. Expected an array.");
    }

    // Filter games where completed is false
    const incompleteGames = gameData.filter(game => game && typeof game.completed === 'boolean' && !game.completed);
    const incompleteGamesFormatted = incompleteGames.map(game => ({
      gameID: game.GID,
      date: game.eDate,
      homeTeam: game.HomeTeamName,
      awayTeam: game.AwayTeamName,
    }));

    // Output incomplete games as a table
    if (incompleteGames.length > 0) {
      console.log("Incomplete Games:");
      incompleteGamesFormatted.forEach(game => {
        const gameID = game.gameID ? String(game.gameID).padEnd(7) : 'N/A'.padEnd(7);
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
 * Extracts scoring play data from the provided HTML document.
 *
 * @param {Document} document - The HTML document to extract data from.
 * @returns {Array<object>} An array of scoring play objects.
 */
function extractScoringPlaysData(document) {
  const scoringPlays = [];

  // Find the table following the "Scoring Summary" h3 tag
  const scoringSummaryHeading = Array.from(document.querySelectorAll('h3')).find(h3 =>
    h3.textContent.trim() === 'Scoring Summary'
  );

  if (scoringSummaryHeading) {
    const scoringTable = scoringSummaryHeading.nextElementSibling;
    if (scoringTable && scoringTable.tagName === 'TABLE') {
      const rows = scoringTable.querySelectorAll('tbody tr');

      let period = null
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
        scoringPlays.push({
          teamName,
          teamId,
          time,
          period,
          scorerName,
          scorerId,
          firstAssisterName,
          firstAssisterId,
          secondAssisterName,
          secondAssisterId,

        });
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
function extractPenaltyData(document) {
  const penaltyData = [];

  // Find the table following the "Scoring Summary" h3 tag
  const penaltySummaryHeading = Array.from(document.querySelectorAll('h3')).find(h3 =>
    h3.textContent.trim() === 'Penalty Summary'
  );

  if (penaltySummaryHeading) {
    const penaltyTable = penaltySummaryHeading.nextElementSibling;
    if (penaltyTable && penaltyTable.tagName === 'TABLE') {
      const rows = penaltyTable.querySelectorAll('tbody tr');

      let period = null
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
        console.log(links[0].textContent)
        const penaltyNameMatch = playerId ? row.textContent.match(/.*for (.*)/) : null;
        const penaltyName = penaltyNameMatch ? penaltyNameMatch[1].trim() : null;

        // Create scoring play object
        penaltyData.push({
          teamName,
          teamId,
          time,
          period,
          playerName,
          playerId,
          penaltyName,
        });
      }
    }
  }

  return penaltyData;
}























/**
 * The main function that orchestrates the data retrieval and processing.
 * 
 * This function initializes modules, fetches necessary data from the Ringette Ontario website, 
 * and then displays a table of incomplete games.
 *
 * @throws {Error} If any of the asynchronous operations fail.
 */
async function main() {
  try {
    const url = 'https://ringetteontario.com/content/ro-games-portal';
    const textId = process.argv[2];
    if (!textId) {
      throw new Error("Please provide a text ID as a command line argument.");
    }

    let document = await getDocument(url);
    if (!document) return; // Exit if document retrieval failed

    const searchText = 'NCRRL';
    const divisionId = getDivisionId(searchText, textId, document);
    if (!divisionId) return; // Exit if division ID retrieval failed
    console.log("Division ID:", divisionId);

    const divisionUrl = `https://ringetteontario.com/division/0/${divisionId}/games`;
    document = await getDocument(divisionUrl);
    if (!document) return;
    const seasonID = getCurrentSeasonId(document);
    console.log("Season ID:", seasonID);

    const apiUrl = `https://ringetteontario.com/api/leaguegame/get/1648/${seasonID}/0/${divisionId}/0/0/0`;
    const gameData = await fetchGameTableDataWithJson(apiUrl);
    if (gameData) {
      displayIncompleteGames(gameData);

      const gameUrl = 'https://ringetteontario.com/division/0/20294/gamesheet/1259383';
      document = await getDocument(gameUrl);
      if (!document) return;

      // Ensure document is fully loaded before extracting data
      const penaltyData = extractPenaltyData(document);
      const scoringPlays = extractScoringPlaysData(document);

      console.log('Scoring Plays:', scoringPlays);
      console.log('Penalty Data', penaltyData);

    } else {
      console.log("No game data received from API.");
    }
  } catch (error) {
    handleError("An error occurred in the main function:", error);
  }
}

main();