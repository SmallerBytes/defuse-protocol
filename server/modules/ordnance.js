/**
 * WEAPONS RELEASE — fixed weaponeering rules in the manual; target cards on
 * the device. Which targets appear is randomized each game.
 */
const data = require('../../data/modules/ordnance.json');

const TYPE = 'ordnance';
const NAME = 'Weapons Release';

function answerFor(attrs) {
  if (attrs.moving) return 'AGM-65';
  if (attrs.urban) return 'GBU-38';
  if (attrs.hardened) return 'GBU-31';
  if (attrs.wx === 'CLEAR') return 'GBU-12';
  return 'GBU-31';
}

function makeTarget(rng) {
  // Pick the intended answer first, then build consistent attributes.
  const intended = rng.pick(['GBU-12', 'GBU-31', 'GBU-38', 'AGM-65', 'GBU-31']);
  const attrs = { moving: false, urban: false, hardened: false, wx: rng.pick(['CLEAR', 'IMC']) };
  switch (intended) {
    case 'AGM-65':
      attrs.moving = true;
      attrs.urban = rng.float() < 0.35;
      attrs.hardened = rng.float() < 0.3;
      break;
    case 'GBU-38':
      attrs.urban = true;
      attrs.hardened = rng.float() < 0.4;
      break;
    case 'GBU-12':
      attrs.wx = 'CLEAR';
      break;
    default: // GBU-31 — hardened, or soft target in bad weather
      if (rng.float() < 0.5) attrs.hardened = true;
      else attrs.wx = 'IMC';
      break;
  }
  const name = attrs.moving ? rng.pick(data.movingTargets) : rng.pick(data.staticTargets);
  return { name, attrs, answer: answerFor(attrs) };
}

function describe(t) {
  const a = t.attrs;
  return [
    t.name,
    a.moving ? 'MOVING' : 'STATIC',
    a.urban ? 'URBAN' : 'OPEN TERRAIN',
    a.hardened ? 'HARDENED' : 'SOFT',
    `WX ${a.wx}`
  ].join(' · ');
}

function fixedManual() {
  return {
    intro: data.intro,
    rules: data.rules,
    weapons: data.weapons
  };
}

function generate(ctx) {
  const { rng, difficulty } = ctx;
  const count = data.targetsByDifficulty[difficulty];
  const targets = Array.from({ length: count }, () => makeTarget(rng));
  const state = { targets, index: 0 };
  return { state, manual: fixedManual(), view: view(state) };
}

function view(state) {
  const t = state.targets[state.index];
  return {
    index: state.index + 1,
    total: state.targets.length,
    card: t ? describe(t) : null,
    weapons: data.weapons.map((w) => w.id)
  };
}

function action(state, act) {
  if (act.type !== 'release') return { status: 'ok', view: view(state) };
  const t = state.targets[state.index];
  if (!t || !data.weapons.some((w) => w.id === act.weapon)) return { status: 'ok', view: view(state) };
  if (act.weapon === t.answer) {
    state.index++;
    if (state.index >= state.targets.length) {
      return { status: 'solved', view: view(state), detail: 'all targets serviced' };
    }
    return { status: 'ok', view: view(state), detail: 'target destroyed' };
  }
  return { status: 'strike', view: view(state), detail: `wrong weapon ${act.weapon}, expected ${t.answer}` };
}

module.exports = { type: TYPE, name: NAME, generate, action, fixedManual };
