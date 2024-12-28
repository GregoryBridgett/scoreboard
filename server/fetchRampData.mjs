import { handleError } from './handleError.mjs';

let cachedDocument = null;

/**
 * Fetches the HTML content of a given URL and returns a parsed document object.
 *
 * @param {string} url - The URL to fetch.
 * @returns {Promise<Document>} A Promise that resolves with the parsed document object.
 *
 * @throws {Error} If there is an error fetching the URL or parsing the HTML.
 */
export async function fetchDocument(url = 'http://ringetteontariogames.msa4.rampinteractive.com/') {

 if (url === `http://ringetteontariogames.msa4.rampinteractive.com/` && cachedDocument) {
    console.log('Returning cached document');
    return cachedDocument; // Return the cached document if available
}
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
  cachedDocument = document;
  return document;
}

export async function fetchGamesheet(divisionId,gamesheetId) {

  const url = `https://ringetteontario.com/division/0/${divisionId}/gamesheet/${gamesheetId}`;
  
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
  cachedDocument = document;
  return document;
}

