/**
 * MODULE REGISTRY
 * To add a new puzzle module:
 *   1. Create server/modules/<type>.js exporting { type, name, generate, action }
 *   2. Add it to the list below
 *   3. Create the matching client renderer in public/js/modules/<type>.js
 * See docs/ADDING_MODULES.md for the full contract.
 */
const wires = require('./wires');
const symbols = require('./symbols');
const memory = require('./memory');
const morse = require('./morse');
const logicgrid = require('./logicgrid');

const MODULES = [wires, symbols, memory, morse, logicgrid];

const registry = new Map(MODULES.map((m) => [m.type, m]));

function getModule(type) {
  const mod = registry.get(type);
  if (!mod) throw new Error(`Unknown module type: ${type}`);
  return mod;
}

function allTypes() {
  return MODULES.map((m) => ({ type: m.type, name: m.name }));
}

module.exports = { getModule, allTypes, MODULES };
