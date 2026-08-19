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
      intro: "The lamp stays dark for a few seconds after the round starts, then flashes the word on a loop. A short gap separates dots/dashes within a letter; a longer gap separates letters; a long pause repeats the word. Press RST to restart from the first letter. Press SND to hear the tone with the lamp (lights still flash either way). Decode the word, find it in the frequency table, then have the Defuser tune to that frequency and transmit (TX).",
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
      engineers: ["HALE", "ORTEGA", "PARK"],
      panels: ["C2", "FIRES", "INTEL"],
      shifts: ["PLAN", "EXECUTE", "ASSESS"],
      labels: {
        engineers: "Captains",
        panels: "Joint Functions",
        shifts: "Phases"
      },
      entitiesByDifficulty: {
        easy: 3,
        normal: 3,
        hard: 3
      },
      questionsByDifficulty: {
        easy: 1,
        normal: 2,
        hard: 3
      },
      intro: "Three captains each own one joint function and lead one planning phase (no two share either). This roster mirrors joint-function thinking used in Squadron Officer School. The Defuser reads intercepted notes from the clipboard on the table, then answers the question on the device.",
      rosterNote: "Roster is always the same. Only the intercepted notes and the device question change between games."
    };
  }
});

// server/modules/logicgrid.js
var require_logicgrid2 = __commonJS({
  "server/modules/logicgrid.js"(exports, module) {
    var data = require_logicgrid();
    var TYPE = "logicgrid";
    var NAME = "Joint Functions";
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
    function clueText(clue, names, functions, phases) {
      switch (clue.kind) {
        case "panel":
          return `${names[clue.e]} owns the ${functions[clue.p]} function.`;
        case "panelNot":
          return `${names[clue.e]} does not own the ${functions[clue.p]} function.`;
        case "shift":
          return `${names[clue.e]} leads the ${phases[clue.s]} phase.`;
        case "shiftNot":
          return `${names[clue.e]} does not lead the ${phases[clue.s]} phase.`;
        case "cross":
          return `The captain owning ${functions[clue.p]} leads the ${phases[clue.s]} phase.`;
        case "crossNot":
          return `The captain owning ${functions[clue.p]} does not lead the ${phases[clue.s]} phase.`;
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
      const labels = data.labels || {
        engineers: "Captains",
        panels: "Joint Functions",
        shifts: "Phases"
      };
      return {
        intro: data.intro,
        rosterNote: data.rosterNote,
        labels,
        entities: {
          engineers: data.engineers,
          panels: data.panels,
          shifts: data.shifts
        },
        clues: [
          "Ask the Defuser to read all INTERCEPTED NOTES from the clipboard on the table.",
          "Assign each captain exactly one joint function and one phase.",
          "Then answer the question shown on the device."
        ]
      };
    }
    function generate(ctx) {
      const { rng, difficulty } = ctx;
      const n = data.entitiesByDifficulty[difficulty];
      const names = data.engineers.slice(0, n);
      const functions = data.panels.slice(0, n);
      const phases = data.shifts.slice(0, n);
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
      const clueLines = rng.shuffle(clues).map((c) => clueText(c, names, functions, phases));
      const questionCount = data.questionsByDifficulty[difficulty];
      const questions = [];
      const qTypes = rng.shuffle(["panelOf", "engineerOfShift"]);
      for (let q = 0; q < questionCount; q++) {
        const t = qTypes[q % qTypes.length];
        if (t === "panelOf") {
          const e = rng.int(0, n - 1);
          questions.push({
            text: `Which joint function does ${names[e]} own?`,
            options: functions,
            answer: functions[truth.panels[e]]
          });
        } else {
          const s = rng.int(0, n - 1);
          const e = truth.shifts.indexOf(s);
          questions.push({
            text: `Which captain leads the ${phases[s]} phase?`,
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

// data/modules/ordnance.json
var require_ordnance = __commonJS({
  "data/modules/ordnance.json"(exports, module) {
    module.exports = {
      weapons: [
        { id: "GBU-12", desc: "500 lb laser-guided bomb", guidance: "LASER" },
        { id: "GBU-31", desc: "2000 lb JDAM, penetrator", guidance: "GPS" },
        { id: "GBU-38", desc: "500 lb JDAM, low collateral", guidance: "GPS" },
        { id: "AGM-65", desc: "Maverick missile (laser-guided)", guidance: "LASER" }
      ],
      targetsByDifficulty: {
        easy: 1,
        normal: 2,
        hard: 3
      },
      movingTargets: ["T-72 COLUMN", "ARMOR CONVOY", "SCUD TEL"],
      staticTargets: ["RADAR SITE", "C2 BUNKER", "SUPPLY DEPOT", "HQ BUILDING", "SAM SITE"],
      intro: "A stores-management panel with a targeting screen. The Defuser must fly a full release checklist for every target card \u2014 one wrong PICKLE is a strike. The Defuser reads the target card aloud; you weaponeer it and talk them through the panel setup.",
      rules: [
        "If the target is MOVING, select AGM-65.",
        "Otherwise, if the target is URBAN (collateral must stay LOW), select GBU-38.",
        "Otherwise, if the target is HARDENED, select GBU-31.",
        "Otherwise, if weather is CLEAR, select GBU-12.",
        "Otherwise (static, open, soft, weather IMC), select GBU-31."
      ],
      fuzeRules: [
        "HARDENED target: fuze TAIL.",
        "Any other target: fuze NOSE."
      ],
      codeRules: [
        "LASER weapons (GBU-12, AGM-65): the code is 1, then the two digits from the middle of the serial number (positions 3 and 4).",
        "GPS weapons (GBU-31, GBU-38): the code must read 000."
      ],
      checklist: [
        "MASTER ARM lever to ARM.",
        "Rotate the STATION knob until the correct weapon shows.",
        "Set the FUZE switch (NOSE / TAIL).",
        "Dial the 3-digit CODE on the thumbwheels.",
        "Press PICKLE. Repeat for each target card.",
        "After the final target: MASTER ARM back to SAFE, or the module never disarms."
      ]
    };
  }
});

// server/modules/ordnance.js
var require_ordnance2 = __commonJS({
  "server/modules/ordnance.js"(exports, module) {
    var data = require_ordnance();
    var TYPE = "ordnance";
    var NAME = "Weapons Release";
    var WEAPON_IDS = data.weapons.map((w) => w.id);
    var LASER = new Set(data.weapons.filter((w) => w.guidance === "LASER").map((w) => w.id));
    function weaponFor(attrs) {
      if (attrs.moving) return "AGM-65";
      if (attrs.urban) return "GBU-38";
      if (attrs.hardened) return "GBU-31";
      if (attrs.wx === "CLEAR") return "GBU-12";
      return "GBU-31";
    }
    function makeTarget(rng, serial) {
      const intended = rng.pick(["GBU-12", "GBU-31", "GBU-38", "AGM-65", "GBU-31"]);
      const attrs = { moving: false, urban: false, hardened: false, wx: rng.pick(["CLEAR", "IMC"]) };
      switch (intended) {
        case "AGM-65":
          attrs.moving = true;
          attrs.urban = rng.float() < 0.35;
          attrs.hardened = rng.float() < 0.3;
          break;
        case "GBU-38":
          attrs.urban = true;
          attrs.hardened = rng.float() < 0.4;
          break;
        case "GBU-12":
          attrs.wx = "CLEAR";
          break;
        default:
          if (rng.float() < 0.5) attrs.hardened = true;
          else attrs.wx = "IMC";
          break;
      }
      const weapon = weaponFor(attrs);
      const fuze = attrs.hardened ? "TAIL" : "NOSE";
      const code = LASER.has(weapon) ? [1, parseInt(serial[2], 10), parseInt(serial[3], 10)] : [0, 0, 0];
      const name = attrs.moving ? rng.pick(data.movingTargets) : rng.pick(data.staticTargets);
      return { name, attrs, weapon, fuze, code };
    }
    function describe(t) {
      const a = t.attrs;
      return [
        t.name,
        a.moving ? "MOVING" : "STATIC",
        a.urban ? "URBAN" : "OPEN TERRAIN",
        a.hardened ? "HARDENED" : "SOFT",
        `WX ${a.wx}`
      ].join(" \xB7 ");
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
        fuze: "NOSE",
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
        case "arm": {
          state.masterArm = !state.masterArm;
          if (!state.masterArm && allServiced) {
            return { status: "solved", view: view(state), detail: "weapons safe, all targets serviced" };
          }
          return { status: "ok", view: view(state) };
        }
        case "station": {
          state.station = (state.station + 1) % state.weapons.length;
          return { status: "ok", view: view(state) };
        }
        case "fuze": {
          state.fuze = state.fuze === "NOSE" ? "TAIL" : "NOSE";
          return { status: "ok", view: view(state) };
        }
        case "wheel": {
          const i = act.index;
          if (i === 0 || i === 1 || i === 2) {
            state.code[i] = (state.code[i] + 1) % 10;
          }
          return { status: "ok", view: view(state) };
        }
        case "pickle": {
          if (allServiced) return { status: "ok", view: view(state) };
          if (!state.masterArm) {
            return { status: "ok", view: view(state), detail: "pickle with MASTER ARM safe" };
          }
          const t = state.targets[state.index];
          const selected = state.weapons[state.station];
          const codeOk = state.code[0] === t.code[0] && state.code[1] === t.code[1] && state.code[2] === t.code[2];
          if (selected === t.weapon && state.fuze === t.fuze && codeOk) {
            state.index++;
            if (state.index >= state.targets.length) {
              return { status: "ok", view: view(state), detail: "final target destroyed \u2014 safe the panel" };
            }
            return { status: "ok", view: view(state), detail: "target destroyed" };
          }
          const expect = `${t.weapon}/${t.fuze}/${t.code.join("")}`;
          const got = `${selected}/${state.fuze}/${state.code.join("")}`;
          return { status: "strike", view: view(state), detail: `bad release ${got}, expected ${expect}` };
        }
        default:
          return { status: "ok", view: view(state) };
      }
    }
    module.exports = { type: TYPE, name: NAME, generate, action, fixedManual };
  }
});

// data/modules/comms.json
var require_comms = __commonJS({
  "data/modules/comms.json"(exports, module) {
    module.exports = {
      band: { start: 240, step: 0.25, steps: 25 },
      callsigns: [
        { call: "VIPER 21", net: "AWACS CHECK-IN", freq: 243.75 },
        { call: "HAVOC 11", net: "TACTICAL", freq: 241.25 },
        { call: "PYTHON 31", net: "STRIKE", freq: 245.5 },
        { call: "COBRA 05", net: "AIRBORNE ALERT", freq: 240.75 },
        { call: "MUSTANG 41", net: "TANKER", freq: 244.25 },
        { call: "RAGE 12", net: "GUARD", freq: 242 },
        { call: "SABER 33", net: "JTAC", freq: 245 },
        { call: "NOMAD 62", net: "RESCUE", freq: 241.75 }
      ],
      matrixLabels: ["WHISKEY", "ROMEO", "TANGO", "FOXTROT", "KILO"],
      matrix: [
        ["M", "T", "R", "J", "P"],
        ["K", "B", "S", "L", "D"],
        ["G", "N", "V", "C", "F"],
        ["H", "W", "Q", "A", "X"],
        ["Z", "E", "U", "Y", "O"]
      ],
      roundsByDifficulty: {
        easy: 1,
        normal: 1,
        hard: 2
      },
      intro: "A UHF radio. Step 1 \u2014 NET: the screen shows a callsign; look up its frequency in the comms annex and have the Defuser dial it exactly (coarse \xB11.00, fine \xB10.25), then key XMIT. Keying on the wrong frequency is a strike. Step 2 \u2014 AUTH: the screen shows a phonetic challenge like WHISKEY \xB7 FOXTROT; find the row (first word) and column (second word) in the authentication matrix and have the Defuser spin the letter dial to that letter and press AUTH. A wrong letter is a strike."
    };
  }
});

// server/modules/comms.js
var require_comms2 = __commonJS({
  "server/modules/comms.js"(exports, module) {
    var data = require_comms();
    var TYPE = "comms";
    var NAME = "Radio Net";
    var { start, step, steps } = data.band;
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
          challenge: `${data.matrixLabels[row]} \xB7 ${data.matrixLabels[col]}`,
          answer: data.matrix[row][col]
        };
      });
      const state = {
        rounds,
        round: 0,
        phase: "net",
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
        phase: r ? state.phase : "done",
        prompt: r ? state.phase === "net" ? r.call : r.challenge : null,
        freq: freqAt(state.freqIdx),
        letter: String.fromCharCode(65 + state.letterIdx)
      };
    }
    function action(state, act) {
      const r = state.rounds[state.round];
      switch (act.type) {
        case "tune": {
          const delta = Math.trunc(Number(act.steps) || 0);
          state.freqIdx = Math.min(steps - 1, Math.max(0, state.freqIdx + delta));
          return { status: "ok", view: view(state) };
        }
        case "letter": {
          const delta = Math.trunc(Number(act.delta) || 0);
          state.letterIdx = ((state.letterIdx + delta) % 26 + 26) % 26;
          return { status: "ok", view: view(state) };
        }
        case "xmit": {
          if (!r || state.phase !== "net") return { status: "ok", view: view(state) };
          if (state.freqIdx === r.answerIdx) {
            state.phase = "auth";
            return { status: "ok", view: view(state), detail: `net established on ${freqAt(state.freqIdx)}` };
          }
          return { status: "strike", view: view(state), detail: `keyed ${freqAt(state.freqIdx)}, expected ${freqAt(r.answerIdx)}` };
        }
        case "auth": {
          if (!r || state.phase !== "auth") return { status: "ok", view: view(state) };
          const letter = String.fromCharCode(65 + state.letterIdx);
          if (letter === r.answer) {
            state.round++;
            state.phase = "net";
            if (state.round >= state.rounds.length) {
              return { status: "solved", view: view(state), detail: "all nets authenticated" };
            }
            return { status: "ok", view: view(state), detail: "authentication valid" };
          }
          return { status: "strike", view: view(state), detail: `bad auth ${letter}, expected ${r.answer}` };
        }
        default:
          return { status: "ok", view: view(state) };
      }
    }
    module.exports = { type: TYPE, name: NAME, generate, action, fixedManual };
  }
});

// data/modules/threatplot.json
var require_threatplot = __commonJS({
  "data/modules/threatplot.json"(exports, module) {
    module.exports = {
      sizesByDifficulty: { easy: 5, normal: 6, hard: 6 },
      samsByDifficulty: { easy: 3, normal: 4, hard: 5 },
      minPathByDifficulty: { easy: 4, normal: 5, hard: 7 },
      samTypes: [
        { type: "SA-3", radius: 0, coverage: "its own cell only" },
        { type: "SA-6", radius: 1, coverage: "its cell and all 8 neighboring cells" },
        { type: "SA-2", radius: 2, coverage: "its cell and every cell up to 2 cells away in any direction (diagonals count as one step)" }
      ],
      intro: "The Defuser's scope shows the jet, the target, SAM sites with their type, and \u2014 on long sorties \u2014 a tanker anchor (T). The scope does NOT show SAM coverage rings. The Defuser reads out the grid, the SAM types, and their cells; the Experts mark each site's coverage from the table below, find a safe route, and talk the jet to the target one step at a time (N / E / S / W). Entering covered airspace or leaving the grid is a strike and the jet resets to its start cell. If a tanker anchor is shown, the jet must pass through it BEFORE reaching the target \u2014 hitting the target dry is a strike.",
      rules: [
        "Columns are letters (A, B, C\u2026) left to right; rows are numbers (1, 2, 3\u2026) top to bottom.",
        "Mark each SAM's coverage using the table, then route the jet only through uncovered cells.",
        "If a tanker anchor (T) is on the scope, the jet must pass through it before the target; the target only accepts a refueled jet.",
        "A strike resets the jet to its start cell AND clears any refueling \u2014 plan the whole route before calling steps."
      ]
    };
  }
});

// server/modules/threatplot.js
var require_threatplot2 = __commonJS({
  "server/modules/threatplot.js"(exports, module) {
    var data = require_threatplot();
    var TYPE = "threatplot";
    var NAME = "Threat Plot";
    var COL_LETTERS = "ABCDEFGH";
    var DIRS = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
    function cellName(c) {
      return `${COL_LETTERS[c.x]}${c.y + 1}`;
    }
    function radiusOf(type) {
      return data.samTypes.find((s) => s.type === type).radius;
    }
    function coverageSet(sams) {
      const covered = /* @__PURE__ */ new Set();
      for (const sam of sams) {
        const r = radiusOf(sam.type);
        for (let dx = -r; dx <= r; dx++) {
          for (let dy = -r; dy <= r; dy++) {
            covered.add(`${sam.x + dx},${sam.y + dy}`);
          }
        }
      }
      return covered;
    }
    function findPath(size, covered, start, target, tanker) {
      const key = (x, y, ref) => `${x},${y},${ref ? 1 : 0}`;
      const startRef = !tanker;
      const queue = [{ x: start.x, y: start.y, ref: startRef, steps: [] }];
      const seen = /* @__PURE__ */ new Set([key(start.x, start.y, startRef)]);
      while (queue.length) {
        const cur = queue.shift();
        if (cur.x === target.x && cur.y === target.y && cur.ref) return cur.steps;
        for (const [dir, [dx, dy]] of Object.entries(DIRS)) {
          const nx = cur.x + dx;
          const ny = cur.y + dy;
          if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
          if (covered.has(`${nx},${ny}`)) continue;
          const ref = cur.ref || tanker && nx === tanker.x && ny === tanker.y;
          const k = key(nx, ny, ref);
          if (seen.has(k)) continue;
          seen.add(k);
          queue.push({ x: nx, y: ny, ref, steps: [...cur.steps, dir] });
        }
      }
      return null;
    }
    function fixedManual() {
      return {
        intro: data.intro,
        samTypes: data.samTypes.map((s) => ({ type: s.type, coverage: s.coverage })),
        rules: data.rules
      };
    }
    function generate(ctx) {
      const { rng, difficulty } = ctx;
      const size = data.sizesByDifficulty[difficulty];
      const samCount = data.samsByDifficulty[difficulty];
      const minPath = data.minPathByDifficulty[difficulty];
      const needTanker = difficulty === "hard";
      const samWeights = ["SA-3", "SA-3", "SA-6", "SA-6", "SA-2"];
      let layout = null;
      for (let attempt = 0; attempt < 400 && !layout; attempt++) {
        const rndCell = () => ({ x: rng.int(0, size - 1), y: rng.int(0, size - 1) });
        const start = rndCell();
        let target = rndCell();
        if (target.x === start.x && target.y === start.y) continue;
        if (Math.abs(target.x - start.x) + Math.abs(target.y - start.y) < 3) continue;
        let tanker = null;
        if (needTanker) {
          tanker = rndCell();
          if (tanker.x === start.x && tanker.y === start.y || tanker.x === target.x && tanker.y === target.y) continue;
        }
        const reserved = new Set([start, target, ...tanker ? [tanker] : []].map((c) => `${c.x},${c.y}`));
        const open = [];
        for (let x = 0; x < size; x++) for (let y = 0; y < size; y++) {
          if (!reserved.has(`${x},${y}`)) open.push({ x, y });
        }
        if (open.length < samCount) continue;
        const samCells = rng.shuffle(open).slice(0, samCount);
        const sams = samCells.map((c) => ({ ...c, type: rng.pick(samWeights) }));
        const covered = coverageSet(sams);
        if ([start, target, ...tanker ? [tanker] : []].some((c) => covered.has(`${c.x},${c.y}`))) continue;
        const path = findPath(size, covered, start, target, tanker);
        if (!path || path.length < minPath) continue;
        layout = { size, start, target, tanker, sams };
      }
      if (!layout) {
        layout = {
          size,
          start: { x: 0, y: 0 },
          target: { x: size - 1, y: size - 1 },
          tanker: needTanker ? { x: size - 1, y: 0 } : null,
          sams: [{ x: Math.floor(size / 2), y: Math.floor(size / 2), type: "SA-3" }]
        };
      }
      const state = {
        ...layout,
        pos: { ...layout.start },
        refueled: !layout.tanker
      };
      return { state, manual: fixedManual(), view: view(state) };
    }
    function view(state) {
      return {
        size: state.size,
        start: cellName(state.start),
        target: cellName(state.target),
        tanker: state.tanker ? cellName(state.tanker) : null,
        sams: state.sams.map((s) => ({ type: s.type, cell: cellName(s) })),
        player: cellName(state.pos),
        refueled: state.refueled
      };
    }
    function resetToStart(state) {
      state.pos = { ...state.start };
      state.refueled = !state.tanker;
    }
    function action(state, act) {
      if (act.type !== "step" || !DIRS[act.dir]) return { status: "ok", view: view(state) };
      const [dx, dy] = DIRS[act.dir];
      const nx = state.pos.x + dx;
      const ny = state.pos.y + dy;
      const covered = coverageSet(state.sams);
      const outOfBounds = nx < 0 || ny < 0 || nx >= state.size || ny >= state.size;
      if (outOfBounds || covered.has(`${nx},${ny}`)) {
        const reason = outOfBounds ? "left the grid" : "entered threat coverage";
        resetToStart(state);
        return { status: "strike", view: view(state), detail: reason };
      }
      state.pos = { x: nx, y: ny };
      if (state.tanker && nx === state.tanker.x && ny === state.tanker.y) state.refueled = true;
      if (nx === state.target.x && ny === state.target.y) {
        if (state.tanker && !state.refueled) {
          resetToStart(state);
          return { status: "strike", view: view(state), detail: "reached target without refueling" };
        }
        return { status: "solved", view: view(state), detail: "target reached" };
      }
      return { status: "ok", view: view(state) };
    }
    module.exports = { type: TYPE, name: NAME, generate, action, fixedManual };
  }
});

// data/modules/brevity.json
var require_brevity = __commonJS({
  "data/modules/brevity.json"(exports, module) {
    module.exports = {
      words: ["BANDIT", "BOGEY", "SPIKE", "MUD", "TALLY", "NO JOY", "JUDY", "WILCO", "BINGO", "JOKER", "SPLASH", "ANGELS"],
      displayRead: {
        BANDIT: 3,
        BOGEY: 1,
        SPIKE: 5,
        MUD: 2,
        TALLY: 6,
        "NO JOY": 4,
        JUDY: 2,
        WILCO: 5,
        BINGO: 1,
        JOKER: 6,
        SPLASH: 4,
        ANGELS: 3
      },
      readPress: {
        BANDIT: "WILCO",
        BOGEY: "TALLY",
        SPIKE: "ANGELS",
        MUD: "BINGO",
        TALLY: "SPIKE",
        "NO JOY": "JOKER",
        JUDY: "MUD",
        WILCO: "BOGEY",
        BINGO: "SPLASH",
        JOKER: "JUDY",
        SPLASH: "BANDIT",
        ANGELS: "NO JOY"
      },
      stagesByDifficulty: { easy: 1, normal: 2, hard: 3 },
      intro: "The device CRT shows a brevity code word above six buttons, each labeled with a brevity word. For each stage: (1) find the DISPLAY word in Table 1 \u2014 it names the button POSITION to read (numbered left to right, top to bottom, 1\u20136); (2) find the word printed on THAT button in Table 2 \u2014 it names the word to PRESS. Press the button labeled with that word to clear the stage. A wrong press is a strike and the stage stays up. Button labels reshuffle every stage."
    };
  }
});

// server/modules/brevity.js
var require_brevity2 = __commonJS({
  "server/modules/brevity.js"(exports, module) {
    var data = require_brevity();
    var TYPE = "brevity";
    var NAME = "Brevity Code";
    function fixedManual() {
      return {
        intro: data.intro,
        table1: data.words.map((w) => ({ word: w, position: data.displayRead[w] })),
        table2: data.words.map((w) => ({ read: w, press: data.readPress[w] }))
      };
    }
    function makeStage(rng) {
      const display = rng.pick(data.words);
      const readPos = data.displayRead[display];
      for (let attempt = 0; attempt < 300; attempt++) {
        const buttons2 = rng.shuffle(data.words.slice()).slice(0, 6);
        const readWord2 = buttons2[readPos - 1];
        const answer2 = data.readPress[readWord2];
        if (buttons2.includes(answer2)) return { display, buttons: buttons2, answer: answer2 };
      }
      const buttons = rng.shuffle(data.words.slice()).slice(0, 6);
      const readWord = buttons[readPos - 1];
      const answer = data.readPress[readWord];
      buttons[readPos % 6] = answer;
      return { display, buttons, answer };
    }
    function generate(ctx) {
      const { rng, difficulty } = ctx;
      const count = data.stagesByDifficulty[difficulty];
      const stages = Array.from({ length: count }, () => makeStage(rng));
      const state = { stages, stage: 0 };
      return { state, manual: fixedManual(), view: view(state) };
    }
    function view(state) {
      const s = state.stages[state.stage];
      return {
        stage: state.stage + 1,
        total: state.stages.length,
        display: s ? s.display : null,
        buttons: s ? s.buttons : []
      };
    }
    function action(state, act) {
      if (act.type !== "press") return { status: "ok", view: view(state) };
      const s = state.stages[state.stage];
      if (!s || !s.buttons.includes(act.label)) return { status: "ok", view: view(state) };
      if (act.label === s.answer) {
        state.stage++;
        if (state.stage >= state.stages.length) {
          return { status: "solved", view: view(state), detail: "all brevity stages cleared" };
        }
        return { status: "ok", view: view(state), detail: "stage cleared" };
      }
      return { status: "strike", view: view(state), detail: `pressed ${act.label}, expected ${s.answer}` };
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
    var ordnance = require_ordnance2();
    var comms = require_comms2();
    var threatplot = require_threatplot2();
    var brevity = require_brevity2();
    var MODULES = [wires, symbols, memory, morse, logicgrid, ordnance, comms, threatplot, brevity];
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
    var { getModule } = require_modules();
    var DIFFICULTY = {
      easy: { moduleCount: 3, timeMs: 8 * 60 * 1e3, maxStrikes: 3, strikeAccel: 0.15 },
      normal: { moduleCount: 4, timeMs: 10 * 60 * 1e3, maxStrikes: 3, strikeAccel: 0.25 },
      hard: { moduleCount: 5, timeMs: 12 * 60 * 1e3, maxStrikes: 2, strikeAccel: 0.4 }
    };
    var CLASSIC_MODULES = ["wires", "symbols", "memory", "morse", "logicgrid"];
    var HARD_MODULES = ["ordnance", "comms", "threatplot", "brevity"];
    function pickTypes(rng, difficulty) {
      const classic = rng.shuffle(CLASSIC_MODULES.slice());
      const hardPool = rng.shuffle(HARD_MODULES.filter((t) => t !== "ordnance"));
      if (difficulty === "easy") return rng.shuffle(classic.slice(0, 3));
      if (difficulty === "hard") {
        return rng.shuffle([...classic.slice(0, 3), "ordnance", hardPool[0]]);
      }
      const hard = rng.shuffle(HARD_MODULES.slice());
      return rng.shuffle([...classic.slice(0, 3), ...hard.slice(0, 1)]);
    }
    function makeSerial(rng) {
      const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
      const digits = "0123456789";
      return rng.pick([...letters]) + rng.pick([...letters]) + rng.pick([...digits]) + rng.pick([...digits]) + rng.pick([...letters]) + rng.pick([...digits]);
    }
    var Game = class {
      /**
       * @param {object} opts { difficulty, seed, timeMs, maxStrikes, events: { onTick, onStrike, onModuleUpdate, onModuleSolved, onGameOver } }
       */
      constructor({ difficulty = "normal", seed, events, logger, timeMs, maxStrikes } = {}) {
        this.difficulty = DIFFICULTY[difficulty] ? difficulty : "normal";
        this.config = { ...DIFFICULTY[this.difficulty] };
        const custom = Number(timeMs);
        if (Number.isFinite(custom) && custom >= 15 * 1e3 && custom <= 30 * 60 * 1e3) {
          this.config.timeMs = Math.round(custom);
        }
        const strikes = Math.round(Number(maxStrikes));
        if (Number.isFinite(strikes) && strikes >= 1 && strikes <= 9) {
          this.config.maxStrikes = strikes;
        }
        this.seed = seed && String(seed).trim() ? String(seed).trim().toUpperCase() : randomSeed();
        this.events = events;
        this.logger = logger;
        const rng = new Rng(this.seed);
        this.serial = makeSerial(rng);
        this.strikes = 0;
        this.remainingMs = this.config.timeMs;
        this.status = "running";
        this.startedAt = Date.now();
        const types = pickTypes(rng, this.difficulty);
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
      _fly(landed) {
        if (this.flyLanded === landed) return;
        this.flyLanded = landed;
        this.logger.log("fly", { landed });
      }
      get timeScale() {
        let scale = 1 + this.strikes * this.config.strikeAccel;
        if (this.flyLanded) scale += 0.5;
        return scale;
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
    module.exports = { Game, DIFFICULTY, CLASSIC_MODULES, HARD_MODULES };
  }
});
export default require_game();
