// strategy.js

// --- Config ---
const BASE_BET = 20;          // base stake in units
const CASHOUT = 5.3;          // target multiplier
const MARTINGALE = 1.2;       // recovery multiplier
const MAX_ATTEMPTS = 12;      // 1 main + 11 recoveries

// Rolling history of multipliers
let history = [];

// PnL tracking
let equity = 0;
let peakEquity = 0;
let maxDrawdown = 0;

// --- Helper Functions ---
function weightedRatio(mults, win) {
  if (mults.length < win) return null;
  const seg = mults.slice(-win);
  const weights = Array.from({ length: win }, (_, k) => k + 1);
  const sumW = weights.reduce((a, b) => a + b, 0);
  return seg.reduce((acc, v, idx) => acc + v * weights[idx], 0) / sumW;
}

function hr15(mults) {
  if (mults.length < 15) return null;
  const seg = mults.slice(-15);
  const hot = seg.filter(v => v >= 2.0).length;
  return hot / 15;
}

function volatilityIndex(mults, win) {
  if (mults.length < win) return null;
  const seg = mults.slice(-win);
  const mean = seg.reduce((a, b) => a + b, 0) / seg.length;
  if (mean === 0) return null;
  const variance = seg.reduce((a, b) => a + (b - mean) ** 2, 0) / seg.length;
  return Math.sqrt(variance) / mean;
}

function alternationIndex(mults, win) {
  if (mults.length < win) return null;
  const seg = mults.slice(-win).map(v => (v >= 2 ? 2 : 1));
  let changes = 0;
  for (let i = 1; i < seg.length; i++) {
    if (seg[i] !== seg[i - 1]) changes++;
  }
  return changes / (win - 1);
}

function updateDrawdown(pnl) {
  equity += pnl;
  if (equity > peakEquity) peakEquity = equity;
  const dd = peakEquity - equity;
  if (dd > maxDrawdown) maxDrawdown = dd;
}

// --- Strategy Evaluation ---
function evaluateStrategy(multiplier, round) {
  history.push(multiplier);

  // Maintain rolling window length (max needed = 15)
  if (history.length > 50) history.shift();

  const wr = weightedRatio(history, 8);
  const hr = hr15(history);
  const vi = volatilityIndex(history, 12);
  const alt = alternationIndex(history, 8);

  const baseOk = wr !== null && wr >= 2 && hr !== null && hr >= 0.4 && vi !== null && vi >= 0.7;
  const altOk = alt !== null && alt >= 0.5; // Reject if < 0.5

  if (baseOk && altOk) {
    // Trigger Martingale sequence
    let stake = BASE_BET;
    let pnl = 0;
    let result = "Loss";

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const idx = history.length - 1 + attempt;
      if (idx >= history.length) break; // wait for future rounds in live mode

      const mult = history[idx];
      if (mult >= CASHOUT) {
        pnl += stake * (CASHOUT - 1);
        result = "Win";
        break;
      } else {
        pnl -= stake;
        stake *= MARTINGALE;
      }
    }

    updateDrawdown(pnl);

    return {
      action: "ALERT",
      round,
      multiplier,
      reason: `WR=${wr.toFixed(2)}, HR15=${hr.toFixed(2)}, VI=${vi.toFixed(2)}, ALT=${alt.toFixed(2)}`,
      pnl,
      equity,
      maxDrawdown,
      result
    };
  }

  return { action: "NONE" };
}

// --- Alert System ---
function handleDecision(decision) {
  if (decision.action === "ALERT") {
    console.log(`
      🚨[Round ${decision.round}] Multiplier: ${decision.multiplier}× | ${decision.reason} | Result: ${decision.result} | PnL: ${decision.pnl.toFixed(2)}| Equity: ${decision.equity.toFixed(2)} | MaxDD: ${decision.maxDrawdown.toFixed(2)}
    `);
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