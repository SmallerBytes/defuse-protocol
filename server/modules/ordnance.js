/**
 * WEAPONS RELEASE — stores-management panel. The Defuser flies a full
 * release checklist per target: MASTER ARM, station select, fuze, laser
 * code thumbwheels, PICKLE. Wrong pickle = strike. After the last target
 * the panel must go back to SAFE to disarm.
 */
const data = require('../../data/modules/ordnance.json');

const TYPE = 'ordnance';
const NAME = 'Weapons Release';

const WEAPON_IDS = data.weapons.map((w) => w.id);
const LASER = new Set(data.weapons.filter((w) => w.guidance === 'LASER').map((w) => w.id));

function weaponFor(attrs) {
  if (attrs.moving) return 'AGM-65';
  if (attrs.urban) return 'GBU-38';
  if (attrs.hardened) return 'GBU-31';
  if (attrs.wx === 'CLEAR') return 'GBU-12';
  return 'GBU-31';
}

function makeTarget(rng, serial) {
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
    default:
      if (rng.float() < 0.5) attrs.hardened = true;
      else attrs.wx = 'IMC';
      break;
  }
  const weapon = weaponFor(attrs);
  const fuze = attrs.hardened ? 'TAIL' : 'NOSE';
  const code = LASER.has(weapon)
    ? [1, parseInt(serial[2], 10), parseInt(serial[3], 10)]
    : [0, 0, 0];
  const name = attrs.moving ? rng.pick(data.movingTargets) : rng.pick(data.staticTargets);
  return { name, attrs, weapon, fuze, code };
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
    weapons: data.weapons,
    rules: data.rules,
    fuzeRules: data.fuzeRules,
    codeRules: data.codeRules,
    checklist: data.checklist
  };
}

function generate(ctx) {
  const { rng, difficulty, serial } = ctx;
  const count = data.targetsByDifficulty[difficulty];
  const targets = Array.from({ length: count }, () => makeTarget(rng, serial));
  const state = {
    targets,
    index: 0,
    masterArm: false,
    station: 0,
    fuze: 'NOSE',
    code: [0, 0, 0],
    weapons: WEAPON_IDS
  };
  return { state, manual: fixedManual(), view: view(state) };
}

function view(state) {
  const t = state.targets[state.index];
  const allServiced = state.index >= state.targets.length;
  return {
    index: Math.min(state.index + 1, state.targets.length),
    total: state.targets.length,
    card: t ? describe(t) : null,
    allServiced,
    masterArm: state.masterArm,
    weapon: state.weapons[state.station],
    fuze: state.fuze,
    code: state.code.slice()
  };
}

function action(state, act) {
  const allServiced = state.index >= state.targets.length;

  switch (act.type) {
    case 'arm': {
      state.masterArm = !state.masterArm;
      if (!state.masterArm && allServiced) {
        return { status: 'solved', view: view(state), detail: 'weapons safe, all targets serviced' };
      }
      return { status: 'ok', view: view(state) };
    }
    case 'station': {
      state.station = (state.station + 1) % state.weapons.length;
      return { status: 'ok', view: view(state) };
    }
    case 'fuze': {
      state.fuze = state.fuze === 'NOSE' ? 'TAIL' : 'NOSE';
      return { status: 'ok', view: view(state) };
    }
    case 'wheel': {
      const i = act.index;
      if (i === 0 || i === 1 || i === 2) {
        state.code[i] = (state.code[i] + 1) % 10;
      }
      return { status: 'ok', view: view(state) };
    }
    case 'pickle': {
      if (allServiced) return { status: 'ok', view: view(state) };
      if (!state.masterArm) {
        // Nothing releases with the master arm safed — no strike, no progress.
        return { status: 'ok', view: view(state), detail: 'pickle with MASTER ARM safe' };
      }
      const t = state.targets[state.index];
      const selected = state.weapons[state.station];
      const codeOk = state.code[0] === t.code[0] && state.code[1] === t.code[1] && state.code[2] === t.code[2];
      if (selected === t.weapon && state.fuze === t.fuze && codeOk) {
        state.index++;
        if (state.index >= state.targets.length) {
          return { status: 'ok', view: view(state), detail: 'final target destroyed — safe the panel' };
        }
        return { status: 'ok', view: view(state), detail: 'target destroyed' };
      }
      const expect = `${t.weapon}/${t.fuze}/${t.code.join('')}`;
      const got = `${selected}/${state.fuze}/${state.code.join('')}`;
      return { status: 'strike', view: view(state), detail: `bad release ${got}, expected ${expect}` };
    }
    default:
      return { status: 'ok', view: view(state) };
  }
}

module.exports = { type: TYPE, name: NAME, generate, action, fixedManual };
