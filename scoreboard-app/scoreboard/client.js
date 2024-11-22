import {DataModel} from '../common/dataModel.js';

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
  const dataModel = new DataModel(data);

  document.getElementById('homeTeamName').textContent = dataModel.homeTeamName;
  document.getElementById('awayTeamName').textContent = dataModel.awayTeamName;
  document.getElementById('homeTeamScore').textContent = dataModel.homeTeamScore;
  document.getElementById('awayTeamScore').textContent = dataModel.awayTeamScore;
  document.getElementById('homeTeamShots').textContent = dataModel.homeTeamShots;
  document.getElementById('awayTeamShots').textContent = dataModel.awayTeamShots;

  document.getElementById('gameTime').textContent = dataModel.gameTime;

  updateList(document.getElementById('homeGoals'), dataModel.homeTeamGoals);
  updateList(document.getElementById('awayGoals'), dataModel.awayTeamGoals);
  updateList(document.getElementById('homePenalties'), dataModel.homeTeamPenalties);
  updateList(document.getElementById('awayPenalties'), dataModel.awayTeamPenalties);
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


const updateList = (list, items) => {
  list.innerHTML = ''; // Clear the list
  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    list.appendChild(li);
  });
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