import { describe, it, expect } from 'vitest';
import { PIECES, getCells, getColor, PIECE_TYPES, SRS_KICKS, SRS_KICKS_I } from './pieces.js';

describe('tetromino definitions', () => {
  it('defines all 7 standard tetrominoes', () => {
    expect(PIECE_TYPES).toEqual(['I', 'O', 'T', 'S', 'Z', 'J', 'L']);
  });

  it('every piece has 4 rotation states', () => {
    for (const type of PIECE_TYPES) {
      expect(PIECES[type].rotations.length).toBe(4);
    }
  });

  it('every piece has 4 cells per rotation', () => {
    for (const type of PIECE_TYPES) {
      for (const rot of PIECES[type].rotations) {
        expect(rot.length).toBe(4);
      }
    }
  });

  it('each piece has a distinct color', () => {
    const colors = PIECE_TYPES.map(getColor);
    expect(new Set(colors).size).toBe(7);
  });

  it('I piece spawn rotation is horizontal at row 1', () => {
    const cells = getCells('I', 0, 3, 0);
    // SRS I-piece spawn: row 1, columns 3-6
    expect(cells.sort()).toEqual([[1, 3], [1, 4], [1, 5], [1, 6]].sort());
  });

  it('O piece spawn occupies a 2x2 block at columns 4-5', () => {
    const cells = getCells('O', 0, 3, 0);
    // O-piece SRS spawn cells: rows 0-1, cols 4-5
    const sorted = cells.map((c) => c.join(',')).sort();
    expect(sorted).toEqual(['0,4', '0,5', '1,4', '1,5']);
  });

  it('rotating O piece does not change its cells', () => {
    const r0 = getCells('O', 0, 3, 0).map((c) => c.join(',')).sort();
    const r1 = getCells('O', 1, 3, 0).map((c) => c.join(',')).sort();
    expect(r1).toEqual(r0);
  });
});

describe('SRS wall kick tables', () => {
  it('JLSTZ table has entries for all 8 transitions', () => {
    expect(Object.keys(SRS_KICKS).length).toBe(8);
  });

  it('I table has entries for all 8 transitions', () => {
    expect(Object.keys(SRS_KICKS_I).length).toBe(8);
  });

  it('JLSTZ 0->R first kick is (0,0)', () => {
    expect(SRS_KICKS['0->1'][0]).toEqual([0, 0]);
  });
});
