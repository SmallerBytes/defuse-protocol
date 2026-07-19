/**
 * ROOM
 * A lobby of players (one Defuser + any number of Experts) plus, while a
 * round is in flight, its Game instance. All socket emission happens here.
 */
const { Game } = require('./game');
const { SessionLogger } = require('./logger');
const stats = require('./stats');

class Room {
  constructor(io, code) {
    this.io = io;
    this.code = code;
    this.players = new Map(); // socketId -> { id, name, role }
    this.hostId = null;
    this.game = null;
    this.logger = new SessionLogger(code);
  }

  addPlayer(socket, name) {
    const isFirst = this.players.size === 0;
    const role = isFirst ? 'defuser' : 'expert';
    this.players.set(socket.id, { id: socket.id, name: name || 'Agent', role });
    if (isFirst) this.hostId = socket.id;
    socket.join(this.code);
    this.logger.log('player:join', { id: socket.id, name, role });
    this.broadcastState();
  }

  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (!player) return;
    this.players.delete(socketId);
    this.logger.log('player:leave', { id: socketId, name: player.name });
    if (this.hostId === socketId && this.players.size > 0) {
      this.hostId = this.players.keys().next().value;
    }
    // Promote someone to defuser if the defuser left.
    if (player.role === 'defuser' && this.players.size > 0 && !this.defuser()) {
      this.players.values().next().value.role = 'defuser';
    }
    this.broadcastState();
  }

  defuser() {
    return [...this.players.values()].find((p) => p.role === 'defuser');
  }

  setRole(socketId, role) {
    if (this.game && this.game.status === 'running') return; // no mid-game swaps
    const player = this.players.get(socketId);
    if (!player || !['defuser', 'expert'].includes(role)) return;
    if (role === 'defuser') {
      const current = this.defuser();
      if (current && current.id !== socketId) current.role = 'expert';
    }
    player.role = role;
    this.broadcastState();
  }

  broadcastState() {
    this.io.to(this.code).emit('room:state', {
      code: this.code,
      hostId: this.hostId,
      inGame: !!this.game && this.game.status === 'running',
      players: [...this.players.values()].map((p) => ({
        id: p.id, name: p.name, role: p.role, isHost: p.id === this.hostId
      }))
    });
  }

  startGame({ difficulty, seed }, requesterId) {
    if (requesterId !== this.hostId) return { error: 'Only the host can start the game.' };
    if (this.game && this.game.status === 'running') return { error: 'A game is already running.' };
    if (!this.defuser()) return { error: 'A Defuser must be assigned before starting.' };

    this.game = new Game({
      difficulty,
      seed,
      logger: this.logger,
      events: {
        onTick: (t) => this.io.to(this.code).emit('game:tick', t),
        onStrike: (s) => this.io.to(this.code).emit('game:strike', s),
        onModuleUpdate: (u) => this.emitToDefusers('module:update', u),
        onModuleSolved: (m) => this.io.to(this.code).emit('module:solved', m),
        onGameOver: (summary) => {
          const allStats = stats.recordGame({
            won: summary.result === 'won',
            difficulty: summary.difficulty,
            seed: summary.seed,
            strikes: summary.strikes,
            modulesSolved: summary.modulesSolved,
            durationMs: summary.durationMs,
            timeRemainingMs: summary.timeRemainingMs
          });
          this.io.to(this.code).emit('game:over', { ...summary, stats: allStats });
        }
      }
    });

    // Role-specific payloads: Defuser sees the device, Experts see manuals.
    for (const [sid, player] of this.players) {
      const payload = player.role === 'defuser' ? this.game.defuserPayload() : this.game.expertPayload();
      this.io.to(sid).emit('game:started', payload);
    }
    return { ok: true };
  }

  handleAction(socketId, moduleId, action) {
    const player = this.players.get(socketId);
    if (!player || player.role !== 'defuser') return; // Experts can't touch the device
    if (!this.game) return;
    this.game.handleAction(moduleId, action, player.name);
  }

  emitToDefusers(event, payload) {
    for (const [sid, player] of this.players) {
      if (player.role === 'defuser') this.io.to(sid).emit(event, payload);
    }
  }

  endGame(requesterId) {
    if (requesterId !== this.hostId || !this.game) return;
    this.game.destroy();
    this.game = null;
    this.logger.log('game:abandoned', {});
    this.broadcastState();
    this.io.to(this.code).emit('game:reset');
  }

  isEmpty() {
    return this.players.size === 0;
  }

  destroy() {
    if (this.game) this.game.destroy();
  }
}

module.exports = { Room };
