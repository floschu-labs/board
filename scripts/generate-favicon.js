import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');

async function generateFavicon() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  
  // Set viewport to favicon size
  await page.setViewport({
    width: 32,
    height: 32,
    deviceScaleFactor: 1,
  });

  // Create HTML with the favicon design
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; }
        body { 
          width: 32px; 
          height: 32px; 
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fbbf24;
          border-radius: 6px;
        }
        .letter {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 22px;
          font-weight: bold;
          color: #0f0f0f;
        }
      </style>
    </head>
    <body>
      <span class="letter">b</span>
    </body>
    </html>
  `;

  await page.setContent(html);
  
  const screenshotPath = path.join(ROOT_DIR, 'public', 'favicon.png');
  await page.screenshot({
    path: screenshotPath,
    type: 'png',
    omitBackground: false,
  });

  console.log(`Favicon PNG saved to ${screenshotPath}`);

  await browser.close();
}

generateFavicon().catch((err) => {
  console.error('Favicon generation failed:', err);
  process.exit(1);
});
