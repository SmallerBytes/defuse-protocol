/**
 * Lightweight statistics persistence. A JSON file stands in for a database;
 * see docs/ARCHITECTURE.md for the equivalent SQL schema if you outgrow it.
 */
const fs = require('fs');
const path = require('path');

const STATS_FILE = path.join(__dirname, '..', 'data', 'stats.json');

const DEFAULT_STATS = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  totalStrikes: 0,
  modulesSolved: 0,
  fastestWinMs: null,
  byDifficulty: {
    easy: { played: 0, wins: 0 },
    normal: { played: 0, wins: 0 },
    hard: { played: 0, wins: 0 }
  },
  recentGames: []
};

function load() {
  try {
    return { ...DEFAULT_STATS, ...JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')) };
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_STATS));
  }
}

function save(stats) {
  fs.mkdirSync(path.dirname(STATS_FILE), { recursive: true });
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
}

/**
 * Record a finished game.
 * @param {object} result { won, difficulty, seed, strikes, modulesSolved, durationMs, timeRemainingMs }
 */
function recordGame(result) {
  const stats = load();
  stats.gamesPlayed++;
  stats.totalStrikes += result.strikes;
  stats.modulesSolved += result.modulesSolved;
  if (result.won) {
    stats.wins++;
    if (stats.fastestWinMs === null || result.durationMs < stats.fastestWinMs) {
      stats.fastestWinMs = result.durationMs;
    }
  } else {
    stats.losses++;
  }
  const diff = stats.byDifficulty[result.difficulty] || { played: 0, wins: 0 };
  diff.played++;
  if (result.won) diff.wins++;
  stats.byDifficulty[result.difficulty] = diff;

  stats.recentGames.unshift({
    at: new Date().toISOString(),
    won: result.won,
    difficulty: result.difficulty,
    seed: result.seed,
    strikes: result.strikes,
    durationMs: result.durationMs
  });
  stats.recentGames = stats.recentGames.slice(0, 20);
  save(stats);
  return stats;
}

module.exports = { load, recordGame };
