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
 * Scrapes game statistics from a Ringette Ontario gamesheet URL.
 *
 * @param {string} url - The URL of the gamesheet to scrape.
 * @returns {Promise<object|null>} A Promise that resolves with an object containing the game statistics, or null if an error occurs.
 *
 * The returned object has the following structure:
 * {
 *   score: { home: number, away: number },
 *   scoringSummary: [ ...array of scoring summary lines... ],
 *   penaltySummary: [ ...array of penalty summary lines... ]
 * }
 */
async function scrapeGameStats(url) {  
  console.log(`(scrapeGameStats) Starting to scrape: ${url}`);
  try {
    const document = await getDocument(url);
    if (!document) {
      return null;
    }

    let homeScore, awayScore;

    // Extract the score
    const homeScoreElement = document.getElementById('homeGoalClock');
    const awayScoreElement = document.getElementById('awayGoalClock');

    if (homeScoreElement && awayScoreElement) {
      const homeScore = parseInt(homeScoreElement.textContent.trim(), 10);
      const awayScore = parseInt(awayScoreElement.textContent.trim(), 10);

      console.log('(scrapeGameStats) Home Score:', homeScore);
      console.log('(scrapeGameStats) Away Score:', awayScore);

      const score = { home: homeScore, away: awayScore };
    }  else {
      console.warn('(scrapeGameStats) Score box element not found. Game may not have started or data is unavailable.');
      return null;
    }

    // Extract scoring summary
    let scoringSummary = [];
    const scoringSummaryHeading = Array.from(document.querySelectorAll('h3')).find(h3 =>
      h3.textContent.trim() === 'Scoring Summary'
    );
    
    if (scoringSummaryHeading) {    
      const scoringTable = scoringSummaryHeading.nextElementSibling;
      if (scoringTable && scoringTable.tagName === 'TABLE') {
        const rows = scoringTable.querySelectorAll('tbody tr');
        for (const row of rows) {
          try {
            console.log('(scrapeGameStats) Processing scoring summary row:', row.outerHTML);
            // console.log('  - Row Text Content:', row.textContent);
            // console.log('  - Row Outer HTML:', row.outerHTML);

            // Extract team (first anchor tag with href starting with '/team/')
            const teamLink = row.querySelector('a[href^="/team/"]');
            let team = null;
            if (teamLink) {
              team = teamLink.textContent.trim();
              console.log('  - Team Link:', teamLink.outerHTML);
              console.log('  - Team:', team);
            } else {
              console.warn('  - Team Link not found in row.');
            }

            // Extract time
            const timeMatch = row.textContent.match(/\bat\s*(\d{1,2}:\d{2})\b/);
            const time = timeMatch ? timeMatch[1] : null;
            console.log('  - Time:', time);            

            // Extract scorer (text between time and "from")
            let scorer = null;            
            if (time) {
              const timeIndex = row.textContent.indexOf(time);
              
              const scorerStartIndex = timeIndex + time.length;
              const scorerEndIndex = row.textContent.indexOf('from', scorerStartIndex);

              if (scorerStartIndex !== -1 && scorerEndIndex !== -1) {
                scorer = row.textContent
                  .substring(scorerStartIndex, scorerEndIndex)
                  .replace('-', '') // Remove the hyphen
                  .trim();
              } else {
                console.warn('(scrapeGameStats) Could not extract scorer using "from" keyword. Row text:', row.textContent);

      
                // Fallback: Try extracting scorer using "Assisted by" keyword
                const assistedByIndex = row.textContent.indexOf('Assisted by');
                if (assistedByIndex !== -1) {
                  scorer = row.textContent.substring(scorerStartIndex, assistedByIndex).replace('-', '').trim();
                }
              }
            }                       

            // Extract assists
            let assists = [];
            const assistIndex = row.textContent.indexOf('from'); 
            if (assistIndex !== -1) {
              const assistText = row.textContent.substring(assistIndex + 4).trim(); // Get text after "from"
              
              // Split assists by "and" and trim whitespace
              assists = assistText
                .split('and')
                .map(assist => assist.trim())
                .map(assist => {
                  // Remove leading numbers and whitespace
                  const assistMatch = assist.match(/(?:\d+\s+)?(.*)/);
                  return assistMatch ? assistMatch[1].trim() : null;
                })
                .filter(assist => assist !== null); // Remove any null assists
              
            } else {              
              console.warn('(scrapeGameStats) No assists found for this goal.');              
            }            
            console.log('  - Assists:', assists);

            const goalData = {
              team,
              time,
              scorer,
              assists: assists
            };

            scoringSummary.push(goalData);
          } catch (error) {
            console.warn('(scrapeGameStats) Error extracting scoring summary data from row:', row.outerHTML, error);
          }                    
        }
        console.log('(scrapeGameStats) Scoring Summary:', scoringSummary);      
      } else {
        console.warn('(scrapeGameStats) Element following "Scoring Summary" heading is not a table.');
      }      
    } else {      
      console.warn('(scrapeGameStats) "Scoring Summary" heading not found.');    
    }


    // Extract penalty summary
    console.log('(scrapeGameStats) Finding penalty summary rows...');
    const penaltySummaryRows = document.querySelectorAll('#penalties-table tbody tr');
    console.log('(scrapeGameStats) Penalty Summary Table HTML:', document.querySelector('#penalties-table').outerHTML);
    const penaltySummary = Array.from(penaltySummaryRows).map(row => row.textContent.trim());

    return {
      score: { home: homeScore, away: awayScore },
      scoringSummary,
      penaltySummary,
    };
  } catch (error) {
    handleError(`Error scraping game stats from ${url}`, error);
    return null;
  }
}


/**
 * Extracts the team number from a Ringette Ontario team URL.
 *
 * @param {string} teamUrl - The URL of the team page.
 * @returns {string|null} The team number if found, otherwise null.
 *
 * This function extracts the last number in the URL as the team number.
 */
function extractTeamNumberFromUrl(teamUrl) {
  const match = teamUrl.match(/\/(\d+)$/);
  return match ? match[1] : null;
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

      for (const row of rows) {
        // Extract team name from the first link
        const teamLink = row.querySelector('a[href^="/team/"]');
        const teamName = teamLink ? teamLink.textContent.trim() : null;

        // Extract goal time
        const goalTimeMatch = row.textContent.match(/\bat\s*(\d{1,2}:\d{2})\b/);
        const goalTime = goalTimeMatch ? goalTimeMatch[1] : null;

        // Extract scorer name from the second link
        const links = row.querySelectorAll('a[href^="/player/"]');
        const scorerName = links.length > 0 ? links[0].textContent.trim() : null; // Assuming scorer is the first link

        // Extract assister names
        const assistTextMatch = row.textContent.match(/from(.*)/);
        let assisterNames = [];
        if (assistTextMatch) {
          const assistText = assistTextMatch[1].trim();
          assisterNames = assistText.split('and').map(name => name.trim());
        }

        // Create scoring play object and add it to the array
        scoringPlays.push({
          teamName,
          goalTime,
          scorerName,
          assisterNames,
        });
      }
    }
  }

  return scoringPlays;
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

      // Call scrapeGameStats and log the results
      const gameUrl = 'https://ringetteontario.com/division/0/20294/gamesheet/1259383';
      const gameStats = await scrapeGameStats(gameUrl);
      console.log('Game Stats:', gameStats);


    } else {
      console.log("No game data received from API."); 
    }    
  } catch (error) {
    handleError("An error occurred in the main function:", error);
  }
}

main();