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
const STATS_KEY = 'defuse-protocol.stats';

const state = {
  game: null,
  scene3d: null,
  session: null,
  lastSecond: null,
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
  } else {
    state.scene3d.setQuality(getQuality());
  }
  return state.scene3d;
}

function startMission({ enterVr = false } = {}) {
  persistPrefs();
  $('home-error').textContent = '';

  if (state.session) {
    state.session.destroy();
    state.session = null;
  }

  sound.unlock();

  const session = startSoloGame({
    difficulty: getDifficulty(),
    seed: getSeed() || undefined,
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
  state.lastSecond = null;

  $('hud-seed').textContent = session.payload.seed;
  updateStrikes(session.payload.strikes, session.payload.maxStrikes);
  updateTimer(session.payload.timeMs);

  const scene = ensureScene();
  scene.startGame(session.payload, (moduleId, action) => {
    sound.click();
    session.handleAction(moduleId, action);
  });
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
  if (state.scene3d) {
    if (state.scene3d.isXRPresenting()) state.scene3d.exitVR();
    state.scene3d.gameOver(won);
  }

  $('end-title').textContent = won ? 'DEVICE DEFUSED' : 'DETONATION';
  $('end-title').className = won ? 'win' : 'loss';
  $('end-reason').textContent = won
    ? `All modules neutralized with ${fmtTime(summary.timeRemainingMs)} to spare.`
    : summary.reason === 'timer' ? 'The timer reached zero.' : 'Too many strikes.';

  $('end-summary').innerHTML = [
    [summary.modulesSolved + '/' + summary.modulesTotal, 'MODULES'],
    [summary.strikes, 'STRIKES'],
    [fmtTime(summary.durationMs), 'DURATION'],
    [summary.difficulty.toUpperCase(), 'DIFFICULTY'],
    [summary.seed, 'SEED']
  ].map(([v, l]) => `<div class="stat-cell"><b>${v}</b><span>${l}</span></div>`).join('');

  setTimeout(() => show('end'), won ? 900 : 1800);
}

$('btn-back-home')?.addEventListener('click', () => {
  if (state.session) {
    state.session.destroy();
    state.session = null;
  }
  if (state.scene3d?.isXRPresenting()) state.scene3d.exitVR();
  show('home');
});
