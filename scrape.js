// scrape.js
import fs from 'fs';
import { chromium } from 'playwright'; // or use puppeteer / cheerio

async function scrapeNursery() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://www.wainotnativenursery.co.nz/');
  
  // Extract text and rough semantic structures
  const content = await page.evaluate(() => {
    return {
      title: document.title,
      headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.innerText),
      paragraphs: Array.from(document.querySelectorAll('p')).map(p => p.innerText),
      listItems: Array.from(document.querySelectorAll('li')).map(li => li.innerText)
    };
  });

  fs.writeFileSync('./current-site-context.json', JSON.stringify(content, null, 2));
  console.log('✅ Public website copy cached locally for AI context.');
  await browser.close();
}
scrapeNursery();
