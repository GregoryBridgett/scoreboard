async function initializeUI(scoreboardId) {
  let clientId;

  try {
    // Fetch Client ID using scoreboardId
    const response = await fetch(`/client/ui/${scoreboardId}`);

    if (!response.ok) {
      const message = `Error fetching client ID: ${response.status} ${response.statusText}`;
      console.error(message);
      // Display error to user (e.g., using an alert or a dedicated error element)
      alert(message);
      return; // Stop further initialization
    }

    const data = await response.json();
    clientId = data.clientId;

    // Establish SSE connection
    const eventSource = new EventSource(`/scoreboard/${scoreboardId}/${clientId}/events`);
    eventSource.onmessage = (event) => {
      console.log('Received SSE message:', event.data);
      // Process incoming game data updates
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      // Handle SSE connection errors
    };

  } catch (error) {
    console.error('Initialization error:', error);
    // Handle initialization errors
  }

  // ... rest of the initializeUI function ...

  async function sendConfiguration(gameType, league, divisionId, gamesheetId) {
    // ... (your sendConfiguration code) ...
  }

  return { sendConfiguration };
}

function createLeagueButtons(leagueData) {
  const leagueButtonsContainer = document.getElementById('league-buttons-container');
  if (!leagueButtonsContainer) {
    console.error('Error: league-buttons-container not found in the DOM.');
    return;
  }

  // Clear existing buttons
  leagueButtonsContainer.innerHTML = '';

  if (!leagueData || leagueData.length === 0) {
    console.warn('League data is empty or null. No buttons created.');
    return;
  }

  leagueData.forEach(league => {
    const button = document.createElement('button');
    button.textContent = league; // leagueData now contains strings
    button.classList.add('league-button');
    leagueButtonsContainer.appendChild(button);
  });

  // Show the buttons container
  leagueButtonsContainer.style.display = 'block';
}

function clearButtonsContainer(containerId) {
  document.getElementById(containerId).innerHTML = '';
}

// Call initializeUI with the scoreboardId after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function () {
  // Add event listener to toggle game selection menu visibility
  const toggleButton = document.getElementById('toggle-game-selection');
  const gameSelectionMenu = document.getElementById('game-selection-menu');

  if (toggleButton && gameSelectionMenu) {
    toggleButton.addEventListener('click', function () {
      gameSelectionMenu.classList.toggle('hidden');
      // Optionally, you can also toggle a class to show the menu:
      // gameSelectionMenu.classList.toggle('block');
    });
  }

  // Add event listeners for leagues and tournaments buttons
  const leaguesButton = document.getElementById('leagues-button');
  const tournamentsButton = document.getElementById('tournaments-button');
  const leagueButtonsContainer = document.getElementById('league-buttons-container');
  const divisionButtonsContainer = document.getElementById('division-buttons-container');
  const teamButtonsContainer = document.getElementById('team-buttons-container');
  
  let leagueData; // Variable to store league or tournament data

  if (leaguesButton) {
    leaguesButton.addEventListener('click', async () => {
      try {
        const response = await fetch('/schedule/leagues');
        if (response.ok) {
          const data = await response.json();
          leagueData = data; // Store leagues data
          createLeagueButtons(leagueData); 

          // Add event listeners to league buttons
          const leagueButtons = document.querySelectorAll('.league-button');
          leagueButtons.forEach(button => {
            button.addEventListener('click', async () => {
              const leagueName = button.textContent;
              try {
                const response = await fetch(`/schedule/leagues/${leagueName}/divisions`);
                if (response.ok) {
                  const divisionData = await response.json();
                  clearButtonsContainer('division-buttons-container');
                  clearButtonsContainer('team-buttons-container'); 
                  createButtons(divisionData, 'division-buttons-container', 'division-button');
                  // Add event listeners to division buttons (similar to league buttons)
                  // ...
                } 
              } catch (error) {}
            });
          });

          console.log('Leagues data:', data);
        } else {
          console.error('Error fetching leagues:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error fetching leagues:', error);
      }
    });
  }

  if (tournamentsButton) {
    tournamentsButton.addEventListener('click', async () => {
      try {
        const response = await fetch('/schedule/tournaments');
        if (response.ok) {
          const data = await response.json();
          leagueData = data; // Store tournaments data
          createLeagueButtons(leagueData);
          
          console.log('Tournaments data:', data);
        } else {
          console.error('Error fetching tournaments:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error fetching tournaments:', error);
      }
    });
  }

  // Initially hide the league buttons container

  function createButtons(data, containerId, buttonClass) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Error: ${containerId} not found in the DOM.`);
      return;
    }
  
    data.forEach(item => {
      const button = document.createElement('button');
      button.textContent = item;
      button.classList.add(buttonClass);
      container.appendChild(button);
    });
  
    container.style.display = 'block'; 
  }

  // Add event listeners to division buttons
  divisionButtonsContainer.addEventListener('click', async (event) => {
    if (event.target.classList.contains('division-button')) {
      const divisionName = event.target.textContent;
      const leagueName = findSelectedLeagueName(); // Assuming you have a way to get the selected league
      
      try {
        const response = await fetch(`/schedule/leagues/${leagueName}/divisions/${divisionName}/teams`);
        if (response.ok) {
          const teamData = await response.json();
          clearButtonsContainer('team-buttons-container');
          createButtons(teamData, 'team-buttons-container', 'team-button');
          // Add event listeners to team buttons (to fetch games)
          // ...
        }
      } catch (error) {}
    }
  });

  if (leagueButtonsContainer) {
    leagueButtonsContainer.style.display = 'none';
  }

  const urlParams = new URLSearchParams(window.location.search);
  let scoreboardId = urlParams.get('scoreboardId');

  if (!scoreboardId) {
    // Try to get the scoreboard ID from the path instead
    const pathParts = window.location.pathname.split('/');
    const potentialScoreboardId = pathParts[pathParts.length - 1];

    if (potentialScoreboardId) {
      console.log('Using scoreboardId from path:', potentialScoreboardId);
      scoreboardId = potentialScoreboardId;
    } else {
      console.error('Error: scoreboardId parameter is missing from the URL.');
      return; // Or handle the error as needed
    }
  }

  initializeUI(scoreboardId);
});