/**
 * RADIO NET — fixed comms annex + authentication table in the manual; the
 * device shows callsigns and challenges that change every game.
 */
const data = require('../../data/modules/comms.json');

const TYPE = 'comms';
const NAME = 'Radio Net';

function fixedManual() {
  return {
    intro: data.intro,
    callsigns: data.callsigns,
    auth: data.auth
  };
}

function generate(ctx) {
  const { rng, difficulty } = ctx;
  const roundsWanted = data.roundsByDifficulty[difficulty];
  const calls = rng.shuffle(data.callsigns.slice()).slice(0, roundsWanted);
  const challenges = rng.shuffle(data.auth.slice()).slice(0, roundsWanted);

  const rounds = calls.map((c, i) => {
    const wrongFreqs = rng.shuffle(data.callsigns.filter((o) => o.freq !== c.freq)).slice(0, 3);
    const netOptions = rng.shuffle([c, ...wrongFreqs]).map((o) => o.freq);

    const ch = challenges[i];
    const wrongLetters = rng.shuffle(data.auth.filter((o) => o.response !== ch.response)).slice(0, 3);
    const authOptions = rng.shuffle([ch, ...wrongLetters]).map((o) => o.response);

    return {
      call: c.call,
      netOptions,
      answerNet: c.freq,
      challenge: ch.challenge,
      authOptions,
      answerAuth: ch.response
    };
  });

  const state = { rounds, round: 0, phase: 'net' };
  return { state, manual: fixedManual(), view: view(state) };
}

function view(state) {
  const r = state.rounds[state.round];
  if (!r) return { round: state.round + 1, total: state.rounds.length, phase: 'done', prompt: null, options: [] };
  return {
    round: state.round + 1,
    total: state.rounds.length,
    phase: state.phase,
    prompt: state.phase === 'net' ? r.call : r.challenge,
    options: state.phase === 'net' ? r.netOptions : r.authOptions
  };
}

function action(state, act) {
  const r = state.rounds[state.round];
  if (!r) return { status: 'ok', view: view(state) };

  if (act.type === 'tune' && state.phase === 'net') {
    if (!r.netOptions.includes(act.freq)) return { status: 'ok', view: view(state) };
    if (act.freq === r.answerNet) {
      state.phase = 'auth';
      return { status: 'ok', view: view(state), detail: 'net established' };
    }
    return { status: 'strike', view: view(state), detail: `wrong net ${act.freq}, expected ${r.answerNet}` };
  }

  if (act.type === 'respond' && state.phase === 'auth') {
    if (!r.authOptions.includes(act.letter)) return { status: 'ok', view: view(state) };
    if (act.letter === r.answerAuth) {
      state.round++;
      state.phase = 'net';
      if (state.round >= state.rounds.length) {
        return { status: 'solved', view: view(state), detail: 'all nets authenticated' };
      }
      return { status: 'ok', view: view(state), detail: 'authentication valid' };
    }
    return { status: 'strike', view: view(state), detail: `bad auth ${act.letter}, expected ${r.answerAuth}` };
  }

  return { status: 'ok', view: view(state) };
}

module.exports = { type: TYPE, name: NAME, generate, action, fixedManual };
