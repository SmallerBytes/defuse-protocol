/**
 * MEMORY SEQUENCE MODULE
 * Multi-stage puzzle. Each stage shows a display digit (1-4) and four
 * labeled buttons. The manual maps (stage, display) -> an instruction that
 * may reference WHICH POSITION or WHICH LABEL was pressed in an earlier
 * stage, forcing the team to keep a shared history.
 * A mistake strikes and resets the module to stage 1.
 */
const data = require('../../data/modules/memory.json');

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

function generateRuleTable(rng, stages, buttons) {
  // table[stage][display] = instruction
  const table = [];
  for (let s = 1; s <= stages; s++) {
    const row = {};
    for (let d = 1; d <= buttons; d++) {
      const kinds = s === 1
        ? ['position', 'label']
        : ['position', 'label', 'samePosition', 'sameLabel', 'samePosition', 'sameLabel'];
      const kind = rng.pick(kinds);
      if (kind === 'position' || kind === 'label') {
        row[d] = { kind, n: rng.int(1, buttons) };
      } else {
        row[d] = { kind, stage: rng.int(1, s - 1) };
      }
    }
    table.push(row);
  }
  return table;
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

  const table = generateRuleTable(rng, stages, buttons);
  const state = {
    rng: null, // replaced below; rng stream stored for stage regeneration
    stages,
    buttons,
    table,
    stage: 1,
    history: [],
    current: newStage(rng, buttons),
    _rngSeed: rng.seed + '::stages'
  };
  // Dedicated child stream so stage regeneration after strikes stays seeded.
  const { Rng } = require('../rng');
  state._stageRng = new Rng(state._rngSeed);
  state.current = newStage(state._stageRng, buttons);

  const manual = {
    intro: `This module has ${stages} stages. For each stage, look up the rule matching the number on the display. Positions are counted left to right starting at 1. A mistake resets the module to stage 1.`,
    stages: table.map((row, i) => ({
      title: `Stage ${i + 1}`,
      rules: Object.entries(row).map(([d, ins]) => `If the display shows ${d}, ${instructionText(ins)}.`)
    }))
  };

  return { state, manual, view: view(state) };
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
  const pos = act.position; // 1-based
  if (!pos || pos < 1 || pos > state.buttons) return { status: 'ok', view: view(state) };

  const ins = state.table[state.stage - 1][state.current.display];
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

  // Strike: reset to stage 1 with a fresh stage layout.
  state.stage = 1;
  state.history = [];
  state.current = newStage(state._stageRng, state.buttons);
  return { status: 'strike', view: view(state), detail: `wrong position ${pos}, expected ${correct}; reset to stage 1` };
}

module.exports = { type: TYPE, name: NAME, generate, action };
