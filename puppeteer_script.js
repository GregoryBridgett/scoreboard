const puppeteer = require('puppeteer');
const fs = require('node:fs/promises');

async function downloadRenderedPage(url, outputPath) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });
  const htmlContent = await page.content();
  await fs.writeFile(outputPath, htmlContent);
  await browser.close();
}

// Example usage
const urlToDownload = 'https://www.example.com';
const outputHtmlFile = 'example.html';
downloadRenderedPage(urlToDownload, outputHtmlFile);