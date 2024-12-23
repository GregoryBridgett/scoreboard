import { handleError } from './handleError.js';

/**
 * Fetches the HTML content of a given URL and returns a parsed document object.
 *
 * @param {string} url - The URL to fetch.
 * @returns {Promise<Document>} A Promise that resolves with the parsed document object.
 *
 * @throws {Error} If there is an error fetching the URL or parsing the HTML.
 */
export async function fetchDocument(url) {
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
export async function fetchGameSheetJson(url) {
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
