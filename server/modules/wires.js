/**
 * WIRE CUTTING MODULE
 * The device shows 3-6 colored wires. The manual contains a freshly
 * generated rule table for every possible wire count. The first rule
 * whose condition matches must be applied; otherwise the default rule.
 */
const data = require('../../data/modules/wires.json');

const TYPE = 'wires';
const NAME = 'Wire Cutting';

const CONDITIONS = [
  { key: 'noneOfColor', text: (c) => `there are no ${c} wires` },
  { key: 'exactlyOneOfColor', text: (c) => `there is exactly one ${c} wire` },
  { key: 'moreThanOneOfColor', text: (c) => `there is more than one ${c} wire` },
  { key: 'lastWireIs', text: (c) => `the last wire is ${c}` },
  { key: 'serialOdd', text: () => `the last digit of the serial number is odd` }
];

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];

function conditionMatches(cond, wires, serial) {
  const count = (c) => wires.filter((w) => w === c).length;
  switch (cond.key) {
    case 'noneOfColor': return count(cond.color) === 0;
    case 'exactlyOneOfColor': return count(cond.color) === 1;
    case 'moreThanOneOfColor': return count(cond.color) > 1;
    case 'lastWireIs': return wires[wires.length - 1] === cond.color;
    case 'serialOdd': return parseInt(serial[serial.length - 1], 10) % 2 === 1;
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

function actionText(act) {
  if (act.key === 'cutIndex') return `cut the ${ORDINALS[act.index - 1]} wire`;
  if (act.key === 'cutFirstOfColor') return `cut the first ${act.color} wire`;
  return `cut the last ${act.color} wire`;
}

/** Generate the conditional rule list for one wire count. */
function generateRules(rng, wireCount, ruleCount) {
  const rules = [];
  const usedConditions = new Set();
  let guard = 0;
  while (rules.length < ruleCount && guard++ < 100) {
    const condDef = rng.pick(CONDITIONS);
    const color = rng.pick(data.colors);
    const condKey = condDef.key + (condDef.key === 'serialOdd' ? '' : ':' + color);
    if (usedConditions.has(condKey)) continue;
    usedConditions.add(condKey);

    const cond = { key: condDef.key, color };
    // Color-referencing cut actions are only safe when the condition
    // guarantees at least one wire of that color exists.
    const guaranteesColor = ['exactlyOneOfColor', 'moreThanOneOfColor', 'lastWireIs'].includes(condDef.key);
    let act;
    if (guaranteesColor && rng.chance(0.55)) {
      act = { key: rng.pick(['cutFirstOfColor', 'cutLastOfColor']), color };
    } else {
      act = { key: 'cutIndex', index: rng.int(1, wireCount) };
    }
    rules.push({ cond, act, text: `If ${condDef.text(color)}, ${actionText(act)}.` });
  }
  // Unconditional fallback rule.
  const def = { key: 'cutIndex', index: rng.int(1, wireCount) };
  rules.push({ cond: null, act: def, text: `Otherwise, ${actionText(def)}.` });
  return rules;
}

function solve(ruleSet, wires, serial) {
  for (const rule of ruleSet) {
    if (rule.cond === null || conditionMatches(rule.cond, wires, serial)) {
      return resolveAction(rule.act, wires);
    }
  }
  return 1;
}

function generate(ctx) {
  const { rng, difficulty, serial } = ctx;
  const [minW, maxW] = data.wireCountsByDifficulty[difficulty];
  const wireCount = rng.int(minW, maxW);
  const ruleCount = data.rulesPerCount[difficulty];

  // Manual covers every count so the Expert can't infer the device layout.
  const ruleSets = {};
  for (let n = minW - 1; n <= maxW + 1; n++) {
    if (n < 3 || n > 6) continue;
    ruleSets[n] = generateRules(rng, n, ruleCount);
  }
  if (!ruleSets[wireCount]) ruleSets[wireCount] = generateRules(rng, wireCount, ruleCount);

  const wires = Array.from({ length: wireCount }, () => rng.pick(data.colors));
  const solution = solve(ruleSets[wireCount], wires, serial);

  const state = { wires, cut: wires.map(() => false), solution };

  const manual = {
    intro: 'Identify the number of wires, then apply the FIRST matching rule from the matching table. Wires are numbered top to bottom starting at 1.',
    sections: Object.entries(ruleSets).map(([n, rules]) => ({
      title: `If the device has ${n} wires`,
      rules: rules.map((r) => r.text)
    }))
  };

  return { state, manual, view: view(state) };
}

function view(state) {
  return {
    wires: state.wires.map((color, i) => ({ color, cut: state.cut[i] }))
  };
}

function action(state, act) {
  if (act.type !== 'cut') return { status: 'ok', view: view(state) };
  const idx = act.index; // 1-based
  if (!idx || idx < 1 || idx > state.wires.length || state.cut[idx - 1]) {
    return { status: 'ok', view: view(state) };
  }
  state.cut[idx - 1] = true;
  if (idx === state.solution) {
    return { status: 'solved', view: view(state), detail: `cut wire ${idx}` };
  }
  return { status: 'strike', view: view(state), detail: `wrong wire ${idx}, expected ${state.solution}` };
}

module.exports = { type: TYPE, name: NAME, generate, action };
