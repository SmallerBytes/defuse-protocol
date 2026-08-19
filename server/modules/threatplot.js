/**
 * THREAT PLOT — scope grid on the device; SAM coverage lives only in the
 * manual. The Defuser flies the jet N/E/S/W to the target; Experts compute
 * which cells are lethal. Layout is randomized each game.
 */
const data = require('../../data/modules/threatplot.json');

const TYPE = 'threatplot';
const NAME = 'Threat Plot';

const COL_LETTERS = 'ABCDEFGH';
const DIRS = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };

function cellName(c) {
  return `${COL_LETTERS[c.x]}${c.y + 1}`;
}

function radiusOf(type) {
  return data.samTypes.find((s) => s.type === type).radius;
}

function coverageSet(sams) {
  const covered = new Set();
  for (const sam of sams) {
    const r = radiusOf(sam.type);
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        covered.add(`${sam.x + dx},${sam.y + dy}`);
      }
    }
  }
  return covered;
}

/** Shortest route start -> (tanker) -> target avoiding coverage. Returns steps or null. */
function findPath(size, covered, start, target, tanker) {
  const key = (x, y, ref) => `${x},${y},${ref ? 1 : 0}`;
  const startRef = !tanker;
  const queue = [{ x: start.x, y: start.y, ref: startRef, steps: [] }];
  const seen = new Set([key(start.x, start.y, startRef)]);
  while (queue.length) {
    const cur = queue.shift();
    if (cur.x === target.x && cur.y === target.y && cur.ref) return cur.steps;
    for (const [dir, [dx, dy]] of Object.entries(DIRS)) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      if (covered.has(`${nx},${ny}`)) continue;
      const ref = cur.ref || (tanker && nx === tanker.x && ny === tanker.y);
      const k = key(nx, ny, ref);
      if (seen.has(k)) continue;
      seen.add(k);
      queue.push({ x: nx, y: ny, ref, steps: [...cur.steps, dir] });
    }
  }
  return null;
}

function fixedManual() {
  return {
    intro: data.intro,
    samTypes: data.samTypes.map((s) => ({ type: s.type, coverage: s.coverage })),
    rules: data.rules
  };
}

function generate(ctx) {
  const { rng, difficulty } = ctx;
  const size = data.sizesByDifficulty[difficulty];
  const samCount = data.samsByDifficulty[difficulty];
  const minPath = data.minPathByDifficulty[difficulty];
  const needTanker = difficulty === 'hard';
  const samWeights = ['SA-3', 'SA-3', 'SA-6', 'SA-6', 'SA-2'];

  let layout = null;
  for (let attempt = 0; attempt < 400 && !layout; attempt++) {
    const rndCell = () => ({ x: rng.int(0, size - 1), y: rng.int(0, size - 1) });
    const start = rndCell();
    let target = rndCell();
    if (target.x === start.x && target.y === start.y) continue;
    if (Math.abs(target.x - start.x) + Math.abs(target.y - start.y) < 3) continue;
    let tanker = null;
    if (needTanker) {
      tanker = rndCell();
      if ((tanker.x === start.x && tanker.y === start.y) || (tanker.x === target.x && tanker.y === target.y)) continue;
    }
    const reserved = new Set([start, target, ...(tanker ? [tanker] : [])].map((c) => `${c.x},${c.y}`));
    const open = [];
    for (let x = 0; x < size; x++) for (let y = 0; y < size; y++) {
      if (!reserved.has(`${x},${y}`)) open.push({ x, y });
    }
    if (open.length < samCount) continue;
    const samCells = rng.shuffle(open).slice(0, samCount);
    const sams = samCells.map((c) => ({ ...c, type: rng.pick(samWeights) }));
    const covered = coverageSet(sams);
    if ([start, target, ...(tanker ? [tanker] : [])].some((c) => covered.has(`${c.x},${c.y}`))) continue;
    const path = findPath(size, covered, start, target, tanker);
    if (!path || path.length < minPath) continue;
    layout = { size, start, target, tanker, sams };
  }
  if (!layout) {
    // Pathological seed fallback: a single corner SAM can never block the diagonal route.
    layout = {
      size,
      start: { x: 0, y: 0 },
      target: { x: size - 1, y: size - 1 },
      tanker: needTanker ? { x: size - 1, y: 0 } : null,
      sams: [{ x: Math.floor(size / 2), y: Math.floor(size / 2), type: 'SA-3' }]
    };
  }

  const state = {
    ...layout,
    pos: { ...layout.start },
    refueled: !layout.tanker
  };
  return { state, manual: fixedManual(), view: view(state) };
}

function view(state) {
  return {
    size: state.size,
    start: cellName(state.start),
    target: cellName(state.target),
    tanker: state.tanker ? cellName(state.tanker) : null,
    sams: state.sams.map((s) => ({ type: s.type, cell: cellName(s) })),
    player: cellName(state.pos),
    refueled: state.refueled
  };
}

function resetToStart(state) {
  state.pos = { ...state.start };
  state.refueled = !state.tanker;
}

function action(state, act) {
  if (act.type !== 'step' || !DIRS[act.dir]) return { status: 'ok', view: view(state) };
  const [dx, dy] = DIRS[act.dir];
  const nx = state.pos.x + dx;
  const ny = state.pos.y + dy;

  const covered = coverageSet(state.sams);
  const outOfBounds = nx < 0 || ny < 0 || nx >= state.size || ny >= state.size;
  if (outOfBounds || covered.has(`${nx},${ny}`)) {
    const reason = outOfBounds ? 'left the grid' : 'entered threat coverage';
    resetToStart(state);
    return { status: 'strike', view: view(state), detail: reason };
  }

  state.pos = { x: nx, y: ny };
  if (state.tanker && nx === state.tanker.x && ny === state.tanker.y) state.refueled = true;

  if (nx === state.target.x && ny === state.target.y) {
    if (state.tanker && !state.refueled) {
      resetToStart(state);
      return { status: 'strike', view: view(state), detail: 'reached target without refueling' };
    }
    return { status: 'solved', view: view(state), detail: 'target reached' };
  }
  return { status: 'ok', view: view(state) };
}

module.exports = { type: TYPE, name: NAME, generate, action, fixedManual };
