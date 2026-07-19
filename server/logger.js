/**
 * Session logger: one JSONL file per game session under ./logs.
 * Every meaningful game event is appended for post-game debugging.
 */
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');

class SessionLogger {
  constructor(roomCode) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.file = path.join(LOG_DIR, `${roomCode}-${stamp}.jsonl`);
  }

  log(event, payload = {}) {
    const line = JSON.stringify({ t: new Date().toISOString(), event, ...payload });
    fs.appendFile(this.file, line + '\n', () => {});
    if (process.env.DEBUG) console.log(`[session] ${event}`, payload);
  }
}

module.exports = { SessionLogger };
