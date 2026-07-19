/**
 * GAME ENGINE
 * Owns the authoritative state of one round: timer, strikes, module
 * instances. Pure of any socket knowledge; the Room wires events out.
 */
const { Rng, randomSeed } = require('./rng');
const { getModule, MODULES } = require('./modules');

const DIFFICULTY = {
  easy:   { moduleCount: 3, timeMs: 6 * 60 * 1000,   maxStrikes: 3, strikeAccel: 0.15 },
  normal: { moduleCount: 5, timeMs: 5 * 60 * 1000,   maxStrikes: 3, strikeAccel: 0.25 },
  hard:   { moduleCount: 5, timeMs: 3.5 * 60 * 1000, maxStrikes: 2, strikeAccel: 0.35 }
};

function makeSerial(rng) {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '0123456789';
  return (
    rng.pick([...letters]) + rng.pick([...letters]) +
    rng.pick([...digits]) + rng.pick([...digits]) +
    rng.pick([...letters]) + rng.pick([...digits])
  );
}

class Game {
  /**
   * @param {object} opts { difficulty, seed, events: { onTick, onStrike, onModuleUpdate, onModuleSolved, onGameOver } }
   */
  constructor({ difficulty = 'normal', seed, events, logger }) {
    this.difficulty = DIFFICULTY[difficulty] ? difficulty : 'normal';
    this.config = DIFFICULTY[this.difficulty];
    this.seed = seed && String(seed).trim() ? String(seed).trim().toUpperCase() : randomSeed();
    this.events = events;
    this.logger = logger;

    const rng = new Rng(this.seed);
    this.serial = makeSerial(rng);
    this.strikes = 0;
    this.remainingMs = this.config.timeMs;
    this.status = 'running'; // running | won | lost
    this.startedAt = Date.now();

    // Pick module types: every type once if count allows, random subset otherwise.
    const types = rng.shuffle(MODULES.map((m) => m.type)).slice(0, this.config.moduleCount);
    this.modules = types.map((type, i) => {
      const mod = getModule(type);
      const ctx = { rng: rng.child(`${type}#${i}`), difficulty: this.difficulty, serial: this.serial };
      const { state, manual, view } = mod.generate(ctx);
      return { id: `m${i + 1}`, type, name: mod.name, state, manual, view, solved: false };
    });

    this.logger.log('game:start', {
      seed: this.seed, difficulty: this.difficulty, serial: this.serial,
      modules: this.modules.map((m) => ({ id: m.id, type: m.type }))
    });

    this._lastTick = Date.now();
    this._interval = setInterval(() => this._tick(), 500);
  }

  get timeScale() {
    return 1 + this.strikes * this.config.strikeAccel;
  }

  _tick() {
    if (this.status !== 'running') return;
    const now = Date.now();
    this.remainingMs -= (now - this._lastTick) * this.timeScale;
    this._lastTick = now;
    if (this.remainingMs <= 0) {
      this.remainingMs = 0;
      this._end('lost', 'timer');
      return;
    }
    this.events.onTick({ remainingMs: Math.round(this.remainingMs), timeScale: this.timeScale });
  }

  /** Defuser interacted with a module. */
  handleAction(moduleId, action, playerName) {
    if (this.status !== 'running') return;
    const inst = this.modules.find((m) => m.id === moduleId);
    if (!inst || inst.solved) return;

    const mod = getModule(inst.type);
    const result = mod.action(inst.state, action, { serial: this.serial });
    inst.view = result.view;

    this.logger.log('module:action', {
      moduleId, type: inst.type, action, status: result.status, detail: result.detail, by: playerName
    });

    this.events.onModuleUpdate({ moduleId, view: result.view });

    if (result.status === 'strike') {
      this.strikes++;
      this.events.onStrike({ strikes: this.strikes, maxStrikes: this.config.maxStrikes, moduleId });
      if (this.strikes >= this.config.maxStrikes) {
        this._end('lost', 'strikes');
        return;
      }
    } else if (result.status === 'solved') {
      inst.solved = true;
      this.events.onModuleSolved({ moduleId, solvedCount: this.solvedCount() });
      if (this.modules.every((m) => m.solved)) {
        this._end('won', 'all modules defused');
      }
    }
  }

  solvedCount() {
    return this.modules.filter((m) => m.solved).length;
  }

  _end(result, reason) {
    if (this.status !== 'running') return;
    this.status = result;
    clearInterval(this._interval);
    const summary = {
      result,
      reason,
      seed: this.seed,
      difficulty: this.difficulty,
      strikes: this.strikes,
      modulesSolved: this.solvedCount(),
      modulesTotal: this.modules.length,
      timeRemainingMs: Math.max(0, Math.round(this.remainingMs)),
      durationMs: Date.now() - this.startedAt
    };
    this.logger.log('game:over', summary);
    this.events.onGameOver(summary);
  }

  /** Payload for the Defuser: module views, never rules. */
  defuserPayload() {
    return {
      role: 'defuser',
      seed: this.seed,
      difficulty: this.difficulty,
      serial: this.serial,
      timeMs: Math.round(this.remainingMs),
      maxStrikes: this.config.maxStrikes,
      strikes: this.strikes,
      modules: this.modules.map((m) => ({ id: m.id, type: m.type, name: m.name, view: m.view, solved: m.solved }))
    };
  }

  /** Payload for Experts: manuals only, never device views or the serial. */
  expertPayload() {
    return {
      role: 'expert',
      seed: this.seed,
      difficulty: this.difficulty,
      timeMs: Math.round(this.remainingMs),
      maxStrikes: this.config.maxStrikes,
      strikes: this.strikes,
      manuals: this.modules.map((m) => ({ id: m.id, type: m.type, name: m.name, manual: m.manual, solved: m.solved }))
    };
  }

  destroy() {
    clearInterval(this._interval);
  }
}

module.exports = { Game, DIFFICULTY };
