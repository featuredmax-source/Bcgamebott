const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // show Chrome so you can log in
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // adjust if Chrome is elsewhere
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const page = await browser.newPage();

  // Use your real Chrome user agent (copy from navigator.userAgent in Chrome)
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
  );

  // Hide webdriver flag
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  await page.goto('https://bc.game/crash', { waitUntil: 'networkidle2' });

  console.log('👉 Log in manually in the opened Chrome window.');
  console.log('When you are fully logged in, return here and press ENTER.');

  // Wait for you to press Enter
  process.stdin.resume();
  process.stdin.on('data', async () => {
    const cookies = await page.cookies();
    fs.writeFileSync('cookies.json', JSON.stringify(cookies, null, 2));
    console.log('✅ Cookies saved to cookies.json');
    await browser.close();
    process.exit();
  });
})();