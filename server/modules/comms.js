/**
 * RADIO NET — a real UHF radio. Step 1: dial the exact frequency for the
 * callsign (coarse/fine tuning across a 25-step band) and key XMIT — keying
 * on the wrong frequency is a strike. Step 2: answer a phonetic matrix
 * challenge with the A–Z letter dial and AUTH.
 */
const data = require('../../data/modules/comms.json');

const TYPE = 'comms';
const NAME = 'Radio Net';

const { start, step, steps } = data.band;

function freqAt(idx) {
  return (start + idx * step).toFixed(2);
}

function idxOf(freq) {
  return Math.round((freq - start) / step);
}

function fixedManual() {
  return {
    intro: data.intro,
    callsigns: data.callsigns.map((c) => ({ ...c, freq: c.freq.toFixed(2) })),
    matrixLabels: data.matrixLabels,
    matrix: data.matrix
  };
}

function generate(ctx) {
  const { rng, difficulty } = ctx;
  const roundsWanted = data.roundsByDifficulty[difficulty];
  const calls = rng.shuffle(data.callsigns.slice()).slice(0, roundsWanted);

  const rounds = calls.map((c) => {
    const row = rng.int(0, data.matrixLabels.length - 1);
    const col = rng.int(0, data.matrixLabels.length - 1);
    return {
      call: c.call,
      answerIdx: idxOf(c.freq),
      challenge: `${data.matrixLabels[row]} · ${data.matrixLabels[col]}`,
      answer: data.matrix[row][col]
    };
  });

  const state = {
    rounds,
    round: 0,
    phase: 'net',
    freqIdx: 0,
    letterIdx: 0
  };
  return { state, manual: fixedManual(), view: view(state) };
}

function view(state) {
  const r = state.rounds[state.round];
  return {
    round: Math.min(state.round + 1, state.rounds.length),
    total: state.rounds.length,
    phase: r ? state.phase : 'done',
    prompt: r ? (state.phase === 'net' ? r.call : r.challenge) : null,
    freq: freqAt(state.freqIdx),
    letter: String.fromCharCode(65 + state.letterIdx)
  };
}

function action(state, act) {
  const r = state.rounds[state.round];

  switch (act.type) {
    case 'tune': {
      const delta = Math.trunc(Number(act.steps) || 0);
      state.freqIdx = Math.min(steps - 1, Math.max(0, state.freqIdx + delta));
      return { status: 'ok', view: view(state) };
    }
    case 'letter': {
      const delta = Math.trunc(Number(act.delta) || 0);
      state.letterIdx = ((state.letterIdx + delta) % 26 + 26) % 26;
      return { status: 'ok', view: view(state) };
    }
    case 'xmit': {
      if (!r || state.phase !== 'net') return { status: 'ok', view: view(state) };
      if (state.freqIdx === r.answerIdx) {
        state.phase = 'auth';
        return { status: 'ok', view: view(state), detail: `net established on ${freqAt(state.freqIdx)}` };
      }
      return { status: 'strike', view: view(state), detail: `keyed ${freqAt(state.freqIdx)}, expected ${freqAt(r.answerIdx)}` };
    }
    case 'auth': {
      if (!r || state.phase !== 'auth') return { status: 'ok', view: view(state) };
      const letter = String.fromCharCode(65 + state.letterIdx);
      if (letter === r.answer) {
        state.round++;
        state.phase = 'net';
        if (state.round >= state.rounds.length) {
          return { status: 'solved', view: view(state), detail: 'all nets authenticated' };
        }
        return { status: 'ok', view: view(state), detail: 'authentication valid' };
      }
      return { status: 'strike', view: view(state), detail: `bad auth ${letter}, expected ${r.answer}` };
    }
    default:
      return { status: 'ok', view: view(state) };
  }
}

module.exports = { type: TYPE, name: NAME, generate, action, fixedManual };
