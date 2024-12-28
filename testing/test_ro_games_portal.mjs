import { fetchDocument } from '../server/fetchRampData.mjs';
import { fetchGameSheetList } from '../server/getRampDivisionIds.mjs';
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

    const leagueNames = await getLeagues();
    console.log("Leagues:",leagueNames);
    


    const searchText = 'NCRRL';
    const divisionNames = await getDivisionNames(searchText);
    console.log("Divisions:",divisionNames);
    const teamNames = await getTeamNames(searchText,textId);
    console.log("Teams:",teamNames);

    const divisionId = await getDivisionId(searchText, textId);
    if (!divisionId) return; // Exit if division ID retrieval failed
    console.log("Division ID:", divisionId);

/*    const tournamentUrl = `http://ringetteontariogames.msa4.rampinteractive.com/tournaments`;
    document = await fetchDocument(tournamentUrl);
    if (!document) return;
    const tournamentList = getTournaments();
    console.log("Tournaments:", tournamentList);
*/
    const gameData = await fetchGameSheetList(divisionId);
    if (gameData) {
    console.log(gameData);
    getIncompleteGames(gameData, "Ottawa Ice U16A - Falconer");
    }
      const gameUrl = 'https://ringetteontario.com/division/0/20294/gamesheet/1259383';
      const document = await fetchDocument(gameUrl); 
      if (!document) return;

      // Ensure document is fully loaded before extracting data
      const penaltyData = await extractPenaltyData(document);
      const scoringPlays = await extractScoringPlaysData(document);
      const scores = await getScoreData(document);
      const teamId = await getTeamId(searchText, textId, 'Ottawa Ice U16A - Falconer');
      console.log("Team Number:",teamId);
      console.log('Scoring Plays:', scoringPlays);
      console.log('Penalty Data', penaltyData);
      console.log('Scores:', scores);


  } catch (error) {
    handleError("An error occurred in the main function:", error);
  }
}

main();