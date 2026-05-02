const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const screenshotsDir = path.join(__dirname, '..', '.github', 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const pages = [
  { url: 'http://localhost:3005', name: 'landing', waitFor: '.taste-hero-title' },
  { url: 'http://localhost:3005/command', name: 'command', waitFor: '.command-cinema-title' },
  { url: 'http://localhost:3005/assets', name: 'assets', waitFor: '.asset-archive-hero' },
  { url: 'http://localhost:3005/incidents', name: 'incidents', waitFor: '.incident-board-hero' },
  { url: 'http://localhost:3005/scans', name: 'scans', waitFor: '.scans-hero' },
  { url: 'http://localhost:3005/topology', name: 'topology', waitFor: '.observatory-hero' },
  { url: 'http://localhost:3005/reports', name: 'reports', waitFor: '.reports-hero' },
  { url: 'http://localhost:3005/settings', name: 'settings', waitFor: '.settings-hero' },
];

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  for (const pageConfig of pages) {
    const page = await context.newPage();
    try {
      await page.goto(pageConfig.url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForSelector(pageConfig.waitFor, { timeout: 10000 });
      // Wait for data to populate and animations to settle
      await page.waitForTimeout(2000);
      
      const screenshotPath = path.join(screenshotsDir, `${pageConfig.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      // Verify screenshot has content (check file size > 50KB)
      const stats = fs.statSync(screenshotPath);
      if (stats.size < 50000) {
        console.warn(`Warning: ${pageConfig.name}.png may be empty (${stats.size} bytes)`);
      } else {
        console.log(`Screenshot saved: ${pageConfig.name}.png (${Math.round(stats.size/1024)}KB)`);
      }
    } catch (err) {
      console.error(`Failed to screenshot ${pageConfig.name}: ${err.message}`);
    }
    await page.close();
  }

  await browser.close();
  console.log('All screenshots done');
})();
