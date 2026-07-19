/**
 * WIRE CUTTING — fixed manual rule tables; only the wire colors/count are random.
 */
const data = require('../../data/modules/wires.json');

const TYPE = 'wires';
const NAME = 'Wire Cutting';

function countColor(wires, c) {
  return wires.filter((w) => w === c).length;
}

function serialOdd(serial) {
  return parseInt(serial[serial.length - 1], 10) % 2 === 1;
}

function conditionMatches(cond, wires, serial) {
  if (!cond) return true;
  switch (cond.key) {
    case 'noneOfColor': return countColor(wires, cond.color) === 0;
    case 'exactlyOneOfColor': return countColor(wires, cond.color) === 1;
    case 'moreThanOneOfColor': return countColor(wires, cond.color) > 1;
    case 'lastWireIs': return wires[wires.length - 1] === cond.color;
    case 'serialOdd': return serialOdd(serial);
    case 'moreThanOneRedAndSerialOdd':
      return countColor(wires, 'red') > 1 && serialOdd(serial);
    case 'lastYellowAndNoRed':
      return wires[wires.length - 1] === 'yellow' && countColor(wires, 'red') === 0;
    case 'lastBlackAndSerialOdd':
      return wires[wires.length - 1] === 'black' && serialOdd(serial);
    case 'oneRedAndMoreYellow':
      return countColor(wires, 'red') === 1 && countColor(wires, 'yellow') > 1;
    case 'noYellowAndSerialOdd':
      return countColor(wires, 'yellow') === 0 && serialOdd(serial);
    case 'oneYellowAndMoreWhite':
      return countColor(wires, 'yellow') === 1 && countColor(wires, 'white') > 1;
    default: return false;
  }
}

function resolveAction(act, wires) {
  switch (act.key) {
    case 'cutIndex': return act.index;
    case 'cutFirstOfColor': return wires.indexOf(act.color) + 1;
    case 'cutLastOfColor': return wires.lastIndexOf(act.color) + 1;
    default: return 1;
  }
}

function solve(ruleSet, wires, serial) {
  for (const rule of ruleSet) {
    if (conditionMatches(rule.cond, wires, serial)) {
      return resolveAction(rule.act, wires);
    }
  }
  return 1;
}

function fixedManual() {
  return {
    intro: data.intro,
    sections: Object.keys(data.ruleSets)
      .sort((a, b) => Number(a) - Number(b))
      .map((n) => ({
        title: `If the device has ${n} wires`,
        rules: data.ruleSets[n].map((r) => r.text)
      }))
  };
}

function generate(ctx) {
  const { rng, difficulty, serial } = ctx;
  const [minW, maxW] = data.wireCountsByDifficulty[difficulty];
  const wireCount = rng.int(minW, maxW);
  const wires = Array.from({ length: wireCount }, () => rng.pick(data.colors));
  const ruleSet = data.ruleSets[String(wireCount)];
  const solution = solve(ruleSet, wires, serial);

  const state = { wires, cut: wires.map(() => false), solution };
  return { state, manual: fixedManual(), view: view(state) };
}

function view(state) {
  return {
    wires: state.wires.map((color, i) => ({ color, cut: state.cut[i] }))
  };
}

function action(state, act) {
  if (act.type !== 'cut') return { status: 'ok', view: view(state) };
  const idx = act.index;
  if (!idx || idx < 1 || idx > state.wires.length || state.cut[idx - 1]) {
    return { status: 'ok', view: view(state) };
  }
  state.cut[idx - 1] = true;
  if (idx === state.solution) {
    return { status: 'solved', view: view(state), detail: `cut wire ${idx}` };
  }
  return { status: 'strike', view: view(state), detail: `wrong wire ${idx}, expected ${state.solution}` };
}

module.exports = { type: TYPE, name: NAME, generate, action, fixedManual };
