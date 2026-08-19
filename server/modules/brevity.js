/**
 * BREVITY CODE — two-step indirection with AF brevity words. Fixed lookup
 * tables in the manual; display words and button labels shuffle per stage.
 */
const data = require('../../data/modules/brevity.json');

const TYPE = 'brevity';
const NAME = 'Brevity Code';

function fixedManual() {
  return {
    intro: data.intro,
    table1: data.words.map((w) => ({ word: w, position: data.displayRead[w] })),
    table2: data.words.map((w) => ({ read: w, press: data.readPress[w] }))
  };
}

function makeStage(rng) {
  const display = rng.pick(data.words);
  const readPos = data.displayRead[display];
  for (let attempt = 0; attempt < 300; attempt++) {
    const buttons = rng.shuffle(data.words.slice()).slice(0, 6);
    const readWord = buttons[readPos - 1];
    const answer = data.readPress[readWord];
    if (buttons.includes(answer)) return { display, buttons, answer };
  }
  // Deterministic fallback: overwrite a non-read slot with the answer word.
  const buttons = rng.shuffle(data.words.slice()).slice(0, 6);
  const readWord = buttons[readPos - 1];
  const answer = data.readPress[readWord];
  buttons[readPos % 6] = answer;
  return { display, buttons, answer };
}

function generate(ctx) {
  const { rng, difficulty } = ctx;
  const count = data.stagesByDifficulty[difficulty];
  const stages = Array.from({ length: count }, () => makeStage(rng));
  const state = { stages, stage: 0 };
  return { state, manual: fixedManual(), view: view(state) };
}

function view(state) {
  const s = state.stages[state.stage];
  return {
    stage: state.stage + 1,
    total: state.stages.length,
    display: s ? s.display : null,
    buttons: s ? s.buttons : []
  };
}

function action(state, act) {
  if (act.type !== 'press') return { status: 'ok', view: view(state) };
  const s = state.stages[state.stage];
  if (!s || !s.buttons.includes(act.label)) return { status: 'ok', view: view(state) };
  if (act.label === s.answer) {
    state.stage++;
    if (state.stage >= state.stages.length) {
      return { status: 'solved', view: view(state), detail: 'all brevity stages cleared' };
    }
    return { status: 'ok', view: view(state), detail: 'stage cleared' };
  }
  return { status: 'strike', view: view(state), detail: `pressed ${act.label}, expected ${s.answer}` };
}

module.exports = { type: TYPE, name: NAME, generate, action, fixedManual };
