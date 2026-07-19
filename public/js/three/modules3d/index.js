/**
 * 3D MODULE BUILDER REGISTRY
 * type -> build({ view, send }) => { group: THREE.Group, update(view), tick?(dt, t, solved) }
 * Builder content sits with y=0 at the module faceplate top; the device
 * provides the faceplate, status LED, and raycast plumbing.
 */
import { build as wires } from './wires3d.js';
import { build as symbols } from './symbols3d.js';
import { build as memory } from './memory3d.js';
import { build as morse } from './morse3d.js';
import { build as logicgrid } from './logicgrid3d.js';

export const moduleBuilders = { wires, symbols, memory, morse, logicgrid };
