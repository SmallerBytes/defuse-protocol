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
      rulesPerCount: {
        easy: 3,
        normal: 4,
        hard: 5
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
    var CONDITIONS = [
      { key: "noneOfColor", text: (c) => `there are no ${c} wires` },
      { key: "exactlyOneOfColor", text: (c) => `there is exactly one ${c} wire` },
      { key: "moreThanOneOfColor", text: (c) => `there is more than one ${c} wire` },
      { key: "lastWireIs", text: (c) => `the last wire is ${c}` },
      { key: "serialOdd", text: () => `the last digit of the serial number is odd` }
    ];
    var ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth"];
    function conditionMatches(cond, wires, serial) {
      const count = (c) => wires.filter((w) => w === c).length;
      switch (cond.key) {
        case "noneOfColor":
          return count(cond.color) === 0;
        case "exactlyOneOfColor":
          return count(cond.color) === 1;
        case "moreThanOneOfColor":
          return count(cond.color) > 1;
        case "lastWireIs":
          return wires[wires.length - 1] === cond.color;
        case "serialOdd":
          return parseInt(serial[serial.length - 1], 10) % 2 === 1;
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
    function actionText(act) {
      if (act.key === "cutIndex") return `cut the ${ORDINALS[act.index - 1]} wire`;
      if (act.key === "cutFirstOfColor") return `cut the first ${act.color} wire`;
      return `cut the last ${act.color} wire`;
    }
    function generateRules(rng, wireCount, ruleCount) {
      const rules = [];
      const usedConditions = /* @__PURE__ */ new Set();
      let guard = 0;
      while (rules.length < ruleCount && guard++ < 100) {
        const condDef = rng.pick(CONDITIONS);
        const color = rng.pick(data.colors);
        const condKey = condDef.key + (condDef.key === "serialOdd" ? "" : ":" + color);
        if (usedConditions.has(condKey)) continue;
        usedConditions.add(condKey);
        const cond = { key: condDef.key, color };
        const guaranteesColor = ["exactlyOneOfColor", "moreThanOneOfColor", "lastWireIs"].includes(condDef.key);
        let act;
        if (guaranteesColor && rng.chance(0.55)) {
          act = { key: rng.pick(["cutFirstOfColor", "cutLastOfColor"]), color };
        } else {
          act = { key: "cutIndex", index: rng.int(1, wireCount) };
        }
        rules.push({ cond, act, text: `If ${condDef.text(color)}, ${actionText(act)}.` });
      }
      const def = { key: "cutIndex", index: rng.int(1, wireCount) };
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
        intro: "Identify the number of wires, then apply the FIRST matching rule from the matching table. Wires are numbered top to bottom starting at 1.",
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
    module.exports = { type: TYPE, name: NAME, generate, action };
  }
});

// data/modules/symbols.json
var require_symbols = __commonJS({
  "data/modules/symbols.json"(exports, module) {
    module.exports = {
      glyphs: [
        "\u03E1",
        "\u046C",
        "\u03D7",
        "\u03FF",
        "\u0482",
        "\u0298",
        "\u03A9",
        "\u0278",
        "\u0416",
        "\u03DE",
        "\u0470",
        "\u0494",
        "\u03BE",
        "\u03A8",
        "\u01EE",
        "\u10B4",
        "\u03EA",
        "\u04A8",
        "\u0194",
        "\u03EC",
        "\u01B1",
        "\u04DC",
        "\u0556",
        "\u040B",
        "\u0241",
        "\u0506",
        "\u04C1",
        "\u047A"
      ],
      columns: 6,
      symbolsPerColumn: 7,
      buttonsOnDevice: 4
    };
  }
});

// server/modules/symbols.js
var require_symbols2 = __commonJS({
  "server/modules/symbols.js"(exports, module) {
    var data = require_symbols();
    var TYPE = "symbols";
    var NAME = "Symbol Matching";
    function generate(ctx) {
      const { rng } = ctx;
      const pool = data.glyphs;
      const columns = [];
      for (let c = 0; c < data.columns; c++) {
        columns.push(rng.sample(pool, data.symbolsPerColumn));
      }
      const targetCol = rng.int(0, columns.length - 1);
      const chosen = rng.sample(columns[targetCol], data.buttonsOnDevice);
      const solution = columns[targetCol].filter((g) => chosen.includes(g));
      const displayed = rng.shuffle(solution);
      const state = {
        displayed,
        // order on the device
        solution,
        // required press order
        progress: 0
      };
      const manual = {
        intro: "Exactly one column contains all four displayed symbols. Press them in the order they appear within that column, reading top to bottom.",
        columns
      };
      return { state, manual, view: view(state) };
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
    module.exports = { type: TYPE, name: NAME, generate, action };
  }
});

// data/modules/memory.json
var require_memory = __commonJS({
  "data/modules/memory.json"(exports, module) {
    module.exports = {
      stages: 5,
      buttons: 4,
      stagesByDifficulty: {
        easy: 3,
        normal: 4,
        hard: 5
      }
    };
  }
});

// server/modules/memory.js
var require_memory2 = __commonJS({
  "server/modules/memory.js"(exports, module) {
    var data = require_memory();
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
    function generateRuleTable(rng, stages, buttons) {
      const table = [];
      for (let s = 1; s <= stages; s++) {
        const row = {};
        for (let d = 1; d <= buttons; d++) {
          const kinds = s === 1 ? ["position", "label"] : ["position", "label", "samePosition", "sameLabel", "samePosition", "sameLabel"];
          const kind = rng.pick(kinds);
          if (kind === "position" || kind === "label") {
            row[d] = { kind, n: rng.int(1, buttons) };
          } else {
            row[d] = { kind, stage: rng.int(1, s - 1) };
          }
        }
        table.push(row);
      }
      return table;
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
      const table = generateRuleTable(rng, stages, buttons);
      const state = {
        rng: null,
        // replaced below; rng stream stored for stage regeneration
        stages,
        buttons,
        table,
        stage: 1,
        history: [],
        current: newStage(rng, buttons),
        _rngSeed: rng.seed + "::stages"
      };
      const { Rng } = require_rng();
      state._stageRng = new Rng(state._rngSeed);
      state.current = newStage(state._stageRng, buttons);
      const manual = {
        intro: `This module has ${stages} stages. For each stage, look up the rule matching the number on the display. Positions are counted left to right starting at 1. A mistake resets the module to stage 1.`,
        stages: table.map((row, i) => ({
          title: `Stage ${i + 1}`,
          rules: Object.entries(row).map(([d, ins]) => `If the display shows ${d}, ${instructionText(ins)}.`)
        }))
      };
      return { state, manual, view: view(state) };
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
      const ins = state.table[state.stage - 1][state.current.display];
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
    module.exports = { type: TYPE, name: NAME, generate, action };
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
      words: [
        "ROTOR",
        "EMBER",
        "PYLON",
        "VAULT",
        "COMET",
        "ANVIL",
        "SPARK",
        "RELAY",
        "CIPHER",
        "QUARK",
        "NEXUS",
        "ORBIT",
        "FLINT",
        "GLYPH",
        "WIDOW",
        "ZEPHYR"
      ],
      tableSize: 10,
      baseFrequency: 3.5,
      frequencyStep: 5e-3,
      wordLengthByDifficulty: {
        easy: [5, 5],
        normal: [5, 6],
        hard: [5, 6]
      }
    };
  }
});

// server/modules/morse.js
var require_morse2 = __commonJS({
  "server/modules/morse.js"(exports, module) {
    var data = require_morse();
    var TYPE = "morse";
    var NAME = "Morse Code";
    function generate(ctx) {
      const { rng, difficulty } = ctx;
      const [minLen, maxLen] = data.wordLengthByDifficulty[difficulty];
      const candidates = data.words.filter((w) => w.length >= minLen && w.length <= maxLen);
      const tableWords = rng.sample(candidates.length >= data.tableSize ? candidates : data.words, data.tableSize);
      const word = rng.pick(tableWords);
      const offsets = rng.shuffle(Array.from({ length: data.tableSize * 2 }, (_, i) => i)).slice(0, tableWords.length);
      const entries = tableWords.map((w, i) => ({ word: w, freq: +(data.baseFrequency + offsets[i] * data.frequencyStep).toFixed(3) })).sort((a, b) => a.freq - b.freq);
      const solutionFreq = entries.find((e) => e.word === word).freq;
      const pattern = word.split("").map((ch) => data.alphabet[ch]);
      const state = {
        word,
        solutionFreq,
        frequencies: entries.map((e) => e.freq),
        selected: 0,
        pattern
      };
      const manual = {
        intro: "Decode the flashing signal letter by letter (a long gap separates letters; the word loops with an even longer gap). Find the word in the frequency table, then have the Defuser tune to that frequency and transmit.",
        alphabet: data.alphabet,
        table: entries.map((e) => ({ word: e.word, freq: e.freq.toFixed(3) + " MHz" }))
      };
      return { state, manual, view: view(state) };
    }
    function view(state) {
      return {
        pattern: state.pattern,
        // array of morse strings, one per letter
        frequencies: state.frequencies,
        // dial stops
        selected: state.selected
        // index into frequencies
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
    module.exports = { type: TYPE, name: NAME, generate, action };
  }
});

// data/modules/logicgrid.json
var require_logicgrid = __commonJS({
  "data/modules/logicgrid.json"(exports, module) {
    module.exports = {
      engineers: ["VEGA", "OKAFOR", "REYES", "TANAKA", "MORROW", "IDRIS"],
      panels: ["CRIMSON", "TEAL", "AMBER", "VIOLET"],
      shifts: ["DAWN", "DUSK", "NIGHT", "NOON"],
      entitiesByDifficulty: {
        easy: 3,
        normal: 3,
        hard: 3
      },
      questionsByDifficulty: {
        easy: 1,
        normal: 2,
        hard: 2
      }
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
    function generate(ctx) {
      const { rng, difficulty } = ctx;
      const n = data.entitiesByDifficulty[difficulty];
      const names = rng.sample(data.engineers, n);
      const panels = rng.sample(data.panels, n);
      const shifts = rng.sample(data.shifts, n);
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
      const state = { questions, stage: 0 };
      const manual = {
        intro: `Three engineers each maintain one panel and work one shift (no two share either). Use the clues to reconstruct the full assignment, then answer the question shown on the device.`,
        entities: { engineers: names, panels, shifts },
        clues: rng.shuffle(clues).map((c) => clueText(c, names, panels, shifts))
      };
      return { state, manual, view: view(state) };
    }
    function view(state) {
      const q = state.questions[state.stage];
      return {
        stage: state.stage + 1,
        totalStages: state.questions.length,
        question: q ? q.text : null,
        options: q ? q.options : []
      };
    }
    function action(state, act) {
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
    module.exports = { type: TYPE, name: NAME, generate, action };
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
