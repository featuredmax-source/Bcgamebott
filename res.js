const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,              // 👈 turn off headless mode
    defaultViewport: null,        // 👈 use your full screen size
    args: ['--start-maximized']   // 👈 open the window maximized
  });

  const page = await browser.newPage();
  await page.goto('https://bc.game/game/crash', { waitUntil: 'networkidle2' });

  // Keep the browser open so you can see it
  // await browser.close();  <-- comment this out while debugging
})();