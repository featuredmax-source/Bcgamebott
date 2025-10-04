const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json()); // allows JSON body parsing

// Store crash data in memory for now
let crashData = [];

// Endpoint to receive data from Puppeteer
app.post('/crash-data', (req, res) => {
  const round = req.body;
  crashData.push(round);
  console.log('Received crash data:', round);
  res.sendStatus(200);
});

// Endpoint to view latest data
app.get('/crash-data', (req, res) => {
  res.json(crashData.slice(-10)); // last 10 entries
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});