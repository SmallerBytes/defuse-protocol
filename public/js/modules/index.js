/**
 * CLIENT MANUAL REGISTRY (Expert side)
 * Maps module type -> { renderManual(el, manual) }.
 * Defuser-side 3D builders live in js/three/modules3d/.
 */
import { wires } from './wires.js';
import { symbols } from './symbols.js';
import { memory } from './memory.js';
import { morse } from './morse.js';
import { logicgrid } from './logicgrid.js';

export const moduleRenderers = { wires, symbols, memory, morse, logicgrid };
