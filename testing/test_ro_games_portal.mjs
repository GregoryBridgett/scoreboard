import { fetchDocument, fetchGameSheetList } from '../server/fetchRampData.mjs';
import { getDivisionId, getCurrentSeasonId } from '../server/getDivisionIds.mjs';
import { handleError } from '../server/handleError.mjs';
import { extractScoringPlaysData, extractPenaltyData, getScoreData } from '../server/processGameSheet.mjs';

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

    let document = await fetchDocument(url);
    if (!document) return; // Exit if document retrieval failed

    const searchText = 'NCRRL';
    const divisionId = getDivisionId(searchText, textId, document);
    if (!divisionId) return; // Exit if division ID retrieval failed
    console.log("Division ID:", divisionId);

    const divisionUrl = `https://ringetteontario.com/division/0/${divisionId}/games`;
    document = await fetchDocument(divisionUrl);
    if (!document) return;
    const seasonID = getCurrentSeasonId(document);
    console.log("Season ID:", seasonID);

    const apiUrl = `https://ringetteontario.com/api/leaguegame/get/1648/${seasonID}/0/${divisionId}/0/0/0`;
    const gameData = await fetchGameSheetList(apiUrl);
    if (gameData) {
      console.log(gameData);
      displayIncompleteGames(gameData);

      const gameUrl = 'https://ringetteontario.com/division/0/20294/gamesheet/1259383';
      document = await fetchDocument(gameUrl); 
      if (!document) return;

      // Ensure document is fully loaded before extracting data
      const penaltyData = extractPenaltyData(document);
      const scoringPlays = extractScoringPlaysData(document);
      const scores = getScoreData(document);

      console.log('Scoring Plays:', scoringPlays);
      console.log('Penalty Data', penaltyData);
      console.log('Scores:', scores);

    } else {
      console.log("No game data received from API.");
    }
  } catch (error) {
    handleError("An error occurred in the main function:", error);
  }
}

main();