import puppeteer from 'puppeteer';
import opentype from 'opentype.js';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FONT_URL = 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf';

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon-180.png', size: 180 },
];

// Download font and return buffer
function downloadFont(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

// Generate SVG path for Inter "b" character
function generateBPath(font, fontSize, centerX, baselineY) {
  const textWidth = font.getAdvanceWidth('b', fontSize);
  const x = centerX - textWidth / 2;
  const path = font.getPath('b', x, baselineY, fontSize);
  return path.toSVG().match(/d="([^"]+)"/)[1];
}

async function generateIcons() {
  console.log('Downloading Inter font...');
  const fontBuffer = await downloadFont(FONT_URL);
  const font = opentype.parse(fontBuffer.buffer);
  
  // Generate the "b" path for the 512x512 viewBox
  const bPath = generateBPath(font, 352, 256, 384);
  
  // Generate icon.svg with path instead of text
  const svgContent = `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <mask id="b-cutout">
      <rect width="512" height="512" fill="white"/>
      <path d="${bPath}" fill="black"/>
    </mask>
  </defs>
  <rect width="512" height="512" rx="96" fill="#e0e0e0" mask="url(#b-cutout)"/>
</svg>
`;
  
  const svgPath = path.join(__dirname, '../public/icons/icon.svg');
  fs.writeFileSync(svgPath, svgContent);
  console.log('Generated: icon.svg');

  // Generate PNG icons using Puppeteer
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  for (const { name, size } of sizes) {
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    
    // Render SVG with Inter font and transparent background (b cutout is transparent)
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            @font-face {
              font-family: 'Inter';
              font-style: normal;
              font-weight: 700;
              src: url('${FONT_URL}') format('truetype');
            }
            * { margin: 0; padding: 0; }
            html, body { 
              width: ${size}px; 
              height: ${size}px; 
              overflow: hidden;
            }
          </style>
        </head>
        <body>
          <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
            <defs>
              <mask id="b-cutout">
                <rect width="512" height="512" fill="white"/>
                <text x="256" y="384" font-family="Inter, sans-serif" font-size="352" font-weight="700" text-anchor="middle" fill="black">b</text>
              </mask>
            </defs>
            <rect width="512" height="512" rx="96" fill="#e0e0e0" mask="url(#b-cutout)"/>
          </svg>
        </body>
      </html>
    `;
    
    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForFunction(() => document.fonts.ready);
    
    const outputPath = path.join(__dirname, '../public/icons', name);
    await page.screenshot({ path: outputPath, omitBackground: true });
    console.log(`Generated: ${name} (${size}x${size})`);
  }

  await browser.close();
  console.log('Done!');
}

generateIcons().catch(console.error);
