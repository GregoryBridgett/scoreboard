console.log(`Current working directory: ${__dirname}`);

async function getModules() {
  
    const { JSDOM } = await import('jsdom');
    const assert = await import('assert');
    const fetch = await import('node-fetch').then(module => module.default);
    return { JSDOM, fetch };
}

async function findFun2Content(url, searchText) {
  const { fetch, JSDOM } = await getModules();
  console.log(`Fetching URL: ${url}`); // Log the URL being fetched
  const response = await fetch(url); 
  const html = await response.text();
  const dom = new JSDOM(html); 
  const document = dom.window.document;

  // Find the list item containing "NCRRL"
  const targetListItem = Array.from(document.querySelectorAll('li')).find(li =>
    li.textContent.includes(searchText)
  );

  if (!targetListItem) {
    return { error: `List item containing "${searchText}" not found` }; // Target list item not found
  }

  // Find all h4 elements with class "d-inline panel-title" within the target list item
  const h4Elements = targetListItem.querySelectorAll('h4.d-inline.panel-title');
  
  // Extract the text content and href number of each h4 element
  const h4Data = Array.from(h4Elements).map(h4 => {
    const text = h4.textContent.trim();
    const href = h4.querySelector('a').href;
    // Extract number from href (e.g., "#div_19936" -> "19936")
    const hrefNumber = href.match(/#div_(\d+)/) ? href.match(/#div_(\d+)/)[1] : -1; 

    return { text, hrefNumber };
  });
  
  // Generate URLs for each hrefNumber
  const gameUrls = h4Data
    .filter(({ hrefNumber }) => hrefNumber !== -1)
    .map(({ text, hrefNumber }) => ({ text, url: `/division/0/${hrefNumber}/games` }));

  return gameUrls;
}

async function getGameUrl(textId) {
  const url = 'https://ringetteontario.com/content/ro-games-portal';
  const searchText = 'NCRRL'; // Assuming all target games are under NCRRL

  const gameUrls = await findFun2Content(url, searchText);

  if (gameUrls && gameUrls.length > 0) {
    const targetGame = gameUrls.find(game => game.text.includes(textId));
    return targetGame ? targetGame.url : null;
  } else if (gameUrls && gameUrls.error) {
    console.error(gameUrls.error);
    return null;
  } else {
    return null;
  }
}

async function getCurrentSeasonId(document) { 
  // Find the selected option in the ddlSeason dropdown
  const seasonDropdown = document.querySelector('[name="ddlSeason"]');

  if (seasonDropdown) {
  } else {
    console.error("Error: Element with name 'ddlSeason' not found on the page.");
    return null;
  }
  const selectedSeasonOption = seasonDropdown.querySelector('option[selected]');

  return selectedSeasonOption ? selectedSeasonOption.value : null;
}

async function getDocument(url) {
  const { fetch, JSDOM } = await getModules();
  console.log(`Fetching URL: ${url}`); // Log the URL being fetched
  const response = await fetch(url);
  const html = await response.text();
  const dom = new JSDOM(html);
  const document = dom.window.document;

  return document;
}

async function getCurrentSeasonId(document) { 
  // Find the selected option in the ddlSeason dropdown
  const seasonDropdown = document.querySelector('[name="ddlSeason"]');

  if (seasonDropdown) {
    const selectedSeasonOption = seasonDropdown.querySelector('option[selected]');
    return selectedSeasonOption ? selectedSeasonOption.value : null;
  } else {
    console.error("Error: Element with name 'ddlSeason' not found on the page.");
    return null;
  }
}

async function fetchGameTableDataWithJson(document) {
  const { fetch } = await getModules();
  const assert = await import('assert').then(module => module.default);

  // Extract values from selected dropdown options
  const sid = await getCurrentSeasonId(document); 
  console.log(`Variable Name: sid, Value: ${sid}`); 
  
  
  // Break down gtid assignment for debugging
  const gtidDropdown = document.querySelector('[name="ddlGameType"]');
  console.log(`Variable Name: gtidDropdown, Value: ${gtidDropdown}`);

  const gtidSelectedOption = gtidDropdown.querySelector('option[selected]');
  console.log(`Variable Name: gtidSelectedOption, Value: ${gtidSelectedOption}`);

  const gtid = 0 
  // gtidSelectedOption ? gtidSelectedOption.value : null;
  console.log(`Variable Name: gtid (before assignment), Value: ${gtid}`);

  console.log(`Variable Name: gtid, Value: ${gtid}`); 

  // Fetch monthYear from API
  const monthYear=0;
  
 // Updated API URL
  const apiUrl = `/api/leaguegame/get/1648/${sid}/0/20294/${gtid}/0/${monthYear}`;
  console.log(`Fetching game table data from API: https://ringetteontario.com${apiUrl}`); 

  try {
    const response = await fetch(`https://ringetteontario.com${apiUrl}`);
    const responseText = await response.json(); // Get the raw response text
    console.log("Raw API Response:", responseText); // Log the raw response for debugging

     // Filter games where completed is false
     const incompleteGames = responseText.filter(game => game && typeof game.completed === 'boolean' && !game.completed);
     const incompleteGamesFormatted = incompleteGames.map(game => ({
         date: game.eDate,
         homeTeam: game.HomeTeamName,
         awayTeam: game.AwayTeamName,
       }));

    // Output incomplete games as a table
    if (incompleteGames.length > 0) {
      console.log("\nIncomplete Games:");
      console.log("+---------------------+---------------------+---------------------+"); 
      console.log("| Date                | Home Team           | Away Team           |"); 
      console.log("+---------------------+---------------------+---------------------+"); 
      incompleteGamesFormatted.forEach(game => {
        const date = game.date ? game.date.substring(0, 10) : 'N/A'; // Extract date part, or use 'N/A' if null or undefined
        const homeTeam = game.homeTeam ? game.homeTeam.padEnd(19) : 'N/A'.padEnd(19);
        const awayTeam = game.awayTeam ? game.awayTeam.padEnd(19) : 'N/A'.padEnd(19);
        console.log(`| ${date} | ${homeTeam} | ${awayTeam} |`);
      });
      console.log("+---------------------+---------------------+---------------------+");
    } else {
      console.log("No incomplete games found.");
    }

    // You can further process incompleteGames here

    return responseText;
  } catch (error) {
    console.error("Error fetching game table data:", error);
    return null;
  }
}

async function fetchGameTableData(apiUrl) {
  const { fetch } = await getModules();

  console.log(`Fetching game table data from API: ${apiUrl}`); 

  try {
    const response = await fetch(apiUrl);
    // const data = await response.json(); // This line is causing the error
    const data = await response.text(); // Get the raw response text
    // console.log("Raw API Response:", data); // Log the raw response for debugging
    return data;
  } catch (error) {
    console.error("Error fetching game table data:", error);
    return null;
  }
}

async function fetchAndPrintGameTable(gameUrl) {
  const { fetch, JSDOM } = await getModules();
  const fullUrl = `https://ringetteontario.com${gameUrl}`;

  console.log(`Fetching URL: ${fullUrl}`); // Log the URL being fetched
  const response = await fetch(fullUrl);
  const html = await response.text();
  const dom = new JSDOM(html);
  const document = dom.window.document;


  try {
    const gameData = await fetchGameTableDataWithJson(document);
    if (gameData) {
      // Process and output the gameData as needed
      // console.log("Game Data:", gameData); 

    } else {
      console.log("No game data received from API.");
    }
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    // This block is intentionally left empty.
  }
}


async function main() {
  const url = 'https://ringetteontario.com/content/ro-games-portal';
  
  const document = await getDocument(url);

  const textId = process.argv[2];

  if (!textId) {
    console.error("Please provide a text ID as a command line argument.");
    return;
  }

  const gameUrl = await getGameUrl(textId);

  if (gameUrl) {
    await fetchAndPrintGameTable(gameUrl);
  } else {
    console.log(`No game URL found for "${textId}"`);
  }
}

main();
