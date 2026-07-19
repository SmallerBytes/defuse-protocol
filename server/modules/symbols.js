/**
 * SYMBOL MATCHING — fixed glyph columns in the manual; device shows a random
 * subset from exactly one column each game.
 */
const data = require('../../data/modules/symbols.json');

const TYPE = 'symbols';
const NAME = 'Symbol Matching';

function fixedManual() {
  return {
    intro: data.intro,
    columns: data.fixedColumns
  };
}

function generate(ctx) {
  const { rng } = ctx;
  const columns = data.fixedColumns;
  const targetCol = rng.int(0, columns.length - 1);
  const chosen = rng.sample(columns[targetCol], data.buttonsOnDevice);
  const solution = columns[targetCol].filter((g) => chosen.includes(g));
  const displayed = rng.shuffle(solution);

  const state = { displayed, solution, progress: 0 };
  return { state, manual: fixedManual(), view: view(state) };
}

function view(state) {
  return {
    symbols: state.displayed.map((glyph) => ({
      glyph,
      pressed: state.solution.slice(0, state.progress).includes(glyph)
    })),
    progress: state.progress,
    total: state.solution.length
  };
}

function action(state, act) {
  if (act.type !== 'press') return { status: 'ok', view: view(state) };
  const glyph = act.glyph;
  if (!state.displayed.includes(glyph)) return { status: 'ok', view: view(state) };
  if (state.solution.slice(0, state.progress).includes(glyph)) {
    return { status: 'ok', view: view(state) };
  }
  if (glyph === state.solution[state.progress]) {
    state.progress++;
    if (state.progress >= state.solution.length) {
      return { status: 'solved', view: view(state), detail: 'sequence complete' };
    }
    return { status: 'ok', view: view(state) };
  }
  state.progress = 0;
  return { status: 'strike', view: view(state), detail: `wrong glyph ${glyph}` };
}

module.exports = { type: TYPE, name: NAME, generate, action, fixedManual };
