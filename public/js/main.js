/**
 * DEFUSE PROTOCOL — solo VR defuser client (static / Quest Browser).
 * Teammates use manual.html on another device; no multiplayer in-app.
 */
import { createDeviceScene } from './three/scene.js';
import { detectXRSupport } from './three/xr.js';
import { sound } from './sound.js';
import { startSoloGame } from './solo/engine.js';

const $ = (id) => document.getElementById(id);
const screens = ['home', 'game', 'end'];

const QUALITY_KEY = 'defuse-protocol.quality';
const DIFF_KEY = 'defuse-protocol.difficulty';
const TIME_KEY = 'defuse-protocol.times';
const STATS_KEY = 'defuse-protocol.stats';
const FLY_KEY = 'defuse-protocol.fly';

const DEFAULT_TIMES = { easy: 8 * 60 * 1000, normal: 10 * 60 * 1000, hard: 12 * 60 * 1000 };
const DEFAULT_STRIKES = { easy: 3, normal: 3, hard: 2 };
const STRIKE_KEY = 'defuse-protocol.strikes';
const STRIKE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const TIME_VER_KEY = 'defuse-protocol.times.v';
const PREV_STOCK_TIMES = { easy: 6 * 60 * 1000, normal: 5 * 60 * 1000, hard: 8 * 60 * 1000 };
const TIME_OPTIONS_MS = [
  60 * 1000, 90 * 1000, 2 * 60 * 1000, 150 * 1000, 3 * 60 * 1000,
  4 * 60 * 1000, 5 * 60 * 1000, 6 * 60 * 1000, 7 * 60 * 1000,
  8 * 60 * 1000, 9 * 60 * 1000, 10 * 60 * 1000, 12 * 60 * 1000, 15 * 60 * 1000
];

const DIFF_COPY = {
  easy: { title: 'EASY', rest: '3 modules' },
  normal: { title: 'MEDIUM', rest: '4 modules · +1 hard' },
  hard: { title: 'HARD', rest: '5 modules · Weapons Release + 1 hard' }
};

const state = {
  game: null,
  scene3d: null,
  session: null,
  lastSecond: null,
  lastSeed: null,
  lastEnterVr: false,
  xrSupported: false
};

function getQuality() {
  const q = localStorage.getItem(QUALITY_KEY) || $('select-quality').value;
  return ['low', 'medium', 'high'].includes(q) ? q : 'medium';
}

function getDifficulty() {
  const d = $('select-difficulty').value;
  return ['easy', 'normal', 'hard'].includes(d) ? d : 'normal';
}

function getSeed() {
  return String($('input-seed').value || '').trim();
}

function setSeedField(seed) {
  $('input-seed').value = seed || '';
  const hint = $('seed-hint');
  if (!hint) return;
  hint.textContent = 'Leave blank for a random bomb. Use a seed to replay the same layout.';
  hint.classList.remove('alert');
}

function returnToMenu() {
  if (state.session) {
    state.session.destroy();
    state.session = null;
  }
  if (state.scene3d?.isXRPresenting()) state.scene3d.exitVR();
  show('home');
}

function persistPrefs() {
  localStorage.setItem(QUALITY_KEY, $('select-quality').value);
  localStorage.setItem(DIFF_KEY, $('select-difficulty').value);
}

function loadPrefs() {
  const q = localStorage.getItem(QUALITY_KEY);
  if (q) $('select-quality').value = q;
  const d = localStorage.getItem(DIFF_KEY);
  if (d) $('select-difficulty').value = d;
}
loadPrefs();
fillTimeSelects();
fillStrikeSelects();
refreshDifficultyLabels();

$('select-quality').addEventListener('change', () => {
  persistPrefs();
  if (state.scene3d) state.scene3d.setQuality(getQuality());
});
$('select-difficulty').addEventListener('change', persistPrefs);

function show(name) {
  screens.forEach((s) => $(`screen-${s}`).classList.toggle('active', s === name));
}

function fmtTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function clampTime(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n)) return null;
  const nearest = TIME_OPTIONS_MS.reduce((best, opt) =>
    Math.abs(opt - n) < Math.abs(best - n) ? opt : best
  );
  return nearest;
}

function loadTimes() {
  try {
    const raw = JSON.parse(localStorage.getItem(TIME_KEY) || '{}');
    const times = {
      easy: clampTime(raw.easy) ?? DEFAULT_TIMES.easy,
      normal: clampTime(raw.normal) ?? DEFAULT_TIMES.normal,
      hard: clampTime(raw.hard) ?? DEFAULT_TIMES.hard
    };
    if (localStorage.getItem(TIME_VER_KEY) !== '3') {
      if (times.easy === PREV_STOCK_TIMES.easy) times.easy = DEFAULT_TIMES.easy;
      if (times.normal === PREV_STOCK_TIMES.normal) times.normal = DEFAULT_TIMES.normal;
      if (times.hard === PREV_STOCK_TIMES.hard) times.hard = DEFAULT_TIMES.hard;
      localStorage.setItem(TIME_VER_KEY, '3');
      saveTimes(times);
    }
    return times;
  } catch {
    return { ...DEFAULT_TIMES };
  }
}

function saveTimes(times) {
  localStorage.setItem(TIME_KEY, JSON.stringify(times));
}

function clampStrikes(n) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return null;
  return Math.min(9, Math.max(1, v));
}

function loadStrikes() {
  try {
    const raw = JSON.parse(localStorage.getItem(STRIKE_KEY) || '{}');
    return {
      easy: clampStrikes(raw.easy) ?? DEFAULT_STRIKES.easy,
      normal: clampStrikes(raw.normal) ?? DEFAULT_STRIKES.normal,
      hard: clampStrikes(raw.hard) ?? DEFAULT_STRIKES.hard
    };
  } catch {
    return { ...DEFAULT_STRIKES };
  }
}

function saveStrikes(strikes) {
  localStorage.setItem(STRIKE_KEY, JSON.stringify(strikes));
}

function fillStrikeSelects() {
  const strikes = loadStrikes();
  for (const key of ['easy', 'normal', 'hard']) {
    const sel = $(`select-strikes-${key}`);
    sel.innerHTML = STRIKE_OPTIONS.map((n) =>
      `<option value="${n}">${n} ${n === 1 ? 'strike' : 'strikes'}</option>`
    ).join('');
    sel.value = String(strikes[key]);
  }
}

function readStrikesFromSelects() {
  return {
    easy: Number($('select-strikes-easy').value),
    normal: Number($('select-strikes-normal').value),
    hard: Number($('select-strikes-hard').value)
  };
}

function strikeLabel(n) {
  return n === 1 ? '1 strike' : `${n} strikes`;
}

function fillTimeSelects() {
  const times = loadTimes();
  for (const key of ['easy', 'normal', 'hard']) {
    const sel = $(`select-time-${key}`);
    sel.innerHTML = TIME_OPTIONS_MS.map((ms) =>
      `<option value="${ms}">${fmtTime(ms)}</option>`
    ).join('');
    sel.value = String(times[key]);
  }
}

function readTimesFromSelects() {
  return {
    easy: Number($('select-time-easy').value),
    normal: Number($('select-time-normal').value),
    hard: Number($('select-time-hard').value)
  };
}

function refreshDifficultyLabels() {
  const times = loadTimes();
  const strikes = loadStrikes();
  for (const opt of $('select-difficulty').options) {
    const copy = DIFF_COPY[opt.value];
    if (!copy) continue;
    opt.textContent = `${copy.title} — ${copy.rest} · ${fmtTime(times[opt.value])} · ${strikeLabel(strikes[opt.value])}`;
  }
}

function openSettings() {
  fillTimeSelects();
  fillStrikeSelects();
  $('select-fly').value = loadFly() ? 'yes' : 'no';
  $('settings-overlay').classList.remove('hidden');
}

function closeSettings() {
  saveTimes(readTimesFromSelects());
  saveStrikes(readStrikesFromSelects());
  saveFly($('select-fly').value === 'yes');
  refreshDifficultyLabels();
  $('settings-overlay').classList.add('hidden');
}

function loadFly() {
  return localStorage.getItem(FLY_KEY) === '1';
}

function saveFly(on) {
  localStorage.setItem(FLY_KEY, on ? '1' : '0');
}

function loadStats() {
  try {
    const s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
    if (!s.gamesPlayed) return;
    $('stats-panel').classList.remove('hidden');
    $('stats-grid').innerHTML = [
      [s.gamesPlayed, 'GAMES'],
      [s.wins, 'WINS'],
      [s.losses, 'LOSSES'],
      [s.totalStrikes, 'STRIKES'],
      [s.modulesSolved, 'DEFUSED'],
      [s.fastestWinMs ? fmtTime(s.fastestWinMs) : '—', 'BEST TIME']
    ].map(([v, l]) => `<div class="stat-cell"><b>${v}</b><span>${l}</span></div>`).join('');
  } catch { /* ignore */ }
}
loadStats();

function recordStats(summary) {
  const s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
  const base = {
    gamesPlayed: 0, wins: 0, losses: 0, totalStrikes: 0,
    modulesSolved: 0, fastestWinMs: null, ...s
  };
  base.gamesPlayed++;
  base.totalStrikes += summary.strikes;
  base.modulesSolved += summary.modulesSolved;
  if (summary.result === 'won') {
    base.wins++;
    if (base.fastestWinMs === null || summary.durationMs < base.fastestWinMs) {
      base.fastestWinMs = summary.durationMs;
    }
  } else {
    base.losses++;
  }
  localStorage.setItem(STATS_KEY, JSON.stringify(base));
  loadStats();
}

detectXRSupport().then(({ supported }) => {
  state.xrSupported = supported;
  const badge = $('xr-status');
  if (badge) {
    badge.textContent = supported
      ? 'WebXR ready — pick difficulty, then START IN VR (HTTPS required).'
      : 'WebXR not detected here — use START ON SCREEN, or Quest Browser over HTTPS.';
  }
  $('btn-start-vr').disabled = !supported;
  if (!supported) $('btn-start-vr').title = 'Requires Meta Quest Browser (or other WebXR) over HTTPS';
});

function ensureScene() {
  if (!state.scene3d) {
    state.scene3d = createDeviceScene($('scene-container'), getQuality());
    state.scene3d.onXRChange = (presenting) => {
      document.body.classList.toggle('xr-presenting', presenting);
      $('btn-enter-vr').textContent = presenting ? 'EXIT VR' : 'ENTER VR';
    };
    state.scene3d.onFlyChange = ({ landed, squashed }) => {
      if (state.session?.game) state.session.game._fly(landed && !squashed);
      if (squashed) sound.squish();
    };
    state.scene3d.onFlyAudio = (args) => sound.flyAudio(args);
    state.scene3d.onFanChange = (on) => sound.fanHum(on);
  } else {
    state.scene3d.setQuality(getQuality());
  }
  return state.scene3d;
}

function startMission({ enterVr = false, seed } = {}) {
  persistPrefs();
  closeSettings();
  $('home-error').textContent = '';

  if (state.session) {
    state.session.destroy();
    state.session = null;
  }

  sound.unlock();
  state.lastEnterVr = !!enterVr;
  const missionSeed = (() => {
    const raw = seed !== undefined ? seed : getSeed();
    return String(raw || '').trim() || undefined;
  })();

  const session = startSoloGame({
    difficulty: getDifficulty(),
    seed: missionSeed,
    timeMs: loadTimes()[getDifficulty()],
    maxStrikes: loadStrikes()[getDifficulty()],
    onTick: ({ remainingMs }) => {
      updateTimer(remainingMs);
      if (state.scene3d) state.scene3d.setTimer(remainingMs);
    },
    onStrike: ({ strikes, maxStrikes }) => {
      sound.strike();
      updateStrikes(strikes, maxStrikes);
      if (state.scene3d) {
        state.scene3d.setStrikes(strikes);
        state.scene3d.strikeFx();
      }
      flashStrike();
    },
    onModuleUpdate: ({ moduleId, view }) => {
      if (state.scene3d) state.scene3d.updateModule(moduleId, view);
    },
    onModuleSolved: ({ moduleId, solvedCount }) => {
      sound.solve();
      if (state.scene3d) state.scene3d.markSolved(moduleId);
      updateSolved(solvedCount, state.game?.modules?.length || 0);
    },
    onGameOver: handleGameOver
  });

  state.session = session;
  state.game = session.payload;
  state.lastSeed = session.payload.seed;
  state.lastSecond = null;

  $('hud-seed').textContent = session.payload.seed;
  updateStrikes(session.payload.strikes, session.payload.maxStrikes);
  updateTimer(session.payload.timeMs);

  const scene = ensureScene();
  scene.startGame(session.payload, (moduleId, action) => {
    sound.click();
    session.handleAction(moduleId, action);
  }, { fly: loadFly() });
  updateSolved(0, session.payload.modules.length);

  show('game');
  $('scene-hint').textContent = enterVr
    ? 'VR · Trigger = interact · Left stick = move · Right stick = snap turn'
    : 'DRAG to orbit · CLICK to interact · ENTER VR when ready · read serial on case front';

  if (enterVr) {
    scene.enterVR().catch((err) => {
      $('home-error').textContent = err.message;
      alert(`Could not start VR:\n${err.message}\n\nUse Meta Quest Browser over HTTPS.`);
    });
  }
}

function flashStrike() {
  const flash = $('strike-flash');
  flash.classList.remove('go');
  void flash.offsetWidth;
  flash.classList.add('go');
}

$('btn-start')?.addEventListener('click', () => startMission({ enterVr: false }));
$('btn-start-vr')?.addEventListener('click', () => startMission({ enterVr: true }));
$('btn-settings')?.addEventListener('click', openSettings);
$('btn-settings-done')?.addEventListener('click', closeSettings);
$('btn-settings-reset')?.addEventListener('click', () => {
  saveTimes({ ...DEFAULT_TIMES });
  saveStrikes({ ...DEFAULT_STRIKES });
  saveFly(false);
  fillTimeSelects();
  fillStrikeSelects();
  $('select-fly').value = 'no';
  refreshDifficultyLabels();
});
$('settings-overlay')?.addEventListener('click', (e) => {
  if (e.target === $('settings-overlay')) closeSettings();
});

$('btn-enter-vr')?.addEventListener('click', async () => {
  sound.unlock();
  const scene = state.scene3d;
  if (!scene) return;
  try {
    if (scene.isXRPresenting()) scene.exitVR();
    else await scene.enterVR();
  } catch (err) {
    alert(`Could not start VR:\n${err.message}`);
  }
});

function updateTimer(ms) {
  const el = $('hud-timer');
  el.textContent = fmtTime(ms);
  const low = ms < 60 * 1000;
  el.classList.toggle('low', low);
  const sec = Math.ceil(ms / 1000);
  if (sec !== state.lastSecond) {
    state.lastSecond = sec;
    if (low && sec > 0) sound.tickLow();
  }
}

function updateStrikes(strikes, max) {
  $('hud-strikes').textContent = '✖'.repeat(strikes) + '·'.repeat(Math.max(0, max - strikes));
}

function updateSolved(done, total) {
  $('hud-solved').textContent = `${done}/${total}`;
}

function handleGameOver(summary) {
  recordStats(summary);
  const won = summary.result === 'won';
  won ? sound.win() : sound.lose();
  state.lastSeed = summary.seed;
  if (state.scene3d) {
    if (state.scene3d.isXRPresenting()) state.scene3d.exitVR();
    state.scene3d.gameOver(won);
  }

  $('end-title').textContent = won ? 'DEVICE DEFUSED' : 'DETONATION';
  $('end-title').className = won ? 'win' : 'loss';
  $('end-reason').textContent = won
    ? `All modules neutralized with ${fmtTime(summary.timeRemainingMs)} to spare.`
    : (summary.reason === 'strikes'
      ? 'Strike limit reached. The device detonated.'
      : 'Timer expired. The device detonated.');

  $('end-summary').innerHTML = [
    [summary.modulesSolved + '/' + summary.modulesTotal, 'MODULES'],
    [summary.strikes, 'STRIKES'],
    [fmtTime(summary.durationMs), 'DURATION'],
    [summary.difficulty.toUpperCase(), 'DIFFICULTY'],
    [summary.seed, 'SEED']
  ].map(([v, l]) => `<div class="stat-cell"><b>${v}</b><span>${l}</span></div>`).join('');

  setTimeout(() => show('end'), won ? 900 : 1400);
}

$('btn-seed-reset')?.addEventListener('click', () => setSeedField(''));

$('btn-restart-bomb')?.addEventListener('click', () => {
  if (!state.lastSeed) return;
  setSeedField(state.lastSeed);
  startMission({ enterVr: state.lastEnterVr, seed: state.lastSeed });
});

$('btn-new-bomb')?.addEventListener('click', () => {
  setSeedField('');
  startMission({ enterVr: state.lastEnterVr, seed: '' });
});

$('btn-back-home')?.addEventListener('click', () => {
  setSeedField('');
  returnToMenu();
});
