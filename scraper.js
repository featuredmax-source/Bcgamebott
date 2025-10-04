const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // keep visible for debugging
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const page = await browser.newPage();

  // Same user agent as your real Chrome
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
  );

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  // Load cookies
  const cookies = JSON.parse(fs.readFileSync('cookies.json', 'utf8'));
  await page.setCookie(...cookies);

  await page.goto('https://bc.game/game/crash', { waitUntil: 'networkidle2' });

  // Wait for multipliers to appear
  await page.waitForSelector('span.font-extrabold', { timeout: 60000 });

  // Extract multipliers
  const multipliers = await page.evaluate(() => {
    const selectors = [
      'span.font-extrabold.text-warning',
      'span.font-extrabold.text-success',
      'span.font-extrabold.moon-btn-text'
    ];
    const results = [];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        const text = el.textContent.trim();
        const match = text.match(/(\d+\.?\d*)×/);
        if (match) {
          results.push({
            multiplier: parseFloat(match[1]),
            rawText: text,
            timestamp: new Date().toISOString()
          });
        }
      });
    });
    return results;
  });

  console.log('Scraped multipliers:', multipliers);

  await browser.close();
})();