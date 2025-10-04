const puppeteer = require('puppeteer');
const fs = require('fs');
const axios = require('axios');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const page = await browser.newPage();

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

  await page.goto('https://bc.game/crash', { waitUntil: 'networkidle2' });

  console.log('👀 Listening for new crash multipliers...');

  // Expose a function so page context can call Node.js
  await page.exposeFunction('sendMultiplier', async (data) => {
    console.log('New multiplier:', data);
    try {
      await axios.post('http://localhost:3000/crash-data', data);
    } catch (err) {
      console.error('Failed to send to backend:', err.message);
    }
  });

  // Inject MutationObserver into the page
  await page.evaluate(() => {
    const selectors = [
      'span.font-extrabold.text-warning',
      'span.font-extrabold.text-success',
      'span.font-extrabold.moon-btn-text'
    ];

    const seen = new Set();

    const observer = new MutationObserver(() => {
      selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          const text = el.textContent.trim();
          if (!seen.has(text)) {
            const match = text.match(/(\d+\.?\d*)×/);
            if (match) {
              seen.add(text);
              window.sendMultiplier({
                multiplier: parseFloat(match[1]),
                rawText: text,
                timestamp: new Date().toISOString()
              });
            }
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });

// strategy.js

// --- Strategy Engine ---
function evaluateStrategy(multiplier, round) {
  // Example conditions (replace with your own logic)
  if (multiplier < 2) {
    return { action: 'ALERT', reason: 'Low multiplier', round, multiplier };
  }
  if (multiplier > 10) {
    return { action: 'ALERT', reason: 'High multiplier jackpot', round, multiplier };
  }
  return { action: 'NONE', round, multiplier };
}

// --- Alert System ---
function handleDecision(decision) {
  if (decision.action === 'ALERT') {
    console.log(
      `🚨 [Round ${decision.round}] Multiplier: ${decision.multiplier}× | Reason: ${decision.reason}`
    );
    // Optionally: send to backend, write to file, trigger notification
  }
}

// --- Integration with Listener ---
let round = 0;

function onNewMultiplier(multiplier) {
  round++;
  const decision = evaluateStrategy(multiplier, round);
  handleDecision(decision);
}

// Export for use in your main listener
module.exports = { onNewMultiplier };
  // Keep process alive
})();