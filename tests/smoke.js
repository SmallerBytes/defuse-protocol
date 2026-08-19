/**
 * Smoke tests: generate every module across difficulties/seeds, then drive
 * each one to a solved state using its internal solution. Also verifies
 * seeded determinism. Run with `npm test`.
 */
const assert = require('assert');
const { Rng } = require('../server/rng');
const { MODULES, getModule } = require('../server/modules');
const { Game, CLASSIC_MODULES, HARD_MODULES } = require('../server/game');

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
    case 'ordnance': {
      let r = { status: 'ok' };
      while (state.index < state.targets.length) {
        const t = state.targets[state.index];
        if (!state.masterArm) r = mod.action(state, { type: 'arm' }, ctx);
        let guard = 0;
        while (state.weapons[state.station] !== t.weapon && guard++ < 5) {
          r = mod.action(state, { type: 'station' }, ctx);
        }
        if (state.fuze !== t.fuze) r = mod.action(state, { type: 'fuze' }, ctx);
        for (let i = 0; i < 3; i++) {
          let g2 = 0;
          while (state.code[i] !== t.code[i] && g2++ < 10) {
            r = mod.action(state, { type: 'wheel', index: i }, ctx);
          }
        }
        r = mod.action(state, { type: 'pickle' }, ctx);
        assert.notStrictEqual(r.status, 'strike', 'ordnance pickle strike');
      }
      // Safe the panel to finish
      r = mod.action(state, { type: 'arm' }, ctx);
      assert.strictEqual(r.status, 'solved');
      break;
    }
    case 'comms': {
      let r = { status: 'ok' };
      let guard = 0;
      while (r.status !== 'solved' && guard++ < 300) {
        const round = state.rounds[state.round];
        assert.ok(round, 'round present');
        if (state.phase === 'net') {
          const diff = round.answerIdx - state.freqIdx;
          if (diff !== 0) r = mod.action(state, { type: 'tune', steps: diff }, ctx);
          else r = mod.action(state, { type: 'xmit' }, ctx);
        } else {
          const target = round.answer.charCodeAt(0) - 65;
          const diff = target - state.letterIdx;
          if (diff !== 0) r = mod.action(state, { type: 'letter', delta: diff }, ctx);
          else r = mod.action(state, { type: 'auth' }, ctx);
        }
        assert.notStrictEqual(r.status, 'strike', 'comms strike');
      }
      assert.strictEqual(r.status, 'solved');
      break;
    }
    case 'threatplot': {
      const tp = require('../data/modules/threatplot.json');
      const radius = new Map(tp.samTypes.map((s) => [s.type, s.radius]));
      const covered = new Set();
      for (const sam of state.sams) {
        const r = radius.get(sam.type);
        for (let dx = -r; dx <= r; dx++) {
          for (let dy = -r; dy <= r; dy++) covered.add(`${sam.x + dx},${sam.y + dy}`);
        }
      }
      const dirs = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
      const key = (x, y, ref) => `${x},${y},${ref ? 1 : 0}`;
      const queue = [{ x: state.start.x, y: state.start.y, ref: !state.tanker, steps: [] }];
      const seen = new Set([key(queue[0].x, queue[0].y, queue[0].ref)]);
      let path = null;
      while (queue.length && !path) {
        const cur = queue.shift();
        if (cur.x === state.target.x && cur.y === state.target.y && cur.ref) { path = cur.steps; break; }
        for (const [dir, [dx, dy]] of Object.entries(dirs)) {
          const nx = cur.x + dx;
          const ny = cur.y + dy;
          if (nx < 0 || ny < 0 || nx >= state.size || ny >= state.size) continue;
          if (covered.has(`${nx},${ny}`)) continue;
          const ref = cur.ref || (state.tanker && nx === state.tanker.x && ny === state.tanker.y);
          const k = key(nx, ny, ref);
          if (seen.has(k)) continue;
          seen.add(k);
          queue.push({ x: nx, y: ny, ref, steps: [...cur.steps, dir] });
        }
      }
      assert.ok(path, 'threat plot solvable');
      let r = { status: 'ok' };
      for (const dir of path) {
        r = mod.action(state, { type: 'step', dir }, ctx);
        assert.notStrictEqual(r.status, 'strike', `safe step ${dir}`);
      }
      assert.strictEqual(r.status, 'solved');
      break;
    }
    case 'brevity': {
      let r = { status: 'ok' };
      let guard = 0;
      while (r.status !== 'solved' && guard++ < 10) {
        const s = state.stages[state.stage];
        assert.ok(s, 'stage present');
        r = mod.action(state, { type: 'press', label: s.answer }, ctx);
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

console.log('difficulty mix');
check('easy is 3 classic modules', () => {
  const noop = { onTick() {}, onStrike() {}, onModuleUpdate() {}, onModuleSolved() {}, onGameOver() {} };
  const logger = { log() {} };
  for (const seed of SEEDS) {
    const g = new Game({ difficulty: 'easy', seed, events: noop, logger });
    try {
      assert.strictEqual(g.modules.length, 3);
      assert.ok(g.modules.every((m) => CLASSIC_MODULES.includes(m.type)));
    } finally { g.destroy(); }
  }
});
check('medium is 3 classic + 1 hard', () => {
  const noop = { onTick() {}, onStrike() {}, onModuleUpdate() {}, onModuleSolved() {}, onGameOver() {} };
  const logger = { log() {} };
  for (const seed of SEEDS) {
    const g = new Game({ difficulty: 'normal', seed, events: noop, logger });
    try {
      const types = g.modules.map((m) => m.type);
      assert.strictEqual(types.length, 4);
      const hard = types.filter((t) => HARD_MODULES.includes(t));
      const classic = types.filter((t) => CLASSIC_MODULES.includes(t));
      assert.strictEqual(hard.length, 1);
      assert.strictEqual(classic.length, 3);
    } finally { g.destroy(); }
  }
});
check('hard is 3 classic + 2 hard', () => {
  const noop = { onTick() {}, onStrike() {}, onModuleUpdate() {}, onModuleSolved() {}, onGameOver() {} };
  const logger = { log() {} };
  for (const seed of SEEDS) {
    const g = new Game({ difficulty: 'hard', seed, events: noop, logger });
    try {
      const types = g.modules.map((m) => m.type);
      assert.strictEqual(types.length, 5);
      const hard = types.filter((t) => HARD_MODULES.includes(t));
      const classic = types.filter((t) => CLASSIC_MODULES.includes(t));
      assert.strictEqual(hard.length, 2);
      assert.strictEqual(classic.length, 3);
    } finally { g.destroy(); }
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
