const axios = require('axios');
const cheerio = require('cheerio');

// URL of the third-party website to scrape
const url = 'https://example.com';

async function scrapeData() {
  try {
    // Fetch the HTML of the page
    const { data } = await axios.get(url);
    
    // Load the HTML into cheerio
    const $ = cheerio.load(data);
    
    // Extract the data you need
    const scrapedData = [];
    $('selector-for-data').each((index, element) => {
      const item = $(element).text().trim();
      scrapedData.push(item);
    });

    // Log the scraped data
    console.log(scrapedData);

    // Return the scraped data
    return scrapedData;
  } catch (error) {
    console.error('Error scraping data:', error);
    return null;
  }
}

// Export the scrapeData function
module.exports = scrapeData;