const puppeteer = require('puppeteer');
const fs = require('fs');
const axios = require('axios');
const { onNewMultiplier } = require('./strategy');

// Example integration
onNewMultiplier(1.66);
onNewMultiplier(2.62);
onNewMultiplier(1.1);
// ... keep feeding live multipliers

let counter = 0; // global counter for multipliers
const logFile = 'multipliers.log';

async function startListener() {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true, // flip to false if you want to watch it
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      defaultViewport: null,
      args: [
        '--start-maximized',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const page = await browser.newPage();

    // Match your real Chrome UA
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

    console.log('👀 Beast mode: Listening for new crash multipliers...');

    // Expose Node function to receive multipliers
    await page.exposeFunction('sendMultiplier', async (data) => {
      counter += 1;
      const enriched = { id: counter, ...data };
      console.log(`🔥 [${enriched.id}] Multiplier: ${enriched.multiplier}×`);

      // Append to local log file
      fs.appendFileSync(
        logFile,
        JSON.stringify(enriched) + '\n',
        'utf8'
      );

      // Send to backend
      try {
        await axios.post('http://localhost:3000/crash-data', enriched);
      } catch (err) {
        console.error('❌ Failed to send to backend:', err.message);
      }
    });

    // Inject MutationObserver
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

    // Heartbeat log every 5 minutes
    setInterval(() => {
      console.log('💓 Beast still alive at', new Date().toISOString());
    }, 5 * 60 * 1000);

    // Handle page close/crash
    page.on('close', () => {
      console.warn('⚠️ Page closed. Restarting...');
      browser.close().catch(() => {});
      setTimeout(startListener, 5000);
    });

    page.on('error', (err) => {
      console.error('⚠️ Page error:', err);
      browser.close().catch(() => {});
      setTimeout(startListener, 5000);
    });

  } catch (err) {
    console.error('💥 Fatal error, restarting in 10s:', err.message);
    if (browser) await browser.close().catch(() => {});
    setTimeout(startListener, 10000);
  }
}

// Start the beast
startListener();