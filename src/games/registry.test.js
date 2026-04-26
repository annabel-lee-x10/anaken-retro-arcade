import { describe, it, expect } from 'vitest';
import { GAMES, shouldShowPicker, getDefaultGame, getGameById } from './registry.js';

describe('games registry', () => {
  it('GAMES is a non-empty array', () => {
    expect(Array.isArray(GAMES)).toBe(true);
    expect(GAMES.length).toBeGreaterThan(0);
  });

  it('every game has the required shape', () => {
    for (const g of GAMES) {
      expect(typeof g.id).toBe('string');
      expect(g.id.length).toBeGreaterThan(0);
      expect(typeof g.name).toBe('string');
      expect(typeof g.description).toBe('string');
      expect(typeof g.icon).toBe('string');
    }
  });

  it('game ids are unique', () => {
    const ids = GAMES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tetris is registered', () => {
    expect(GAMES.find((g) => g.id === 'tetris')).toBeTruthy();
  });
});

describe('shouldShowPicker', () => {
  it('returns false when only 1 game is registered', () => {
    expect(shouldShowPicker([{ id: 'a', name: 'A', description: '', icon: '' }])).toBe(false);
  });

  it('returns true when 2+ games are registered', () => {
    expect(
      shouldShowPicker([
        { id: 'a', name: 'A', description: '', icon: '' },
        { id: 'b', name: 'B', description: '', icon: '' },
      ])
    ).toBe(true);
  });

  it('returns false when registry is empty', () => {
    expect(shouldShowPicker([])).toBe(false);
  });
});

describe('getDefaultGame', () => {
  it('returns the first game in the registry', () => {
    const games = [
      { id: 'a', name: 'A', description: '', icon: '' },
      { id: 'b', name: 'B', description: '', icon: '' },
    ];
    expect(getDefaultGame(games).id).toBe('a');
  });

  it('returns null on an empty registry', () => {
    expect(getDefaultGame([])).toBeNull();
  });
});

describe('getGameById', () => {
  it('finds a game by id', () => {
    const games = [{ id: 'tetris', name: 'TETRIS', description: '', icon: '' }];
    expect(getGameById(games, 'tetris').name).toBe('TETRIS');
  });

  it('returns null for unknown id', () => {
    expect(getGameById([{ id: 'tetris', name: 'TETRIS', description: '', icon: '' }], 'pong')).toBeNull();
  });
});
