import { createBoard, collides, lock, clearLines, ROWS, COLS } from './board.js';
import {
  PIECE_TYPES,
  PIECES,
  getCells,
  SRS_KICKS,
  SRS_KICKS_I,
} from './pieces.js';
import { computeScore, gravityForLevel, levelForLines } from './scoring.js';

const SPAWN_X = 3;
const SPAWN_Y = 0;
const LOCK_DELAY_MS = 500;

const colorIndex = (type) => PIECE_TYPES.indexOf(type) + 1;

const generateBag = (rng) => {
  const bag = [...PIECE_TYPES];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
};

const refillBag = (bag, rng) => {
  if (bag.length >= 7) return bag;
  return [...bag, ...generateBag(rng)];
};

const spawnPiece = (type, board) => {
  const piece = { type, rot: 0, x: SPAWN_X, y: SPAWN_Y };
  const cells = getCells(type, 0, SPAWN_X, SPAWN_Y);
  if (collides(board, cells)) return null;
  return piece;
};

export const createGame = ({
  mode = 'classic',
  rng = Math.random,
  board: customBoard,
} = {}) => {
  let bag = refillBag(generateBag(rng), rng);
  const firstType = bag.shift();
  bag = refillBag(bag, rng);
  const board = customBoard ?? createBoard();
  const current = spawnPiece(firstType, board);

  return {
    mode,
    board,
    current,
    holdPiece: null,
    holdUsed: false,
    bag,
    rng,
    score: 0,
    lines: 0,
    level: 1,
    combo: -1,
    b2b: false,
    gravity: gravityForLevel(1),
    gravityAcc: 0,
    lockDelay: LOCK_DELAY_MS,
    lockDelayAcc: 0,
    status: current ? 'playing' : 'over',
    elapsedMs: 0,
    lastClear: null,
    sprintGoal: mode === 'sprint' ? 40 : null,
    ultraLimit: mode === 'ultra' ? 180000 : null,
  };
};

export const getNext = (g, n) => {
  const out = [];
  let bag = [...g.bag];
  while (out.length < n) {
    if (bag.length === 0) bag = generateBag(g.rng);
    out.push(bag.shift());
  }
  return out;
};

export const move = (g, dx) => {
  if (g.status !== 'playing' || !g.current) return g;
  const c = g.current;
  const cells = getCells(c.type, c.rot, c.x + dx, c.y);
  if (collides(g.board, cells)) return g;
  return {
    ...g,
    current: { ...c, x: c.x + dx },
    lockDelayAcc: isGrounded({ ...g, current: { ...c, x: c.x + dx } }) ? 0 : g.lockDelayAcc,
  };
};

export const rotate = (g, dir) => {
  if (g.status !== 'playing' || !g.current) return g;
  const c = g.current;
  if (c.type === 'O') return g;
  const newRot = (c.rot + dir + 4) % 4;
  const table = c.type === 'I' ? SRS_KICKS_I : SRS_KICKS;
  const key = `${c.rot}->${newRot}`;
  for (const [dr, dc] of table[key]) {
    const ny = c.y + dr;
    const nx = c.x + dc;
    const cells = getCells(c.type, newRot, nx, ny);
    if (!collides(g.board, cells)) {
      return {
        ...g,
        current: { ...c, rot: newRot, x: nx, y: ny },
        lockDelayAcc: 0,
      };
    }
  }
  return g;
};

export const softDrop = (g) => {
  if (g.status !== 'playing' || !g.current) return g;
  const c = g.current;
  const cells = getCells(c.type, c.rot, c.x, c.y + 1);
  if (collides(g.board, cells)) return g;
  return {
    ...g,
    current: { ...c, y: c.y + 1 },
    score: g.score + 1,
    lockDelayAcc: 0,
  };
};

export const ghostY = (g) => {
  if (!g.current) return 0;
  let y = g.current.y;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const cells = getCells(g.current.type, g.current.rot, g.current.x, y + 1);
    if (collides(g.board, cells)) return y;
    y++;
  }
};

const isGrounded = (g) => {
  if (!g.current) return false;
  const c = g.current;
  const cells = getCells(c.type, c.rot, c.x, c.y + 1);
  return collides(g.board, cells);
};

const lockAndAdvance = (g, hardDropDistance = 0) => {
  const c = g.current;
  const cells = getCells(c.type, c.rot, c.x, c.y);
  let board = lock(g.board, cells, colorIndex(c.type));

  // Detect lock-out: if all locked cells are above the visible board
  const lockOut = cells.every(([r]) => r < 0);

  const { board: cleared, cleared: nLines } = clearLines(board);
  const combo = nLines > 0 ? g.combo + 1 : -1;
  const lines = g.lines + nLines;
  const level = levelForLines(lines);
  const lineScore = computeScore({ lines: nLines, level, combo });
  let score = g.score + hardDropDistance * 2 + lineScore;

  let bag = refillBag([...g.bag], g.rng);
  const nextType = bag.shift();
  bag = refillBag(bag, g.rng);
  const newCurrent = spawnPiece(nextType, cleared);

  let status = g.status;
  if (lockOut || !newCurrent) status = 'over';
  if (g.sprintGoal != null && lines >= g.sprintGoal) status = 'over';

  return {
    ...g,
    board: cleared,
    current: newCurrent,
    bag,
    score,
    lines,
    level,
    combo,
    gravity: gravityForLevel(level),
    gravityAcc: 0,
    lockDelayAcc: 0,
    holdUsed: false,
    status,
    lastClear: nLines > 0 ? { lines: nLines, combo } : g.lastClear,
  };
};

export const hardDrop = (g) => {
  if (g.status !== 'playing' || !g.current) return g;
  const gy = ghostY(g);
  const dy = gy - g.current.y;
  const grounded = { ...g, current: { ...g.current, y: gy } };
  return lockAndAdvance(grounded, dy);
};

export const hold = (g) => {
  if (g.status !== 'playing' || !g.current || g.holdUsed) return g;
  if (g.holdPiece == null) {
    let bag = refillBag([...g.bag], g.rng);
    const nextType = bag.shift();
    bag = refillBag(bag, g.rng);
    const newCurrent = spawnPiece(nextType, g.board);
    return {
      ...g,
      holdPiece: g.current.type,
      current: newCurrent,
      bag,
      holdUsed: true,
      gravityAcc: 0,
      lockDelayAcc: 0,
      status: newCurrent ? g.status : 'over',
    };
  } else {
    const newCurrent = spawnPiece(g.holdPiece, g.board);
    return {
      ...g,
      holdPiece: g.current.type,
      current: newCurrent,
      holdUsed: true,
      gravityAcc: 0,
      lockDelayAcc: 0,
      status: newCurrent ? g.status : 'over',
    };
  }
};

export const tick = (g, dt) => {
  if (g.status !== 'playing' || !g.current) return g;
  let g2 = { ...g, elapsedMs: g.elapsedMs + dt };

  if (g.ultraLimit != null && g2.elapsedMs >= g.ultraLimit) {
    return { ...g2, status: 'over' };
  }

  g2 = { ...g2, gravityAcc: g2.gravityAcc + dt };

  // Apply gravity steps
  let safety = 0;
  while (g2.gravityAcc >= g2.gravity && g2.status === 'playing' && safety++ < 50) {
    g2 = { ...g2, gravityAcc: g2.gravityAcc - g2.gravity };
    const c = g2.current;
    const cells = getCells(c.type, c.rot, c.x, c.y + 1);
    if (collides(g2.board, cells)) {
      g2 = { ...g2, lockDelayAcc: g2.lockDelayAcc + g2.gravity };
      if (g2.lockDelayAcc >= g2.lockDelay) {
        g2 = lockAndAdvance(g2, 0);
      }
    } else {
      g2 = { ...g2, current: { ...c, y: c.y + 1 }, lockDelayAcc: 0 };
    }
  }

  return g2;
};

export const togglePause = (g) => {
  if (g.status === 'playing') return { ...g, status: 'paused' };
  if (g.status === 'paused') return { ...g, status: 'playing' };
  return g;
};

export { COLS, ROWS };
