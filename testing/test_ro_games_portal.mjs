import { fetchDocument, fetchGameSheetList } from '../server/fetchRampData.mjs';
import { getIncompleteGames } from '../server/getRampDivisionIds.mjs';
import { getDivisionNames, getDivisionId, getCurrentSeasonId, getTournaments, getLeagues, getTeamNames, getTeamId } from '../server/getRampDivisionIds.mjs';
import { handleError } from '../server/handleError.mjs';
import { extractScoringPlaysData, extractPenaltyData, getScoreData } from '../server/processRampGameSheet.mjs';

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

    const leagueNames = getLeagues(document);
    console.log("Leagues:",leagueNames);
    


    const searchText = 'NCRRL';
    const divisionNames = getDivisionNames(document,searchText);
    console.log("Divisions:",divisionNames);
    const teamNames = getTeamNames(document, searchText,textId);
    console.log("Teams:",teamNames);
    const divisionId = getDivisionId(document, searchText, textId);
    if (!divisionId) return; // Exit if division ID retrieval failed
    console.log("Division ID:", divisionId);

    const divisionUrl = `https://ringetteontario.com/division/0/${divisionId}/games`;
    document = await fetchDocument(divisionUrl);
    if (!document) return;
    const seasonID = getCurrentSeasonId(document);
    console.log("Season ID:", seasonID);

/*    const tournamentUrl = `http://ringetteontariogames.msa4.rampinteractive.com/tournaments`;
    document = await fetchDocument(tournamentUrl);
    if (!document) return;
    const tournamentList = getTournaments(document);
    console.log("Tournaments:", tournamentList);
*/
    const apiUrl = `https://ringetteontario.com/api/leaguegame/get/1648/${seasonID}/0/${divisionId}/0/0/0`;
    const gameData = await fetchGameSheetList(apiUrl);
    if (gameData) {
    console.log(gameData);
    getIncompleteGames(gameData, "Ottawa Ice U16A - Falconer");
    }
      const gameUrl = 'https://ringetteontario.com/division/0/20294/gamesheet/1259383';
      document = await fetchDocument(gameUrl); 
      if (!document) return;

      // Ensure document is fully loaded before extracting data
      const penaltyData = extractPenaltyData(document);
      const scoringPlays = extractScoringPlaysData(document);
      const scores = getScoreData(document);
      console.log("Team Number:",getTeamId(document,searchText,textId,"Ottawa Ice U16A - Falconer"));
      console.log('Scoring Plays:', scoringPlays);
      console.log('Penalty Data', penaltyData);
      console.log('Scores:', scores);


  } catch (error) {
    handleError("An error occurred in the main function:", error);
  }
}

main();