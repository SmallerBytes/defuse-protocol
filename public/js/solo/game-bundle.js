var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};

// server/rng.js
var require_rng = __commonJS({
  "server/rng.js"(exports, module) {
    function hashSeed(str) {
      let h = 1779033703 ^ str.length;
      for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = h << 13 | h >>> 19;
      }
      return h >>> 0;
    }
    function mulberry32(a) {
      return function() {
        a |= 0;
        a = a + 1831565813 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    var Rng = class _Rng {
      constructor(seed) {
        this.seed = String(seed);
        this._next = mulberry32(hashSeed(this.seed));
      }
      /** Float in [0, 1) */
      float() {
        return this._next();
      }
      /** Integer in [min, max] inclusive */
      int(min, max) {
        return min + Math.floor(this.float() * (max - min + 1));
      }
      /** Random element of an array */
      pick(arr) {
        return arr[this.int(0, arr.length - 1)];
      }
      /** Fisher-Yates shuffle (returns a new array) */
      shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
          const j = this.int(0, i);
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      }
      /** n distinct elements from an array */
      sample(arr, n) {
        return this.shuffle(arr).slice(0, n);
      }
      /** true with probability p */
      chance(p) {
        return this.float() < p;
      }
      /** Derive a child RNG (e.g. one per module) without disturbing this stream */
      child(label) {
        return new _Rng(this.seed + "::" + label);
      }
    };
    function randomSeed() {
      const ADJ = ["CRIMSON", "SILENT", "RAPID", "HOLLOW", "AMBER", "FROZEN", "NEON", "RUSTY", "PRIME", "VIVID"];
      const NOUN = ["FOX", "RELAY", "CIRCUIT", "ANVIL", "COMET", "SPARK", "VAULT", "PYLON", "ROTOR", "SIGNAL"];
      const r = Math.random;
      return `${ADJ[Math.floor(r() * ADJ.length)]}-${NOUN[Math.floor(r() * NOUN.length)]}-${Math.floor(r() * 90 + 10)}`;
    }
    module.exports = { Rng, randomSeed, hashSeed };
  }
});

// data/modules/wires.json
var require_wires = __commonJS({
  "data/modules/wires.json"(exports, module) {
    module.exports = {
      colors: ["red", "blue", "yellow", "white", "black", "green"],
      wireCountsByDifficulty: {
        easy: [3, 4],
        normal: [4, 5],
        hard: [5, 6]
      },
      intro: "Identify how many wires are on the module, then apply the FIRST matching rule in that section. Wires are numbered top to bottom starting at 1. The serial number is engraved on the front of the case.",
      ruleSets: {
        "3": [
          { cond: { key: "noneOfColor", color: "red" }, act: { key: "cutIndex", index: 2 }, text: "If there are no red wires, cut the second wire." },
          { cond: { key: "lastWireIs", color: "white" }, act: { key: "cutIndex", index: 3 }, text: "Otherwise, if the last wire is white, cut the third wire." },
          { cond: { key: "moreThanOneOfColor", color: "blue" }, act: { key: "cutLastOfColor", color: "blue" }, text: "Otherwise, if there is more than one blue wire, cut the last blue wire." },
          { cond: null, act: { key: "cutIndex", index: 3 }, text: "Otherwise, cut the third wire." }
        ],
        "4": [
          { cond: { key: "moreThanOneRedAndSerialOdd" }, act: { key: "cutLastOfColor", color: "red" }, text: "If there is more than one red wire and the last digit of the serial number is odd, cut the last red wire." },
          { cond: { key: "lastYellowAndNoRed" }, act: { key: "cutIndex", index: 1 }, text: "Otherwise, if the last wire is yellow and there are no red wires, cut the first wire." },
          { cond: { key: "exactlyOneOfColor", color: "blue" }, act: { key: "cutIndex", index: 1 }, text: "Otherwise, if there is exactly one blue wire, cut the first wire." },
          { cond: { key: "moreThanOneOfColor", color: "yellow" }, act: { key: "cutIndex", index: 4 }, text: "Otherwise, if there is more than one yellow wire, cut the fourth wire." },
          { cond: null, act: { key: "cutIndex", index: 2 }, text: "Otherwise, cut the second wire." }
        ],
        "5": [
          { cond: { key: "lastBlackAndSerialOdd" }, act: { key: "cutIndex", index: 4 }, text: "If the last wire is black and the last digit of the serial number is odd, cut the fourth wire." },
          { cond: { key: "oneRedAndMoreYellow" }, act: { key: "cutIndex", index: 1 }, text: "Otherwise, if there is exactly one red wire and there is more than one yellow wire, cut the first wire." },
          { cond: { key: "noneOfColor", color: "black" }, act: { key: "cutIndex", index: 2 }, text: "Otherwise, if there are no black wires, cut the second wire." },
          { cond: null, act: { key: "cutIndex", index: 1 }, text: "Otherwise, cut the first wire." }
        ],
        "6": [
          { cond: { key: "noYellowAndSerialOdd" }, act: { key: "cutIndex", index: 3 }, text: "If there are no yellow wires and the last digit of the serial number is odd, cut the third wire." },
          { cond: { key: "oneYellowAndMoreWhite" }, act: { key: "cutIndex", index: 4 }, text: "Otherwise, if there is exactly one yellow wire and there is more than one white wire, cut the fourth wire." },
          { cond: { key: "noneOfColor", color: "red" }, act: { key: "cutIndex", index: 6 }, text: "Otherwise, if there are no red wires, cut the sixth wire." },
          { cond: null, act: { key: "cutIndex", index: 4 }, text: "Otherwise, cut the fourth wire." }
        ]
      }
    };
  }
});

// server/modules/wires.js
var require_wires2 = __commonJS({
  "server/modules/wires.js"(exports, module) {
    var data = require_wires();
    var TYPE = "wires";
    var NAME = "Wire Cutting";
    function countColor(wires, c) {
      return wires.filter((w) => w === c).length;
    }
    function serialOdd(serial) {
      return parseInt(serial[serial.length - 1], 10) % 2 === 1;
    }
    function conditionMatches(cond, wires, serial) {
      if (!cond) return true;
      switch (cond.key) {
        case "noneOfColor":
          return countColor(wires, cond.color) === 0;
        case "exactlyOneOfColor":
          return countColor(wires, cond.color) === 1;
        case "moreThanOneOfColor":
          return countColor(wires, cond.color) > 1;
        case "lastWireIs":
          return wires[wires.length - 1] === cond.color;
        case "serialOdd":
          return serialOdd(serial);
        case "moreThanOneRedAndSerialOdd":
          return countColor(wires, "red") > 1 && serialOdd(serial);
        case "lastYellowAndNoRed":
          return wires[wires.length - 1] === "yellow" && countColor(wires, "red") === 0;
        case "lastBlackAndSerialOdd":
          return wires[wires.length - 1] === "black" && serialOdd(serial);
        case "oneRedAndMoreYellow":
          return countColor(wires, "red") === 1 && countColor(wires, "yellow") > 1;
        case "noYellowAndSerialOdd":
          return countColor(wires, "yellow") === 0 && serialOdd(serial);
        case "oneYellowAndMoreWhite":
          return countColor(wires, "yellow") === 1 && countColor(wires, "white") > 1;
        default:
          return false;
      }
    }
    function resolveAction(act, wires) {
      switch (act.key) {
        case "cutIndex":
          return act.index;
        case "cutFirstOfColor":
          return wires.indexOf(act.color) + 1;
        case "cutLastOfColor":
          return wires.lastIndexOf(act.color) + 1;
        default:
          return 1;
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
        sections: Object.keys(data.ruleSets).sort((a, b) => Number(a) - Number(b)).map((n) => ({
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
      if (act.type !== "cut") return { status: "ok", view: view(state) };
      const idx = act.index;
      if (!idx || idx < 1 || idx > state.wires.length || state.cut[idx - 1]) {
        return { status: "ok", view: view(state) };
      }
      state.cut[idx - 1] = true;
      if (idx === state.solution) {
        return { status: "solved", view: view(state), detail: `cut wire ${idx}` };
      }
      return { status: "strike", view: view(state), detail: `wrong wire ${idx}, expected ${state.solution}` };
    }
    module.exports = { type: TYPE, name: NAME, generate, action, fixedManual };
  }
});

// data/modules/symbols.json
var require_symbols = __commonJS({
  "data/modules/symbols.json"(exports, module) {
    module.exports = {
      glyphs: ["\u03E1", "\u046C", "\u03D7", "\u03FF", "\u0482", "\u0298", "\u03A9", "\u0278", "\u0416", "\u03DE", "\u0470", "\u0494", "\u03BE", "\u03A8", "\u01EE", "\u10B4", "\u03EA", "\u04A8", "\u0194", "\u03EC", "\u01B1", "\u04DC", "\u0556", "\u040B", "\u0241", "\u0506", "\u04C1", "\u047A"],
      columns: 6,
      symbolsPerColumn: 7,
      buttonsOnDevice: 4,
      intro: "Exactly one column below contains all four symbols shown on the device. Press those four symbols in the order they appear in that column, reading top to bottom.",
      fixedColumns: [
        ["\u03E1", "\u046C", "\u03D7", "\u03DE", "\u03FF", "\u0482", "\u0298"],
        ["\u03A9", "\u0278", "\u0416", "\u03E1", "\u0470", "\u0494", "\u03BE"],
        ["\u03A8", "\u01EE", "\u10B4", "\u03EA", "\u04A8", "\u0416", "\u03DE"],
        ["\u0194", "\u03EC", "\u01B1", "\u04DC", "\u03A8", "\u046C", "\u03D7"],
        ["\u0556", "\u040B", "\u0241", "\u0506", "\u04C1", "\u047A", "\u03E1"],
        ["\u0298", "\u03A9", "\u04A8", "\u0194", "\u0556", "\u040B", "\u01EE"]
      ]
    };
  }
});

// server/modules/symbols.js
var require_symbols2 = __commonJS({
  "server/modules/symbols.js"(exports, module) {
    var data = require_symbols();
    var TYPE = "symbols";
    var NAME = "Symbol Matching";
    function fixedManual() {
      return {
        intro: data.intro,
        columns: data.fixedColumns
      };
    }
    function generate(ctx) {
      const { rng } = ctx;
      const columns = data.fixedColumns;
      const targetCol = rng.int(0, columns.length - 1);
      const chosen = rng.sample(columns[targetCol], data.buttonsOnDevice);
      const solution = columns[targetCol].filter((g) => chosen.includes(g));
      const displayed = rng.shuffle(solution);
      const state = { displayed, solution, progress: 0 };
      return { state, manual: fixedManual(), view: view(state) };
    }
    function view(state) {
      return {
        symbols: state.displayed.map((glyph) => ({
          glyph,
          pressed: state.solution.slice(0, state.progress).includes(glyph)
        })),
        progress: state.progress,
        total: state.solution.length
      };
    }
    function action(state, act) {
      if (act.type !== "press") return { status: "ok", view: view(state) };
      const glyph = act.glyph;
      if (!state.displayed.includes(glyph)) return { status: "ok", view: view(state) };
      if (state.solution.slice(0, state.progress).includes(glyph)) {
        return { status: "ok", view: view(state) };
      }
      if (glyph === state.solution[state.progress]) {
        state.progress++;
        if (state.progress >= state.solution.length) {
          return { status: "solved", view: view(state), detail: "sequence complete" };
        }
        return { status: "ok", view: view(state) };
      }
      state.progress = 0;
      return { status: "strike", view: view(state), detail: `wrong glyph ${glyph}` };
    }
    module.exports = { type: TYPE, name: NAME, generate, action, fixedManual };
  }
});

// data/modules/memory.json
var require_memory = __commonJS({
  "data/modules/memory.json"(exports, module) {
    module.exports = {
      buttons: 4,
      stages: 5,
      stagesByDifficulty: {
        easy: 3,
        normal: 4,
        hard: 5
      },
      intro: "This module has several stages. For each stage, look up the rule for the current stage and the number on the display. Positions are counted left to right starting at 1. Labels are the numbers printed on the buttons. A mistake strikes and resets the module to stage 1.",
      table: [
        {
          "1": { kind: "position", n: 2 },
          "2": { kind: "position", n: 2 },
          "3": { kind: "position", n: 3 },
          "4": { kind: "position", n: 4 }
        },
        {
          "1": { kind: "label", n: 4 },
          "2": { kind: "samePosition", stage: 1 },
          "3": { kind: "position", n: 1 },
          "4": { kind: "samePosition", stage: 1 }
        },
        {
          "1": { kind: "sameLabel", stage: 2 },
          "2": { kind: "sameLabel", stage: 1 },
          "3": { kind: "position", n: 3 },
          "4": { kind: "label", n: 4 }
        },
        {
          "1": { kind: "samePosition", stage: 1 },
          "2": { kind: "position", n: 1 },
          "3": { kind: "samePosition", stage: 2 },
          "4": { kind: "samePosition", stage: 2 }
        },
        {
          "1": { kind: "sameLabel", stage: 1 },
          "2": { kind: "sameLabel", stage: 2 },
          "3": { kind: "sameLabel", stage: 4 },
          "4": { kind: "sameLabel", stage: 3 }
        }
      ]
    };
  }
});

// server/modules/memory.js
var require_memory2 = __commonJS({
  "server/modules/memory.js"(exports, module) {
    var data = require_memory();
    var { Rng } = require_rng();
    var TYPE = "memory";
    var NAME = "Memory Sequence";
    var ORDINALS = ["first", "second", "third", "fourth"];
    function instructionText(ins) {
      switch (ins.kind) {
        case "position":
          return `press the button in the ${ORDINALS[ins.n - 1]} position`;
        case "label":
          return `press the button labeled "${ins.n}"`;
        case "samePosition":
          return `press the button in the same position as you pressed in stage ${ins.stage}`;
        case "sameLabel":
          return `press the button with the same label as you pressed in stage ${ins.stage}`;
        default:
          return "?";
      }
    }
    function fixedManual(stages) {
      const n = stages || data.stages;
      return {
        intro: data.intro,
        stages: data.table.slice(0, n).map((row, i) => ({
          title: `Stage ${i + 1}`,
          rules: Object.entries(row).map(([d, ins]) => `If the display shows ${d}, ${instructionText(ins)}.`)
        }))
      };
    }
    function newStage(rng, buttons) {
      return {
        display: rng.int(1, buttons),
        labels: rng.shuffle(Array.from({ length: buttons }, (_, i) => i + 1))
      };
    }
    function correctPosition(ins, stageData, history) {
      switch (ins.kind) {
        case "position":
          return ins.n;
        case "label":
          return stageData.labels.indexOf(ins.n) + 1;
        case "samePosition":
          return history[ins.stage - 1].position;
        case "sameLabel":
          return stageData.labels.indexOf(history[ins.stage - 1].label) + 1;
        default:
          return 1;
      }
    }
    function generate(ctx) {
      const { rng, difficulty } = ctx;
      const stages = data.stagesByDifficulty[difficulty] || data.stages;
      const buttons = data.buttons;
      const table = data.table.slice(0, stages);
      const state = {
        stages,
        buttons,
        table,
        stage: 1,
        history: [],
        current: null,
        _rngSeed: rng.seed + "::stages"
      };
      state._stageRng = new Rng(state._rngSeed);
      state.current = newStage(state._stageRng, buttons);
      return { state, manual: fixedManual(stages), view: view(state) };
    }
    function view(state) {
      return {
        stage: state.stage,
        totalStages: state.stages,
        display: state.current.display,
        labels: state.current.labels
      };
    }
    function action(state, act) {
      if (act.type !== "press") return { status: "ok", view: view(state) };
      const pos = act.position;
      if (!pos || pos < 1 || pos > state.buttons) return { status: "ok", view: view(state) };
      const ins = state.table[state.stage - 1][String(state.current.display)];
      const correct = correctPosition(ins, state.current, state.history);
      if (pos === correct) {
        state.history.push({ position: pos, label: state.current.labels[pos - 1] });
        if (state.stage >= state.stages) {
          return { status: "solved", view: view(state), detail: "all stages complete" };
        }
        state.stage++;
        state.current = newStage(state._stageRng, state.buttons);
        return { status: "ok", view: view(state), detail: `stage ${state.stage - 1} passed` };
      }
      state.stage = 1;
      state.history = [];
      state.current = newStage(state._stageRng, state.buttons);
      return { status: "strike", view: view(state), detail: `wrong position ${pos}, expected ${correct}; reset to stage 1` };
    }
    module.exports = { type: TYPE, name: NAME, generate, action, fixedManual };
  }
});

// data/modules/morse.json
var require_morse = __commonJS({
  "data/modules/morse.json"(exports, module) {
    module.exports = {
      alphabet: {
        A: ".-",
        B: "-...",
        C: "-.-.",
        D: "-..",
        E: ".",
        F: "..-.",
        G: "--.",
        H: "....",
        I: "..",
        J: ".---",
        K: "-.-",
        L: ".-..",
        M: "--",
        N: "-.",
        O: "---",
        P: ".--.",
        Q: "--.-",
        R: ".-.",
        S: "...",
        T: "-",
        U: "..-",
        V: "...-",
        W: ".--",
        X: "-..-",
        Y: "-.--",
        Z: "--.."
      },
      intro: "Decode the flashing signal letter by letter (a short gap separates dots/dashes within a letter; a longer gap separates letters; the word loops with a long pause). Find the decoded word in the frequency table, then have the Defuser tune to that frequency and transmit (TX).",
      baseFrequency: 3.505,
      frequencyStep: 5e-3,
      table: [
        { word: "SHELL", freq: 3.505 },
        { word: "HALLS", freq: 3.515 },
        { word: "SLICK", freq: 3.522 },
        { word: "TRICK", freq: 3.532 },
        { word: "BOXES", freq: 3.535 },
        { word: "LEAKS", freq: 3.542 },
        { word: "STROBE", freq: 3.545 },
        { word: "BISTRO", freq: 3.552 },
        { word: "FLICK", freq: 3.555 },
        { word: "BOMBS", freq: 3.565 },
        { word: "BREAK", freq: 3.572 },
        { word: "BRICK", freq: 3.575 },
        { word: "STEAK", freq: 3.582 },
        { word: "STING", freq: 3.592 },
        { word: "VECTOR", freq: 3.595 },
        { word: "BEATS", freq: 3.6 }
      ]
    };
  }
});

// server/modules/morse.js
var require_morse2 = __commonJS({
  "server/modules/morse.js"(exports, module) {
    var data = require_morse();
    var TYPE = "morse";
    var NAME = "Morse Code";
    function fixedManual() {
      return {
        intro: data.intro,
        alphabet: data.alphabet,
        table: data.table.map((e) => ({
          word: e.word,
          freq: Number(e.freq).toFixed(3) + " MHz"
        }))
      };
    }
    function generate(ctx) {
      const { rng } = ctx;
      const entries = data.table.map((e) => ({ word: e.word, freq: +Number(e.freq).toFixed(3) })).sort((a, b) => a.freq - b.freq);
      const word = rng.pick(entries).word;
      const solutionFreq = entries.find((e) => e.word === word).freq;
      const pattern = word.split("").map((ch) => data.alphabet[ch]);
      const state = {
        word,
        solutionFreq,
        frequencies: entries.map((e) => e.freq),
        selected: 0,
        pattern
      };
      return { state, manual: fixedManual(), view: view(state) };
    }
    function view(state) {
      return {
        pattern: state.pattern,
        frequencies: state.frequencies,
        selected: state.selected
      };
    }
    function action(state, act) {
      if (act.type === "tune") {
        const idx = act.index;
        if (idx >= 0 && idx < state.frequencies.length) state.selected = idx;
        return { status: "ok", view: view(state) };
      }
      if (act.type === "transmit") {
        const freq = state.frequencies[state.selected];
        if (freq === state.solutionFreq) {
          return { status: "solved", view: view(state), detail: `transmitted ${freq}` };
        }
        return { status: "strike", view: view(state), detail: `transmitted ${freq}, expected ${state.solutionFreq}` };
      }
      return { status: "ok", view: view(state) };
    }
    module.exports = { type: TYPE, name: NAME, generate, action, fixedManual };
  }
});

// data/modules/logicgrid.json
var require_logicgrid = __commonJS({
  "data/modules/logicgrid.json"(exports, module) {
    module.exports = {
      engineers: ["VEGA", "OKAFOR", "REYES"],
      panels: ["CRIMSON", "TEAL", "AMBER"],
      shifts: ["DAWN", "DUSK", "NIGHT"],
      entitiesByDifficulty: {
        easy: 3,
        normal: 3,
        hard: 3
      },
      questionsByDifficulty: {
        easy: 1,
        normal: 2,
        hard: 2
      },
      intro: "Three engineers each maintain one panel and work one shift (no two share either). The Defuser will read the intercepted notes aloud from the module screen. Use those notes with the roster below to fill the assignment, then answer the question the Defuser sees on the device.",
      rosterNote: "Roster is always the same. Only the intercepted notes and the device question change between games."
    };
  }
});

// server/modules/logicgrid.js
var require_logicgrid2 = __commonJS({
  "server/modules/logicgrid.js"(exports, module) {
    var data = require_logicgrid();
    var TYPE = "logicgrid";
    var NAME = "Logic Grid";
    function permutations(arr) {
      if (arr.length <= 1) return [arr];
      const out = [];
      arr.forEach((x, i) => {
        const rest = arr.slice(0, i).concat(arr.slice(i + 1));
        permutations(rest).forEach((p) => out.push([x, ...p]));
      });
      return out;
    }
    function clueHolds(clue, asg) {
      switch (clue.kind) {
        case "panel":
          return asg.panels[clue.e] === clue.p;
        case "panelNot":
          return asg.panels[clue.e] !== clue.p;
        case "shift":
          return asg.shifts[clue.e] === clue.s;
        case "shiftNot":
          return asg.shifts[clue.e] !== clue.s;
        case "cross":
          return asg.shifts[asg.panels.indexOf(clue.p)] === clue.s;
        case "crossNot":
          return asg.shifts[asg.panels.indexOf(clue.p)] !== clue.s;
        default:
          return true;
      }
    }
    function clueText(clue, names, panels, shifts) {
      switch (clue.kind) {
        case "panel":
          return `${names[clue.e]} maintains the ${panels[clue.p]} panel.`;
        case "panelNot":
          return `${names[clue.e]} does not maintain the ${panels[clue.p]} panel.`;
        case "shift":
          return `${names[clue.e]} works the ${shifts[clue.s]} shift.`;
        case "shiftNot":
          return `${names[clue.e]} does not work the ${shifts[clue.s]} shift.`;
        case "cross":
          return `The engineer with the ${panels[clue.p]} panel works the ${shifts[clue.s]} shift.`;
        case "crossNot":
          return `The engineer with the ${panels[clue.p]} panel does not work the ${shifts[clue.s]} shift.`;
        default:
          return "";
      }
    }
    function randomTrueClue(rng, truth, n) {
      const e = rng.int(0, n - 1);
      const kind = rng.pick(["panelNot", "shiftNot", "cross", "crossNot", "panel", "shift", "panelNot", "shiftNot", "crossNot"]);
      switch (kind) {
        case "panel":
          return { kind, e, p: truth.panels[e] };
        case "shift":
          return { kind, e, s: truth.shifts[e] };
        case "panelNot": {
          let p;
          do {
            p = rng.int(0, n - 1);
          } while (p === truth.panels[e]);
          return { kind, e, p };
        }
        case "shiftNot": {
          let s;
          do {
            s = rng.int(0, n - 1);
          } while (s === truth.shifts[e]);
          return { kind, e, s };
        }
        case "cross": {
          const p = rng.int(0, n - 1);
          return { kind, p, s: truth.shifts[truth.panels.indexOf(p)] };
        }
        case "crossNot": {
          const p = rng.int(0, n - 1);
          let s;
          do {
            s = rng.int(0, n - 1);
          } while (s === truth.shifts[truth.panels.indexOf(p)]);
          return { kind, p, s };
        }
      }
    }
    function fixedManual() {
      return {
        intro: data.intro,
        rosterNote: data.rosterNote,
        entities: {
          engineers: data.engineers,
          panels: data.panels,
          shifts: data.shifts
        },
        // Clues live on the device now — manual only has the fixed roster.
        clues: [
          "Ask the Defuser to read the INTERCEPTED NOTES from the module screen.",
          "Fill the roster so each engineer has exactly one panel and one shift.",
          "Then answer the question shown on the device."
        ]
      };
    }
    function generate(ctx) {
      const { rng, difficulty } = ctx;
      const n = data.entitiesByDifficulty[difficulty];
      const names = data.engineers.slice(0, n);
      const panels = data.panels.slice(0, n);
      const shifts = data.shifts.slice(0, n);
      const idx = Array.from({ length: n }, (_, i) => i);
      const truth = { panels: rng.shuffle(idx), shifts: rng.shuffle(idx) };
      const allCandidates = [];
      for (const pp of permutations(idx)) {
        for (const sp of permutations(idx)) allCandidates.push({ panels: pp, shifts: sp });
      }
      const clues = [];
      let candidates = allCandidates;
      let guard = 0;
      while (candidates.length > 1 && guard++ < 60) {
        const clue = randomTrueClue(rng, truth, n);
        const filtered = candidates.filter((c) => clueHolds(clue, c));
        if (filtered.length < candidates.length) {
          clues.push(clue);
          candidates = filtered;
        }
      }
      const clueLines = rng.shuffle(clues).map((c) => clueText(c, names, panels, shifts));
      const questionCount = data.questionsByDifficulty[difficulty];
      const questions = [];
      const qTypes = rng.shuffle(["panelOf", "engineerOfShift"]);
      for (let q = 0; q < questionCount; q++) {
        const t = qTypes[q % qTypes.length];
        if (t === "panelOf") {
          const e = rng.int(0, n - 1);
          questions.push({
            text: `Which panel does ${names[e]} maintain?`,
            options: panels,
            answer: panels[truth.panels[e]]
          });
        } else {
          const s = rng.int(0, n - 1);
          const e = truth.shifts.indexOf(s);
          questions.push({
            text: `Which engineer works the ${shifts[s]} shift?`,
            options: names,
            answer: names[e]
          });
        }
      }
      const state = {
        questions,
        stage: 0,
        clues: clueLines,
        clueIndex: 0
      };
      return { state, manual: fixedManual(), view: view(state) };
    }
    function view(state) {
      const q = state.questions[state.stage];
      return {
        stage: state.stage + 1,
        totalStages: state.questions.length,
        question: q ? q.text : null,
        options: q ? q.options : [],
        // Defuser reads these aloud — they are NOT in the printed manual.
        clues: state.clues,
        clueIndex: state.clueIndex
      };
    }
    function action(state, act) {
      if (act.type === "nextClue") {
        if (state.clues.length) {
          state.clueIndex = (state.clueIndex + 1) % state.clues.length;
        }
        return { status: "ok", view: view(state) };
      }
      if (act.type !== "answer") return { status: "ok", view: view(state) };
      const q = state.questions[state.stage];
      if (!q || !q.options.includes(act.option)) return { status: "ok", view: view(state) };
      if (act.option === q.answer) {
        state.stage++;
        if (state.stage >= state.questions.length) {
          return { status: "solved", view: view(state), detail: "all questions answered" };
        }
        return { status: "ok", view: view(state), detail: "question passed" };
      }
      return { status: "strike", view: view(state), detail: `wrong answer ${act.option}, expected ${q.answer}` };
    }
    module.exports = { type: TYPE, name: NAME, generate, action, fixedManual };
  }
});

// server/modules/index.js
var require_modules = __commonJS({
  "server/modules/index.js"(exports, module) {
    var wires = require_wires2();
    var symbols = require_symbols2();
    var memory = require_memory2();
    var morse = require_morse2();
    var logicgrid = require_logicgrid2();
    var MODULES = [wires, symbols, memory, morse, logicgrid];
    var registry = new Map(MODULES.map((m) => [m.type, m]));
    function getModule(type) {
      const mod = registry.get(type);
      if (!mod) throw new Error(`Unknown module type: ${type}`);
      return mod;
    }
    function allTypes() {
      return MODULES.map((m) => ({ type: m.type, name: m.name }));
    }
    module.exports = { getModule, allTypes, MODULES };
  }
});

// server/game.js
var require_game = __commonJS({
  "server/game.js"(exports, module) {
    var { Rng, randomSeed } = require_rng();
    var { getModule, MODULES } = require_modules();
    var DIFFICULTY = {
      easy: { moduleCount: 3, timeMs: 6 * 60 * 1e3, maxStrikes: 3, strikeAccel: 0.15 },
      normal: { moduleCount: 5, timeMs: 5 * 60 * 1e3, maxStrikes: 3, strikeAccel: 0.25 },
      hard: { moduleCount: 5, timeMs: 3.5 * 60 * 1e3, maxStrikes: 2, strikeAccel: 0.35 }
    };
    function makeSerial(rng) {
      const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
      const digits = "0123456789";
      return rng.pick([...letters]) + rng.pick([...letters]) + rng.pick([...digits]) + rng.pick([...digits]) + rng.pick([...letters]) + rng.pick([...digits]);
    }
    var Game = class {
      /**
       * @param {object} opts { difficulty, seed, events: { onTick, onStrike, onModuleUpdate, onModuleSolved, onGameOver } }
       */
      constructor({ difficulty = "normal", seed, events, logger }) {
        this.difficulty = DIFFICULTY[difficulty] ? difficulty : "normal";
        this.config = DIFFICULTY[this.difficulty];
        this.seed = seed && String(seed).trim() ? String(seed).trim().toUpperCase() : randomSeed();
        this.events = events;
        this.logger = logger;
        const rng = new Rng(this.seed);
        this.serial = makeSerial(rng);
        this.strikes = 0;
        this.remainingMs = this.config.timeMs;
        this.status = "running";
        this.startedAt = Date.now();
        const types = rng.shuffle(MODULES.map((m) => m.type)).slice(0, this.config.moduleCount);
        this.modules = types.map((type, i) => {
          const mod = getModule(type);
          const ctx = { rng: rng.child(`${type}#${i}`), difficulty: this.difficulty, serial: this.serial };
          const { state, manual, view } = mod.generate(ctx);
          return { id: `m${i + 1}`, type, name: mod.name, state, manual, view, solved: false };
        });
        this.logger.log("game:start", {
          seed: this.seed,
          difficulty: this.difficulty,
          serial: this.serial,
          modules: this.modules.map((m) => ({ id: m.id, type: m.type }))
        });
        this._lastTick = Date.now();
        this._interval = setInterval(() => this._tick(), 500);
      }
      get timeScale() {
        return 1 + this.strikes * this.config.strikeAccel;
      }
      _tick() {
        if (this.status !== "running") return;
        const now = Date.now();
        this.remainingMs -= (now - this._lastTick) * this.timeScale;
        this._lastTick = now;
        if (this.remainingMs <= 0) {
          this.remainingMs = 0;
          this._end("lost", "timer");
          return;
        }
        this.events.onTick({ remainingMs: Math.round(this.remainingMs), timeScale: this.timeScale });
      }
      /** Defuser interacted with a module. */
      handleAction(moduleId, action, playerName) {
        if (this.status !== "running") return;
        const inst = this.modules.find((m) => m.id === moduleId);
        if (!inst || inst.solved) return;
        const mod = getModule(inst.type);
        const result = mod.action(inst.state, action, { serial: this.serial });
        inst.view = result.view;
        this.logger.log("module:action", {
          moduleId,
          type: inst.type,
          action,
          status: result.status,
          detail: result.detail,
          by: playerName
        });
        this.events.onModuleUpdate({ moduleId, view: result.view });
        if (result.status === "strike") {
          this.strikes++;
          this.events.onStrike({ strikes: this.strikes, maxStrikes: this.config.maxStrikes, moduleId });
          if (this.strikes >= this.config.maxStrikes) {
            this._end("lost", "strikes");
            return;
          }
        } else if (result.status === "solved") {
          inst.solved = true;
          this.events.onModuleSolved({ moduleId, solvedCount: this.solvedCount() });
          if (this.modules.every((m) => m.solved)) {
            this._end("won", "all modules defused");
          }
        }
      }
      solvedCount() {
        return this.modules.filter((m) => m.solved).length;
      }
      _end(result, reason) {
        if (this.status !== "running") return;
        this.status = result;
        clearInterval(this._interval);
        const summary = {
          result,
          reason,
          seed: this.seed,
          difficulty: this.difficulty,
          strikes: this.strikes,
          modulesSolved: this.solvedCount(),
          modulesTotal: this.modules.length,
          timeRemainingMs: Math.max(0, Math.round(this.remainingMs)),
          durationMs: Date.now() - this.startedAt
        };
        this.logger.log("game:over", summary);
        this.events.onGameOver(summary);
      }
      /** Payload for the Defuser: module views, never rules. */
      defuserPayload() {
        return {
          role: "defuser",
          seed: this.seed,
          difficulty: this.difficulty,
          serial: this.serial,
          timeMs: Math.round(this.remainingMs),
          maxStrikes: this.config.maxStrikes,
          strikes: this.strikes,
          modules: this.modules.map((m) => ({ id: m.id, type: m.type, name: m.name, view: m.view, solved: m.solved }))
        };
      }
      /** Payload for Experts: manuals only, never device views or the serial. */
      expertPayload() {
        return {
          role: "expert",
          seed: this.seed,
          difficulty: this.difficulty,
          timeMs: Math.round(this.remainingMs),
          maxStrikes: this.config.maxStrikes,
          strikes: this.strikes,
          manuals: this.modules.map((m) => ({ id: m.id, type: m.type, name: m.name, manual: m.manual, solved: m.solved }))
        };
      }
      destroy() {
        clearInterval(this._interval);
      }
    };
    module.exports = { Game, DIFFICULTY };
  }
});
export default require_game();
