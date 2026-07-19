/**
 * DEFUSE PROTOCOL — server entry point.
 * Express serves the static client + a small REST API;
 * Socket.io carries all real-time game traffic.
 */
const path = require('path');
const net = require('net');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const { GameManager } = require('./gameManager');
const stats = require('./stats');
const { allTypes } = require('./modules');
const { DIFFICULTY } = require('./game');

const PORT = process.env.PORT || 3210;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------- REST API ----------
app.get('/api/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));
app.get('/api/stats', (_req, res) => res.json(stats.load()));
app.get('/api/modules', (_req, res) => res.json(allTypes()));
app.get('/api/difficulties', (_req, res) =>
  res.json(Object.entries(DIFFICULTY).map(([key, cfg]) => ({ key, ...cfg })))
);

// ---------- WebSocket events ----------
const manager = new GameManager(io);

io.on('connection', (socket) => {
  socket.on('room:create', ({ name } = {}, ack) => {
    const room = manager.createRoom(socket, sanitize(name));
    if (typeof ack === 'function') ack({ ok: true, code: room.code });
  });

  socket.on('room:join', ({ code, name } = {}, ack) => {
    const room = manager.joinRoom(socket, code, sanitize(name));
    if (!room) {
      if (typeof ack === 'function') ack({ ok: false, error: 'Room not found.' });
      return;
    }
    if (typeof ack === 'function') ack({ ok: true, code: room.code });
    // Late joiners during a running game get the Expert payload immediately.
    if (room.game && room.game.status === 'running') {
      socket.emit('game:started', room.game.expertPayload());
    }
  });

  socket.on('room:setRole', ({ role } = {}) => {
    const room = manager.roomOf(socket);
    if (room) room.setRole(socket.id, role);
  });

  socket.on('room:leave', () => manager.leave(socket));

  socket.on('game:start', ({ difficulty, seed } = {}, ack) => {
    const room = manager.roomOf(socket);
    if (!room) return;
    const result = room.startGame({ difficulty, seed }, socket.id);
    if (typeof ack === 'function') ack(result);
  });

  socket.on('module:action', ({ moduleId, action } = {}) => {
    const room = manager.roomOf(socket);
    if (room) room.handleAction(socket.id, moduleId, action);
  });

  socket.on('game:end', () => {
    const room = manager.roomOf(socket);
    if (room) room.endGame(socket.id);
  });

  socket.on('disconnect', () => manager.leave(socket));
});

function sanitize(name) {
  return String(name || '').replace(/[<>]/g, '').trim().slice(0, 20) || 'Agent';
}

/** Pick the first free port at or above `start` (avoids clashing with other apps on 3000). */
function findFreePort(start, attemptsLeft = 10) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', (err) => {
      if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
        resolve(findFreePort(start + 1, attemptsLeft - 1));
        return;
      }
      reject(err);
    });
    probe.once('listening', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
    probe.listen(start);
  });
}

findFreePort(Number(PORT)).then((port) => {
  server.listen(port, () => {
    console.log(`DEFUSE PROTOCOL running at http://localhost:${port}`);
    if (port !== Number(PORT)) {
      console.log(`(Port ${PORT} was busy — open the URL above, not :${PORT}.)`);
    }
  });
}).catch((err) => {
  console.error('Could not find a free port:', err.message);
  process.exit(1);
});
