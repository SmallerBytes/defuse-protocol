/**
 * LOGIC GRID MODULE
 * The server generates a small logic puzzle (engineers x panels x shifts)
 * with a clue list that admits exactly one solution. The clues live in the
 * Experts' manual; the question and answer buttons live on the device.
 * Neither side can solve it alone.
 */
const data = require('../../data/modules/logicgrid.json');

const TYPE = 'logicgrid';
const NAME = 'Logic Grid';

function permutations(arr) {
  if (arr.length <= 1) return [arr];
  const out = [];
  arr.forEach((x, i) => {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    permutations(rest).forEach((p) => out.push([x, ...p]));
  });
  return out;
}

/** assignment: { panels: [pIdx per engineer], shifts: [sIdx per engineer] } */
function clueHolds(clue, asg) {
  switch (clue.kind) {
    case 'panel': return asg.panels[clue.e] === clue.p;
    case 'panelNot': return asg.panels[clue.e] !== clue.p;
    case 'shift': return asg.shifts[clue.e] === clue.s;
    case 'shiftNot': return asg.shifts[clue.e] !== clue.s;
    case 'cross': return asg.shifts[asg.panels.indexOf(clue.p)] === clue.s;
    case 'crossNot': return asg.shifts[asg.panels.indexOf(clue.p)] !== clue.s;
    default: return true;
  }
}

function clueText(clue, names, panels, shifts) {
  switch (clue.kind) {
    case 'panel': return `${names[clue.e]} maintains the ${panels[clue.p]} panel.`;
    case 'panelNot': return `${names[clue.e]} does not maintain the ${panels[clue.p]} panel.`;
    case 'shift': return `${names[clue.e]} works the ${shifts[clue.s]} shift.`;
    case 'shiftNot': return `${names[clue.e]} does not work the ${shifts[clue.s]} shift.`;
    case 'cross': return `The engineer with the ${panels[clue.p]} panel works the ${shifts[clue.s]} shift.`;
    case 'crossNot': return `The engineer with the ${panels[clue.p]} panel does not work the ${shifts[clue.s]} shift.`;
    default: return '';
  }
}

function randomTrueClue(rng, truth, n) {
  const e = rng.int(0, n - 1);
  const kind = rng.pick(['panelNot', 'shiftNot', 'cross', 'crossNot', 'panel', 'shift', 'panelNot', 'shiftNot', 'crossNot']);
  switch (kind) {
    case 'panel': return { kind, e, p: truth.panels[e] };
    case 'shift': return { kind, e, s: truth.shifts[e] };
    case 'panelNot': {
      let p; do { p = rng.int(0, n - 1); } while (p === truth.panels[e]);
      return { kind, e, p };
    }
    case 'shiftNot': {
      let s; do { s = rng.int(0, n - 1); } while (s === truth.shifts[e]);
      return { kind, e, s };
    }
    case 'cross': {
      const p = rng.int(0, n - 1);
      return { kind, p, s: truth.shifts[truth.panels.indexOf(p)] };
    }
    case 'crossNot': {
      const p = rng.int(0, n - 1);
      let s; do { s = rng.int(0, n - 1); } while (s === truth.shifts[truth.panels.indexOf(p)]);
      return { kind, p, s };
    }
  }
}

function generate(ctx) {
  const { rng, difficulty } = ctx;
  const n = data.entitiesByDifficulty[difficulty];
  const names = rng.sample(data.engineers, n);
  const panels = rng.sample(data.panels, n);
  const shifts = rng.sample(data.shifts, n);

  const idx = Array.from({ length: n }, (_, i) => i);
  const truth = { panels: rng.shuffle(idx), shifts: rng.shuffle(idx) };

  // Add random true clues until the solution is unique among all
  // permutation pairs (n!^2 candidates; tiny search space).
  const allCandidates = [];
  for (const pp of permutations(idx)) {
    for (const sp of permutations(idx)) allCandidates.push({ panels: pp, shifts: sp });
  }
  const clues = [];
  let candidates = allCandidates;
  let guard = 0;
  while (candidates.length > 1 && guard++ < 60) {
    const clue = randomTrueClue(rng, truth, n);
    const filtered = candidates.filter((c) => clueHolds(clue, c));
    if (filtered.length < candidates.length) {
      clues.push(clue);
      candidates = filtered;
    }
  }

  // Build the device questions.
  const questionCount = data.questionsByDifficulty[difficulty];
  const questions = [];
  const qTypes = rng.shuffle(['panelOf', 'engineerOfShift']);
  for (let q = 0; q < questionCount; q++) {
    const t = qTypes[q % qTypes.length];
    if (t === 'panelOf') {
      const e = rng.int(0, n - 1);
      questions.push({
        text: `Which panel does ${names[e]} maintain?`,
        options: panels,
        answer: panels[truth.panels[e]]
      });
    } else {
      const s = rng.int(0, n - 1);
      const e = truth.shifts.indexOf(s);
      questions.push({
        text: `Which engineer works the ${shifts[s]} shift?`,
        options: names,
        answer: names[e]
      });
    }
  }

  const state = { questions, stage: 0 };

  const manual = {
    intro: `Three engineers each maintain one panel and work one shift (no two share either). Use the clues to reconstruct the full assignment, then answer the question shown on the device.`,
    entities: { engineers: names, panels, shifts },
    clues: rng.shuffle(clues).map((c) => clueText(c, names, panels, shifts))
  };

  return { state, manual, view: view(state) };
}

function view(state) {
  const q = state.questions[state.stage];
  return {
    stage: state.stage + 1,
    totalStages: state.questions.length,
    question: q ? q.text : null,
    options: q ? q.options : []
  };
}

function action(state, act) {
  if (act.type !== 'answer') return { status: 'ok', view: view(state) };
  const q = state.questions[state.stage];
  if (!q || !q.options.includes(act.option)) return { status: 'ok', view: view(state) };

  if (act.option === q.answer) {
    state.stage++;
    if (state.stage >= state.questions.length) {
      return { status: 'solved', view: view(state), detail: 'all questions answered' };
    }
    return { status: 'ok', view: view(state), detail: 'question passed' };
  }
  return { status: 'strike', view: view(state), detail: `wrong answer ${act.option}, expected ${q.answer}` };
}

module.exports = { type: TYPE, name: NAME, generate, action };
