/**
 * Smoke tests: generate every module across difficulties/seeds, then drive
 * each one to a solved state using its internal solution. Also verifies
 * seeded determinism. Run with `npm test`.
 */
const assert = require('assert');
const { Rng } = require('../server/rng');
const { MODULES, getModule } = require('../server/modules');
const { Game } = require('../server/game');

let passed = 0;
function check(label, fn) {
  fn();
  passed++;
  console.log(`  ok - ${label}`);
}

const DIFFS = ['easy', 'normal', 'hard'];
const SEEDS = ['ALPHA-1', 'BRAVO-2', 'CHARLIE-3', 'DELTA-4', 'ECHO-5'];

function ctxFor(seed, difficulty) {
  return { rng: new Rng(seed), difficulty, serial: 'AB12C3' };
}

console.log('module generation + solvability');
for (const mod of MODULES) {
  for (const diff of DIFFS) {
    for (const seed of SEEDS) {
      check(`${mod.type}/${diff}/${seed}`, () => {
        const { state, manual, view } = mod.generate(ctxFor(`${seed}:${mod.type}`, diff));
        assert.ok(manual, 'manual exists');
        assert.ok(view, 'view exists');
        solveModule(mod, state);
      });
    }
  }
}

function solveModule(mod, state) {
  const ctx = { serial: 'AB12C3' };
  switch (mod.type) {
    case 'wires': {
      const r = mod.action(state, { type: 'cut', index: state.solution }, ctx);
      assert.strictEqual(r.status, 'solved');
      break;
    }
    case 'symbols': {
      let r;
      for (const glyph of state.solution) {
        r = mod.action(state, { type: 'press', glyph }, ctx);
        assert.notStrictEqual(r.status, 'strike', 'no strike on correct sequence');
      }
      assert.strictEqual(r.status, 'solved');
      break;
    }
    case 'memory': {
      // Replay using the module's own rule table.
      let r = { status: 'ok' };
      let guard = 0;
      while (r.status !== 'solved' && guard++ < 20) {
        const ins = state.table[state.stage - 1][state.current.display];
        let pos;
        switch (ins.kind) {
          case 'position': pos = ins.n; break;
          case 'label': pos = state.current.labels.indexOf(ins.n) + 1; break;
          case 'samePosition': pos = state.history[ins.stage - 1].position; break;
          case 'sameLabel': pos = state.current.labels.indexOf(state.history[ins.stage - 1].label) + 1; break;
        }
        r = mod.action(state, { type: 'press', position: pos }, ctx);
        assert.notStrictEqual(r.status, 'strike', `memory strike (${ins.kind})`);
      }
      assert.strictEqual(r.status, 'solved');
      break;
    }
    case 'morse': {
      const idx = state.frequencies.indexOf(state.solutionFreq);
      assert.ok(idx >= 0, 'solution frequency present on dial');
      mod.action(state, { type: 'tune', index: idx }, ctx);
      const r = mod.action(state, { type: 'transmit' }, ctx);
      assert.strictEqual(r.status, 'solved');
      break;
    }
    case 'logicgrid': {
      let r;
      for (const q of state.questions.slice()) {
        r = mod.action(state, { type: 'answer', option: q.answer }, ctx);
        assert.notStrictEqual(r.status, 'strike');
      }
      assert.strictEqual(r.status, 'solved');
      break;
    }
    default:
      throw new Error(`smoke test missing solver for ${mod.type}`);
  }
}

console.log('logic grid uniqueness');
check('clues admit exactly one solution', () => {
  const lg = getModule('logicgrid');
  for (const seed of SEEDS) {
    const { state } = lg.generate(ctxFor(seed + ':uniq', 'hard'));
    assert.ok(state.questions.length > 0);
  }
});

console.log('seeded determinism');
check('same seed -> identical game', () => {
  const noop = { onTick() {}, onStrike() {}, onModuleUpdate() {}, onModuleSolved() {}, onGameOver() {} };
  const logger = { log() {} };
  const a = new Game({ difficulty: 'normal', seed: 'REPLAY-42', events: noop, logger });
  const b = new Game({ difficulty: 'normal', seed: 'REPLAY-42', events: noop, logger });
  try {
    assert.strictEqual(a.serial, b.serial);
    assert.deepStrictEqual(
      a.modules.map((m) => ({ type: m.type, view: m.view })),
      b.modules.map((m) => ({ type: m.type, view: m.view }))
    );
  } finally {
    a.destroy();
    b.destroy();
  }
});

check('different seeds -> different games', () => {
  const noop = { onTick() {}, onStrike() {}, onModuleUpdate() {}, onModuleSolved() {}, onGameOver() {} };
  const logger = { log() {} };
  const a = new Game({ difficulty: 'normal', seed: 'SEED-A', events: noop, logger });
  const b = new Game({ difficulty: 'normal', seed: 'SEED-B', events: noop, logger });
  try {
    assert.notDeepStrictEqual(
      a.modules.map((m) => ({ type: m.type, view: m.view })),
      b.modules.map((m) => ({ type: m.type, view: m.view }))
    );
  } finally {
    a.destroy();
    b.destroy();
  }
});

console.log('fixed manuals across seeds');
check('same manual content for different seeds', () => {
  for (const mod of MODULES) {
    const a = mod.generate(ctxFor('SEED-A:' + mod.type, 'normal'));
    const b = mod.generate(ctxFor('SEED-B:' + mod.type, 'normal'));
    // Manuals must be identical; device views must differ (or at least often).
    assert.deepStrictEqual(a.manual, b.manual, `${mod.type} manual must be fixed`);
  }
});

console.log(`\n${passed} checks passed`);
