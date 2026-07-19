/**
 * Solo / offline game runner for static HTTPS hosts (GitHub Pages, Quest Browser).
 * Reuses the same Game + module logic as the Node server via an esbuild bundle.
 */
import gameExports from './game-bundle.js';

const { Game, DIFFICULTY } = gameExports;

const noopLog = { log() {} };

/**
 * Start a local authoritative game (no Socket.io).
 * @returns {{ game, payload, handleAction, destroy }}
 */
export function startSoloGame({
  difficulty = 'easy',
  seed = 'QUEST-DEMO-1',
  onTick,
  onStrike,
  onModuleUpdate,
  onModuleSolved,
  onGameOver
} = {}) {
  const game = new Game({
    difficulty,
    seed,
    logger: noopLog,
    events: {
      onTick: onTick || (() => {}),
      onStrike: onStrike || (() => {}),
      onModuleUpdate: onModuleUpdate || (() => {}),
      onModuleSolved: onModuleSolved || (() => {}),
      onGameOver: onGameOver || (() => {})
    }
  });

  return {
    game,
    payload: game.defuserPayload(),
    expertPayload: game.expertPayload(),
    handleAction(moduleId, action) {
      game.handleAction(moduleId, action, 'VR-Solo');
    },
    destroy() {
      game.destroy();
    },
    DIFFICULTY
  };
}

export { DIFFICULTY };
