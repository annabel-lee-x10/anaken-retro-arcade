import { describe, it, expect } from 'vitest';
import {
  createBoard,
  isInside,
  collides,
  lock,
  clearLines,
  ROWS,
  COLS,
} from './board.js';

describe('board', () => {
  it('createBoard returns a 20x10 grid of zeros', () => {
    const b = createBoard();
    expect(b.length).toBe(ROWS);
    expect(b[0].length).toBe(COLS);
    expect(b.every((r) => r.every((c) => c === 0))).toBe(true);
  });

  it('isInside accepts in-range cells', () => {
    expect(isInside(0, 0)).toBe(true);
    expect(isInside(ROWS - 1, COLS - 1)).toBe(true);
  });

  it('isInside rejects out-of-range cells', () => {
    expect(isInside(-1, 0)).toBe(false);
    expect(isInside(0, -1)).toBe(false);
    expect(isInside(0, COLS)).toBe(false);
    expect(isInside(ROWS, 0)).toBe(false);
  });

  it('collides detects overlap with filled cells', () => {
    const b = createBoard();
    b[19][4] = 1;
    expect(collides(b, [[19, 4]])).toBe(true);
    expect(collides(b, [[18, 4]])).toBe(false);
  });

  it('collides detects floor', () => {
    const b = createBoard();
    expect(collides(b, [[20, 4]])).toBe(true);
  });

  it('collides detects walls', () => {
    const b = createBoard();
    expect(collides(b, [[5, -1]])).toBe(true);
    expect(collides(b, [[5, 10]])).toBe(true);
  });

  it('lock writes piece cells onto board', () => {
    const b = createBoard();
    const out = lock(b, [[19, 0], [19, 1]], 3);
    expect(out[19][0]).toBe(3);
    expect(out[19][1]).toBe(3);
    expect(b[19][0]).toBe(0); // pure: original board untouched
  });

  it('clearLines removes full rows and returns count', () => {
    const b = createBoard();
    for (let c = 0; c < COLS; c++) b[19][c] = 1;
    const { board: out, cleared } = clearLines(b);
    expect(cleared).toBe(1);
    expect(out[19].every((c) => c === 0)).toBe(true);
    // top row now zero (everything shifted)
    expect(out[0].every((c) => c === 0)).toBe(true);
  });

  it('clearLines handles 4 simultaneous (Tetris)', () => {
    const b = createBoard();
    for (let r = 16; r < 20; r++) for (let c = 0; c < COLS; c++) b[r][c] = 2;
    const { cleared } = clearLines(b);
    expect(cleared).toBe(4);
  });

  it('clearLines preserves partial rows above', () => {
    const b = createBoard();
    b[18][0] = 1;
    for (let c = 0; c < COLS; c++) b[19][c] = 1;
    const { board: out, cleared } = clearLines(b);
    expect(cleared).toBe(1);
    expect(out[19][0]).toBe(1);
    expect(out[19].slice(1).every((c) => c === 0)).toBe(true);
  });
});
