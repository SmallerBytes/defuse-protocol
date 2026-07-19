/**
 * MORSE CODE MODULE
 * A lamp on the device flashes a word in Morse, looping forever. The
 * Defuser describes the dots and dashes; the Experts decode letters using
 * the alphabet chart, find the word in the manual's frequency table, and
 * the Defuser tunes the dial to that frequency and transmits.
 */
const data = require('../../data/modules/morse.json');

const TYPE = 'morse';
const NAME = 'Morse Code';

function generate(ctx) {
  const { rng, difficulty } = ctx;
  const [minLen, maxLen] = data.wordLengthByDifficulty[difficulty];
  const candidates = data.words.filter((w) => w.length >= minLen && w.length <= maxLen);
  const tableWords = rng.sample(candidates.length >= data.tableSize ? candidates : data.words, data.tableSize);
  const word = rng.pick(tableWords);

  // Assign each word a unique frequency, sorted ascending on the dial.
  const offsets = rng.shuffle(Array.from({ length: data.tableSize * 2 }, (_, i) => i)).slice(0, tableWords.length);
  const entries = tableWords
    .map((w, i) => ({ word: w, freq: +(data.baseFrequency + offsets[i] * data.frequencyStep).toFixed(3) }))
    .sort((a, b) => a.freq - b.freq);

  const solutionFreq = entries.find((e) => e.word === word).freq;
  const pattern = word.split('').map((ch) => data.alphabet[ch]);

  const state = {
    word,
    solutionFreq,
    frequencies: entries.map((e) => e.freq),
    selected: 0,
    pattern
  };

  const manual = {
    intro: 'Decode the flashing signal letter by letter (a long gap separates letters; the word loops with an even longer gap). Find the word in the frequency table, then have the Defuser tune to that frequency and transmit.',
    alphabet: data.alphabet,
    table: entries.map((e) => ({ word: e.word, freq: e.freq.toFixed(3) + ' MHz' }))
  };

  return { state, manual, view: view(state) };
}

function view(state) {
  return {
    pattern: state.pattern,          // array of morse strings, one per letter
    frequencies: state.frequencies,  // dial stops
    selected: state.selected         // index into frequencies
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

module.exports = { type: TYPE, name: NAME, generate, action };
