/**
 * MORSE CODE — fixed alphabet + word/frequency table in the manual.
 * Each game picks one word from that table to flash.
 */
const data = require('../../data/modules/morse.json');

const TYPE = 'morse';
const NAME = 'Morse Code';

function fixedManual() {
  return {
    intro: data.intro,
    alphabet: data.alphabet,
    table: data.table.map((e) => ({
      word: e.word,
      freq: Number(e.freq).toFixed(3) + ' MHz'
    }))
  };
}

function generate(ctx) {
  const { rng } = ctx;
  const entries = data.table
    .map((e) => ({ word: e.word, freq: +Number(e.freq).toFixed(3) }))
    .sort((a, b) => a.freq - b.freq);

  const word = rng.pick(entries).word;
  const solutionFreq = entries.find((e) => e.word === word).freq;
  const pattern = word.split('').map((ch) => data.alphabet[ch]);

  const state = {
    word,
    solutionFreq,
    frequencies: entries.map((e) => e.freq),
    selected: 0,
    pattern
  };

  return { state, manual: fixedManual(), view: view(state) };
}

function view(state) {
  return {
    pattern: state.pattern,
    frequencies: state.frequencies,
    selected: state.selected
  };
}

function action(state, act) {
  if (act.type === 'tune') {
    const idx = act.index;
    if (idx >= 0 && idx < state.frequencies.length) state.selected = idx;
    return { status: 'ok', view: view(state) };
  }
  if (act.type === 'transmit') {
    const freq = state.frequencies[state.selected];
    if (freq === state.solutionFreq) {
      return { status: 'solved', view: view(state), detail: `transmitted ${freq}` };
    }
    return { status: 'strike', view: view(state), detail: `transmitted ${freq}, expected ${state.solutionFreq}` };
  }
  return { status: 'ok', view: view(state) };
}

module.exports = { type: TYPE, name: NAME, generate, action, fixedManual };
