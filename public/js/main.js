/**
 * DEFUSE PROTOCOL — client entry point.
 * Multiplayer via Socket.io when a server is reachable.
 * Solo VR demo runs fully client-side for static HTTPS / Quest Browser.
 */
import { moduleRenderers } from './modules/index.js';
import { createDeviceScene } from './three/scene.js';
import { detectXRSupport } from './three/xr.js';
import { sound } from './sound.js';
import { startSoloGame } from './solo/engine.js';

/* Socket server: same origin by default, or ?server=https://your-host.
   On GitHub Pages with no ?server=, skip Socket.io (use VR SOLO DEMO). */
const params = new URLSearchParams(location.search);
const SERVER_URL = params.get('server') || window.SOCKET_URL || undefined;
const onPages = /\.github\.io$/i.test(location.hostname);
const useSocket = typeof io === 'function' && (!onPages || SERVER_URL);
const socket = useSocket ? io(SERVER_URL, { reconnectionAttempts: onPages ? 3 : Infinity }) : null;

const $ = (id) => document.getElementById(id);
const screens = ['home', 'lobby', 'game', 'end'];

const state = {
  myId: null,
  room: null,
  role: null,
  game: null,
  scene3d: null,
  lastSecond: null,
  solo: null,       // { destroy, handleAction, ... } when in solo mode
  mode: 'multi'     // 'multi' | 'solo'
};

if (socket) {
  socket.on('connect', () => { state.myId = socket.id; });
}

/* ============ video quality ============ */
const QUALITY_KEY = 'defuse-protocol.quality';
function getQuality() {
  const q = localStorage.getItem(QUALITY_KEY);
  return ['low', 'medium', 'high'].includes(q) ? q : 'medium';
}
$('select-quality').value = getQuality();
$('select-quality').addEventListener('change', (e) => {
  localStorage.setItem(QUALITY_KEY, e.target.value);
  if (state.scene3d) state.scene3d.setQuality(e.target.value);
});

/* ============ XR detect ============ */
detectXRSupport().then(({ supported }) => {
  document.querySelectorAll('[data-xr-only]').forEach((el) => {
    el.classList.toggle('hidden', !supported);
  });
  const badge = $('xr-status');
  if (badge) {
    badge.textContent = supported
      ? 'WebXR ready — use ENTER VR after arming as Defuser (HTTPS required).'
      : 'WebXR immersive-vr not detected (desktop OK; Quest Browser over HTTPS for VR).';
  }
});

/* ============ screen helpers ============ */
function show(name) {
  screens.forEach((s) => $(`screen-${s}`).classList.toggle('active', s === name));
}

function fmtTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function ensureScene() {
  if (!state.scene3d) {
    state.scene3d = createDeviceScene($('scene-container'), getQuality());
    state.scene3d.onXRChange = (presenting) => {
      document.body.classList.toggle('xr-presenting', presenting);
      const btn = $('btn-enter-vr');
      if (btn) btn.textContent = presenting ? 'EXIT VR' : 'ENTER VR (QUEST)';
    };
  }
  return state.scene3d;
}

/* ============ home ============ */
async function loadStats() {
  try {
    const base = SERVER_URL || '';
    const res = await fetch(`${base}/api/stats`);
    const s = await res.json();
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
  } catch { /* stats optional on static hosts */ }
}
loadStats();

$('btn-create')?.addEventListener('click', () => {
  if (!socket) {
    $('home-error').textContent = 'No multiplayer server. Use VR SOLO DEMO, or open with ?server=https://your-host';
    return;
  }
  sound.unlock();
  socket.emit('room:create', { name: $('input-name').value }, (res) => {
    if (res.ok) show('lobby');
  });
});

$('btn-join')?.addEventListener('click', joinRoom);
$('input-code')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') joinRoom(); });

function joinRoom() {
  if (!socket) {
    $('home-error').textContent = 'No multiplayer server connected.';
    return;
  }
  sound.unlock();
  socket.emit('room:join', { code: $('input-code').value, name: $('input-name').value }, (res) => {
    if (res.ok) {
      show('lobby');
      $('home-error').textContent = '';
    } else {
      $('home-error').textContent = res.error || 'Could not join.';
    }
  });
}

/* ============ Solo VR demo (static / Quest) ============ */
$('btn-solo-vr')?.addEventListener('click', () => {
  sound.unlock();
  startSoloSession();
});

function startSoloSession() {
  if (state.solo) {
    state.solo.destroy();
    state.solo = null;
  }
  state.mode = 'solo';
  state.role = 'defuser';

  const solo = startSoloGame({
    difficulty: 'easy',
    seed: 'QUEST-DEMO-1',
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
      const flash = $('strike-flash');
      flash.classList.remove('go');
      void flash.offsetWidth;
      flash.classList.add('go');
    },
    onModuleUpdate: ({ moduleId, view }) => {
      if (state.scene3d) state.scene3d.updateModule(moduleId, view);
    },
    onModuleSolved: ({ moduleId, solvedCount }) => {
      sound.solve();
      if (state.scene3d) state.scene3d.markSolved(moduleId);
      const total = state.game?.modules?.length || 0;
      updateSolved(solvedCount, total);
      const tab = document.querySelector(`.manual-tab[data-module-id="${moduleId}"]`);
      if (tab) tab.classList.add('solved-tab');
    },
    onGameOver: (summary) => {
      handleGameOver(summary);
    }
  });

  state.solo = solo;
  state.game = solo.payload;
  beginDefuserGame(solo.payload, (moduleId, action) => {
    sound.click();
    solo.handleAction(moduleId, action);
  });
  // Solo: show manuals too so one person can practice (Experts are separate in multiplayer).
  $('expert-area').classList.remove('hidden');
  buildExpertView(solo.expertPayload.manuals);
}

function beginDefuserGame(payload, send) {
  $('hud-seed').textContent = payload.seed;
  updateStrikes(payload.strikes, payload.maxStrikes);
  updateTimer(payload.timeMs);
  $('defuser-area').classList.remove('hidden');
  $('hud-quality').classList.remove('hidden');
  $('hud-vr').classList.remove('hidden');
  const scene = ensureScene();
  scene.startGame(payload, send);
  updateSolved(payload.modules.filter((m) => m.solved).length, payload.modules.length);
  show('game');
  $('scene-hint').textContent = state.mode === 'solo'
    ? 'SOLO DEMO · manuals on the right · ENTER VR for Quest · Trigger = interact · Left stick = move · Right stick = snap turn'
    : 'DRAG to orbit · CLICK to interact · ENTER VR on Quest · serial is on the front of the case';
}

$('btn-enter-vr')?.addEventListener('click', async () => {
  sound.unlock();
  const scene = state.scene3d;
  if (!scene) {
    $('lobby-error') && ($('lobby-error').textContent = 'Arm the device as Defuser first.');
    return;
  }
  try {
    if (scene.isXRPresenting()) scene.exitVR();
    else await scene.enterVR();
  } catch (err) {
    alert(`Could not start VR:\n${err.message}\n\nUse Meta Quest Browser over HTTPS (not file:// or plain HTTP).`);
  }
});

/* ============ lobby (multiplayer) ============ */
if (socket) {
  socket.on('room:state', (room) => {
    state.room = room;
    const me = room.players.find((p) => p.id === state.myId);
    state.role = me ? me.role : null;

    $('lobby-code').textContent = room.code;
    $('player-list').innerHTML = room.players.map((p) => `
      <li>
        <span>${p.name}${p.isHost ? ' ★' : ''}${p.id === state.myId ? ' (you)' : ''}</span>
        <span class="player-role ${p.role}">${p.role.toUpperCase()}</span>
      </li>`).join('');

    $('btn-role-defuser').classList.toggle('active-role', state.role === 'defuser');
    $('btn-role-expert').classList.toggle('active-role', state.role === 'expert');

    const isHost = me && me.isHost;
    $('host-controls').classList.toggle('hidden', !isHost);
    $('lobby-hint').textContent = isHost
      ? (room.players.length < 2 ? 'Tip: invite at least one Expert — share the room code.' : '')
      : 'Waiting for the host to arm the device…';
  });

  $('btn-role-defuser')?.addEventListener('click', () => socket.emit('room:setRole', { role: 'defuser' }));
  $('btn-role-expert')?.addEventListener('click', () => socket.emit('room:setRole', { role: 'expert' }));

  $('btn-start')?.addEventListener('click', () => {
    sound.unlock();
    socket.emit('game:start', {
      difficulty: $('select-difficulty').value,
      seed: $('input-seed').value
    }, (res) => {
      $('lobby-error').textContent = res && res.error ? res.error : '';
    });
  });

  $('btn-leave')?.addEventListener('click', () => {
    socket.emit('room:leave');
    state.room = null;
    show('home');
    loadStats();
  });

  socket.on('game:started', (payload) => {
    state.mode = 'multi';
    state.game = payload;
    state.role = payload.role;
    state.lastSecond = null;
    $('hud-seed').textContent = payload.seed;
    updateStrikes(payload.strikes, payload.maxStrikes);
    updateTimer(payload.timeMs);

    if (payload.role === 'defuser') {
      beginDefuserGame(payload, (moduleId, action) => {
        sound.click();
        socket.emit('module:action', { moduleId, action });
      });
      $('expert-area').classList.add('hidden');
    } else {
      $('expert-area').classList.remove('hidden');
      $('defuser-area').classList.add('hidden');
      $('hud-quality').classList.add('hidden');
      $('hud-vr').classList.add('hidden');
      buildExpertView(payload.manuals);
      updateSolved(payload.manuals.filter((m) => m.solved).length, payload.manuals.length);
      show('game');
    }
  });

  socket.on('module:update', ({ moduleId, view }) => {
    if (state.scene3d) state.scene3d.updateModule(moduleId, view);
  });

  socket.on('module:solved', ({ moduleId, solvedCount }) => {
    sound.solve();
    if (state.role === 'defuser' && state.scene3d) state.scene3d.markSolved(moduleId);
    const total = state.game
      ? (state.game.modules ? state.game.modules.length : state.game.manuals.length)
      : 0;
    updateSolved(solvedCount, total);
    const tab = document.querySelector(`.manual-tab[data-module-id="${moduleId}"]`);
    if (tab) tab.classList.add('solved-tab');
  });

  socket.on('game:strike', ({ strikes, maxStrikes }) => {
    sound.strike();
    updateStrikes(strikes, maxStrikes);
    if (state.role === 'defuser' && state.scene3d) {
      state.scene3d.setStrikes(strikes);
      state.scene3d.strikeFx();
    }
    const flash = $('strike-flash');
    flash.classList.remove('go');
    void flash.offsetWidth;
    flash.classList.add('go');
  });

  socket.on('game:tick', ({ remainingMs }) => {
    updateTimer(remainingMs);
    if (state.role === 'defuser' && state.scene3d) state.scene3d.setTimer(remainingMs);
  });

  socket.on('game:over', handleGameOver);
  socket.on('game:reset', () => show('lobby'));
  socket.on('disconnect', () => {
    if (state.mode === 'solo') return;
    show('home');
    $('home-error').textContent = 'Disconnected from server.';
  });
} else {
  $('home-error').textContent = 'Static host — multiplayer needs a Node server. Use VR SOLO DEMO for Quest.';
}

/* ---- expert manual ---- */
function buildExpertView(manuals) {
  const tabs = $('manual-tabs');
  const content = $('manual-content');
  tabs.innerHTML = '';

  manuals.forEach((m, i) => {
    const tab = document.createElement('button');
    tab.className = 'manual-tab' + (i === 0 ? ' active' : '') + (m.solved ? ' solved-tab' : '');
    tab.textContent = m.name.toUpperCase();
    tab.dataset.moduleId = m.id;
    tab.addEventListener('click', () => {
      tabs.querySelectorAll('.manual-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      renderManualPage(m, content);
    });
    tabs.appendChild(tab);
  });
  if (manuals.length) renderManualPage(manuals[0], content);
}

function renderManualPage(m, content) {
  content.innerHTML = `<h2>${m.name}</h2>`;
  const page = document.createElement('div');
  content.appendChild(page);
  const renderer = moduleRenderers[m.type];
  if (renderer) renderer.renderManual(page, m.manual);
}

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
  const won = summary.result === 'won';
  won ? sound.win() : sound.lose();
  if (state.role === 'defuser' && state.scene3d) {
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
    [summary.seed, 'SEED']
  ].map(([v, l]) => `<div class="stat-cell"><b>${v}</b><span>${l}</span></div>`).join('');

  setTimeout(() => show('end'), won ? 900 : 1800);
}

$('btn-back-lobby')?.addEventListener('click', () => {
  if (state.solo) {
    state.solo.destroy();
    state.solo = null;
    show('home');
    return;
  }
  show('lobby');
});
