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
export function getDivisionId(leagueText, divisionText, document) {
  if (leagueText === "Tournaments") {
    return null;
    // Finish writing this code
  } 

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
