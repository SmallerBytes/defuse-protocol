/**
 * SYMBOL MATCHING MODULE
 * The device shows 4 strange glyphs. The manual contains 6 columns of
 * glyphs. Exactly one column contains all 4 displayed glyphs; they must
 * be pressed in top-to-bottom column order.
 */
const data = require('../../data/modules/symbols.json');

const TYPE = 'symbols';
const NAME = 'Symbol Matching';

function generate(ctx) {
  const { rng } = ctx;
  const pool = data.glyphs;

  // Build columns that overlap (share glyphs) so identifying the right
  // column actually requires checking all four symbols.
  const columns = [];
  for (let c = 0; c < data.columns; c++) {
    columns.push(rng.sample(pool, data.symbolsPerColumn));
  }

  const targetCol = rng.int(0, columns.length - 1);
  const chosen = rng.sample(columns[targetCol], data.buttonsOnDevice);
  // Solution order = order of appearance within the column.
  const solution = columns[targetCol]
    .filter((g) => chosen.includes(g));
  const displayed = rng.shuffle(solution);

  const state = {
    displayed,           // order on the device
    solution,            // required press order
    progress: 0
  };

  const manual = {
    intro: 'Exactly one column contains all four displayed symbols. Press them in the order they appear within that column, reading top to bottom.',
    columns
  };

  return { state, manual, view: view(state) };
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
    return { status: 'ok', view: view(state) }; // already pressed correctly
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

module.exports = { type: TYPE, name: NAME, generate, action };
