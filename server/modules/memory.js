/**
 * MEMORY SEQUENCE — fixed stage/display rule table; only the display digits
 * and button label layouts are random each game / stage.
 */
const data = require('../../data/modules/memory.json');
const { Rng } = require('../rng');

const TYPE = 'memory';
const NAME = 'Memory Sequence';

const ORDINALS = ['first', 'second', 'third', 'fourth'];

function instructionText(ins) {
  switch (ins.kind) {
    case 'position': return `press the button in the ${ORDINALS[ins.n - 1]} position`;
    case 'label': return `press the button labeled "${ins.n}"`;
    case 'samePosition': return `press the button in the same position as you pressed in stage ${ins.stage}`;
    case 'sameLabel': return `press the button with the same label as you pressed in stage ${ins.stage}`;
    default: return '?';
  }
}

function fixedManual(stages) {
  const n = stages || data.stages;
  return {
    intro: data.intro,
    stages: data.table.slice(0, n).map((row, i) => ({
      title: `Stage ${i + 1}`,
      rules: Object.entries(row).map(([d, ins]) => `If the display shows ${d}, ${instructionText(ins)}.`)
    }))
  };
}

function newStage(rng, buttons) {
  return {
    display: rng.int(1, buttons),
    labels: rng.shuffle(Array.from({ length: buttons }, (_, i) => i + 1))
  };
}

function correctPosition(ins, stageData, history) {
  switch (ins.kind) {
    case 'position': return ins.n;
    case 'label': return stageData.labels.indexOf(ins.n) + 1;
    case 'samePosition': return history[ins.stage - 1].position;
    case 'sameLabel': return stageData.labels.indexOf(history[ins.stage - 1].label) + 1;
    default: return 1;
  }
}

function generate(ctx) {
  const { rng, difficulty } = ctx;
  const stages = data.stagesByDifficulty[difficulty] || data.stages;
  const buttons = data.buttons;
  const table = data.table.slice(0, stages);

  const state = {
    stages,
    buttons,
    table,
    stage: 1,
    history: [],
    current: null,
    _rngSeed: rng.seed + '::stages'
  };
  state._stageRng = new Rng(state._rngSeed);
  state.current = newStage(state._stageRng, buttons);

  return { state, manual: fixedManual(stages), view: view(state) };
}

function view(state) {
  return {
    stage: state.stage,
    totalStages: state.stages,
    display: state.current.display,
    labels: state.current.labels
  };
}

function action(state, act) {
  if (act.type !== 'press') return { status: 'ok', view: view(state) };
  const pos = act.position;
  if (!pos || pos < 1 || pos > state.buttons) return { status: 'ok', view: view(state) };

  const ins = state.table[state.stage - 1][String(state.current.display)];
  const correct = correctPosition(ins, state.current, state.history);

  if (pos === correct) {
    state.history.push({ position: pos, label: state.current.labels[pos - 1] });
    if (state.stage >= state.stages) {
      return { status: 'solved', view: view(state), detail: 'all stages complete' };
    }
    state.stage++;
    state.current = newStage(state._stageRng, state.buttons);
    return { status: 'ok', view: view(state), detail: `stage ${state.stage - 1} passed` };
  }

  state.stage = 1;
  state.history = [];
  state.current = newStage(state._stageRng, state.buttons);
  return { status: 'strike', view: view(state), detail: `wrong position ${pos}, expected ${correct}; reset to stage 1` };
}

module.exports = { type: TYPE, name: NAME, generate, action, fixedManual };
