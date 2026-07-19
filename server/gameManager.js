/**
 * GAME MANAGER
 * Tracks all active rooms, creates join codes, and routes sockets.
 */
const { Room } = require('./room');

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

class GameManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // code -> Room
  }

  _newCode() {
    let code;
    do {
      code = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(socket, name) {
    const code = this._newCode();
    const room = new Room(this.io, code);
    this.rooms.set(code, room);
    room.addPlayer(socket, name);
    socket.data.roomCode = code;
    return room;
  }

  joinRoom(socket, code, name) {
    const room = this.rooms.get(String(code || '').toUpperCase());
    if (!room) return null;
    room.addPlayer(socket, name);
    socket.data.roomCode = room.code;
    return room;
  }

  roomOf(socket) {
    return this.rooms.get(socket.data.roomCode);
  }

  leave(socket) {
    const room = this.roomOf(socket);
    if (!room) return;
    room.removePlayer(socket.id);
    socket.leave(room.code);
    delete socket.data.roomCode;
    if (room.isEmpty()) {
      room.destroy();
      this.rooms.delete(room.code);
    }
  }
}

module.exports = { GameManager };
