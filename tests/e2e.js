/**
 * End-to-end test over real WebSockets: a Defuser and an Expert join a
 * room, the host arms the device, the Defuser deliberately strikes once,
 * then solves every module using a "cheating" replay of the same seed.
 * Usage: node tests/e2e.js [port]   (server must be running)
 */
const assert = require('assert');
const { io } = require('socket.io-client');
const { Game } = require('../server/game');

const PORT = process.argv[2] || process.env.PORT || 3210;
const URL = `http://localhost:${PORT}`;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const once = (socket, event) => new Promise((resolve) => socket.once(event, resolve));
const emitAck = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));

async function main() {
  const defuser = io(URL);
  const expert = io(URL);
  await Promise.all([once(defuser, 'connect'), once(expert, 'connect')]);

  // --- lobby ---
  const created = await emitAck(defuser, 'room:create', { name: 'BLASTER' });
  assert.ok(created.ok, 'room created');
  const joined = await emitAck(expert, 'room:join', { code: created.code, name: 'BOOKWORM' });
  assert.ok(joined.ok, 'expert joined');
  console.log(`ok - lobby formed (room ${created.code})`);

  const ghost = io(URL);
  await once(ghost, 'connect');
  const badJoin = await emitAck(ghost, 'room:join', { code: 'ZZZZ', name: 'GHOST' });
  assert.strictEqual(badJoin.ok, false, 'bad room code rejected');
  ghost.close();
  console.log('ok - invalid room code rejected');

  // --- start game with a fixed seed so we can replay the solution ---
  const SEED = 'E2E-TEST-7';
  const defuserStart = once(defuser, 'game:started');
  const expertStart = once(expert, 'game:started');
  const startRes = await emitAck(defuser, 'game:start', { difficulty: 'normal', seed: SEED });
  assert.ok(startRes.ok, 'game started');
  const [dPayload, ePayload] = await Promise.all([defuserStart, expertStart]);

  assert.strictEqual(dPayload.role, 'defuser');
  assert.strictEqual(ePayload.role, 'expert');
  assert.ok(dPayload.serial, 'defuser sees serial');
  assert.ok(!ePayload.serial, 'expert does NOT see serial');
  assert.ok(dPayload.modules.every((m) => m.view && !m.manual), 'defuser gets views, no manuals');
  assert.ok(ePayload.manuals.every((m) => m.manual && !m.view), 'expert gets manuals, no views');
  console.log('ok - role separation enforced in payloads');

  // Replay the same seed locally to learn the solutions (server-side knowledge).
  const noop = { onTick() {}, onStrike() {}, onModuleUpdate() {}, onModuleSolved() {}, onGameOver() {} };
  const shadow = new Game({ difficulty: 'normal', seed: SEED, events: noop, logger: { log() {} } });
  shadow.destroy();
  assert.strictEqual(shadow.serial, dPayload.serial, 'shadow game matches (seeded replay)');
  console.log('ok - seeded replay reproduces the server game');

  // --- expert must not be able to act on modules ---
  const wiresDef = dPayload.modules.find((m) => m.type === 'wires');
  let expertCaused = false;
  const spy = () => { expertCaused = true; };
  defuser.on('module:update', spy);
  expert.emit('module:action', { moduleId: wiresDef.id, action: { type: 'cut', index: 1 } });
  await wait(400);
  assert.strictEqual(expertCaused, false, 'expert actions ignored');
  defuser.off('module:update', spy);
  console.log('ok - expert cannot operate the device');

  // --- live state tracking ---
  const latestViews = {};
  const solvedIds = new Set();
  defuser.on('module:update', ({ moduleId, view }) => { latestViews[moduleId] = view; });
  defuser.on('module:solved', ({ moduleId }) => solvedIds.add(moduleId));
  const overP = once(defuser, 'game:over');

  // --- deliberate strike ---
  const strikeP = once(defuser, 'game:strike');
  const wiresShadow = shadow.modules.find((m) => m.type === 'wires');
  const wrongWire = wiresShadow.state.solution === 1 ? 2 : 1;
  defuser.emit('module:action', { moduleId: wiresShadow.id, action: { type: 'cut', index: wrongWire } });
  const strike = await strikeP;
  assert.strictEqual(strike.strikes, 1);
  console.log('ok - wrong action produces a strike');

  // --- solve all single-shot modules ---
  for (const m of shadow.modules) {
    const s = m.state;
    if (m.type === 'wires') {
      defuser.emit('module:action', { moduleId: m.id, action: { type: 'cut', index: s.solution } });
    } else if (m.type === 'symbols') {
      for (const glyph of s.solution) {
        defuser.emit('module:action', { moduleId: m.id, action: { type: 'press', glyph } });
        await wait(100);
      }
    } else if (m.type === 'morse') {
      defuser.emit('module:action', { moduleId: m.id, action: { type: 'tune', index: s.frequencies.indexOf(s.solutionFreq) } });
      await wait(100);
      defuser.emit('module:action', { moduleId: m.id, action: { type: 'transmit' } });
    } else if (m.type === 'logicgrid') {
      for (const q of s.questions) {
        defuser.emit('module:action', { moduleId: m.id, action: { type: 'answer', option: q.answer } });
        await wait(100);
      }
    }
    await wait(150);
  }

  // --- memory: solve interactively using the shadow rule table + live views ---
  const memShadow = shadow.modules.find((m) => m.type === 'memory');
  const memDef = dPayload.modules.find((m) => m.type === 'memory');
  const history = [];
  let view = latestViews[memDef.id] || memDef.view;
  let guard = 0;
  while (!solvedIds.has(memDef.id) && guard++ < 12) {
    const ins = memShadow.state.table[view.stage - 1][view.display];
    let pos;
    switch (ins.kind) {
      case 'position': pos = ins.n; break;
      case 'label': pos = view.labels.indexOf(ins.n) + 1; break;
      case 'samePosition': pos = history[ins.stage - 1].position; break;
      case 'sameLabel': pos = view.labels.indexOf(history[ins.stage - 1].label) + 1; break;
    }
    history.push({ position: pos, label: view.labels[pos - 1] });
    defuser.emit('module:action', { moduleId: memDef.id, action: { type: 'press', position: pos } });
    await wait(250);
    view = latestViews[memDef.id] || view;
  }
  assert.ok(solvedIds.has(memDef.id), 'memory module solved without strikes');

  const summary = await overP;
  assert.strictEqual(summary.result, 'won', `expected win, got ${summary.result} (${summary.reason})`);
  assert.strictEqual(summary.strikes, 1);
  console.log(`ok - full game won via WebSockets (strikes=${summary.strikes}, solved=${summary.modulesSolved}/${summary.modulesTotal})`);

  defuser.close();
  expert.close();
  console.log('\nE2E PASSED');
  process.exit(0);
}

main().catch((err) => {
  console.error('E2E FAILED:', err.stack || err.message);
  process.exit(1);
});
