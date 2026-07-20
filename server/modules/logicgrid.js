/**
 * LOGIC GRID — fixed roster in the manual. Clues are shown on the DEVICE
 * (Defuser reads them aloud). Truth assignment + which clues/questions
 * appear are randomized each game.
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

function fixedManual() {
  return {
    intro: data.intro,
    rosterNote: data.rosterNote,
    entities: {
      engineers: data.engineers,
      panels: data.panels,
      shifts: data.shifts
    },
    // Clues live on the device now — manual only has the fixed roster.
    clues: [
      'Ask the Defuser to read all INTERCEPTED NOTES from the clipboard on the table.',
      'Fill the roster so each engineer has exactly one panel and one shift.',
      'Then answer the question shown on the device.'
    ]
  };
}

function generate(ctx) {
  const { rng, difficulty } = ctx;
  const n = data.entitiesByDifficulty[difficulty];
  // Fixed roster every game (manual can be printed once).
  const names = data.engineers.slice(0, n);
  const panels = data.panels.slice(0, n);
  const shifts = data.shifts.slice(0, n);

  const idx = Array.from({ length: n }, (_, i) => i);
  const truth = { panels: rng.shuffle(idx), shifts: rng.shuffle(idx) };

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

  const clueLines = rng.shuffle(clues).map((c) => clueText(c, names, panels, shifts));

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

  const state = {
    questions,
    stage: 0,
    clues: clueLines,
    clueIndex: 0
  };

  return { state, manual: fixedManual(), view: view(state) };
}

function view(state) {
  const q = state.questions[state.stage];
  return {
    stage: state.stage + 1,
    totalStages: state.questions.length,
    question: q ? q.text : null,
    options: q ? q.options : [],
    // Defuser reads these aloud — they are NOT in the printed manual.
    clues: state.clues,
    clueIndex: state.clueIndex
  };
}

function action(state, act) {
  if (act.type === 'nextClue') {
    if (state.clues.length) {
      state.clueIndex = (state.clueIndex + 1) % state.clues.length;
    }
    return { status: 'ok', view: view(state) };
  }
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

module.exports = { type: TYPE, name: NAME, generate, action, fixedManual };
