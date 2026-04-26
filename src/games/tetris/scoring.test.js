import { describe, it, expect } from 'vitest';
import { computeScore, gravityForLevel, levelForLines } from './scoring.js';

describe('scoring', () => {
  it('1 line single = 100 * level', () => {
    expect(computeScore({ lines: 1, level: 1 })).toBe(100);
    expect(computeScore({ lines: 1, level: 5 })).toBe(500);
  });

  it('2 line double = 300 * level', () => {
    expect(computeScore({ lines: 2, level: 1 })).toBe(300);
  });

  it('3 line triple = 500 * level', () => {
    expect(computeScore({ lines: 3, level: 1 })).toBe(500);
  });

  it('4 line tetris = 800 * level', () => {
    expect(computeScore({ lines: 4, level: 1 })).toBe(800);
    expect(computeScore({ lines: 4, level: 10 })).toBe(8000);
  });

  it('T-spin single beats normal single', () => {
    const tss = computeScore({ lines: 1, level: 1, isTSpin: true });
    const single = computeScore({ lines: 1, level: 1 });
    expect(tss).toBeGreaterThan(single);
  });

  it('combo bonus increases with combo count', () => {
    const noCombo = computeScore({ lines: 1, level: 1, combo: 0 });
    const c2 = computeScore({ lines: 1, level: 1, combo: 2 });
    expect(c2).toBeGreaterThan(noCombo);
  });

  it('zero lines = zero score', () => {
    expect(computeScore({ lines: 0, level: 5 })).toBe(0);
  });
});

describe('level/gravity', () => {
  it('level 1 starts at 0 lines', () => {
    expect(levelForLines(0)).toBe(1);
  });

  it('level increments every 10 lines', () => {
    expect(levelForLines(10)).toBe(2);
    expect(levelForLines(99)).toBe(10);
    expect(levelForLines(140)).toBe(15);
  });

  it('level caps at 15', () => {
    expect(levelForLines(99999)).toBe(15);
  });

  it('gravity decreases (faster) as level rises', () => {
    expect(gravityForLevel(2)).toBeLessThan(gravityForLevel(1));
    expect(gravityForLevel(15)).toBeLessThan(gravityForLevel(10));
  });

  it('gravity at level 1 is around 1000ms per cell', () => {
    expect(gravityForLevel(1)).toBeGreaterThan(800);
    expect(gravityForLevel(1)).toBeLessThan(1200);
  });

  it('gravity at level 15 is very fast', () => {
    expect(gravityForLevel(15)).toBeLessThan(50);
  });
});
