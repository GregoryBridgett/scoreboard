const scoreboard = document.getElementById('scoreboard');

// Assume scoreboardId is provided externally (e.g., through an environment variable)
const scoreboardId = window.scoreboardId; // Or however you are providing the scoreboardId
if (!scoreboardId || typeof scoreboardId !== 'string') {
  console.error('scoreboardId not provided or invalid.');
  // Handle the error appropriately, e.g., display an error message to the user
  // return; // Or throw an error to stop further execution
}

// Function to update the scoreboard with data
function updateScoreboard(data) {
  // Update team names and scores
  document.getElementById('homeTeamName').textContent = data.homeTeamName;
  document.getElementById('awayTeamName').textContent = data.awayTeamName;
  document.getElementById('homeTeamScore').textContent = data.homeTeamScore;
  document.getElementById('awayTeamScore').textContent = data.awayTeamScore;

  // Update game time
  document.getElementById('gameTime').textContent = data.gameTime;

  // Update goals and penalties lists
  const homeGoalsList = document.getElementById('homeGoals');
  const awayGoalsList = document.getElementById('awayGoals');
  const homePenaltiesList = document.getElementById('homePenalties');
  const awayPenaltiesList = document.getElementById('awayPenalties');

  // Helper function to update a list
  const updateList = (list, items) => {
    list.innerHTML = ''; // Clear the list
    items.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      list.appendChild(li);
    });
  };

  updateList(homeGoalsList, data.homeTeamGoals);
  updateList(awayGoalsList, data.awayTeamGoals);
  updateList(homePenaltiesList, data.homeTeamPenalties);
  updateList(awayPenaltiesList, data.awayTeamPenalties);
}
// Fetch initial game info
fetch(`/gameInfo/${scoreboardId}`)
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(gameInfo => {
    updateScoreboard(gameInfo); 
  })
  .catch(error => {
    console.error('Error fetching game info:', error);
  });
// EventSource for real-time updates
const eventSource = new EventSource(`/scoreboard-updates?scoreboardId=${scoreboardId}`);
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateScoreboard(data);
}

eventSource.onerror = function(error) {
  console.error('SSE connection error:', error);
};

/**
 * Reads the 'theme' parameter from the URL and returns it.
 * If the parameter is not found, returns a default theme.
 * @returns {string} The theme name.
 */
const getThemeFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const theme = urlParams.get('theme'); 

    if (!theme) {
        return 'theme-light'; 
    }
    return theme;
};

// Apply the theme when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const theme = getThemeFromUrl();
    document.body.classList.add(theme);
});