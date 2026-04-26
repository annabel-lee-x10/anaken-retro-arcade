// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import App from './App.jsx';
import { tetrisAudio } from './games/tetris/audio.js';

// jsdom doesn't ship requestAnimationFrame timing fidelity needed for the
// game loop, so we just verify navigation state machine — not gameplay.

beforeEach(() => {
  // Fresh localStorage so skin/mute defaults are predictable.
  window.localStorage.clear();
  // Wipe any leaked dispatch global from previous render.
  window.__arcadeDispatch = null;
});

afterEach(cleanup);

// Picker-aware helper: with 2+ games registered, App boots into the Picker.
// Click TETRIS first, then the requested mode. Returns nothing.
const pickTetrisMode = (mode = 'CLASSIC') => {
  if (screen.queryByText('SELECT GAME')) {
    fireEvent.click(screen.getByLabelText(/Play TETRIS/i));
  }
  fireEvent.click(screen.getByText(mode));
};

const pickSnakeMode = (mode = 'CLASSIC') => {
  if (screen.queryByText('SELECT GAME')) {
    fireEvent.click(screen.getByLabelText(/Play SNAKE/i));
  }
  fireEvent.click(screen.getByText(mode));
};

describe('App boot flow', () => {
  it('boots to the Game Picker when 2+ games are registered', () => {
    render(<App />);
    expect(screen.getByText('SELECT GAME')).toBeTruthy();
    expect(screen.getByLabelText(/Play TETRIS/i)).toBeTruthy();
    expect(screen.getByLabelText(/Play SNAKE/i)).toBeTruthy();
  });

  it('picking TETRIS shows its mode select with Tetris-specific modes', () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText(/Play TETRIS/i));
    expect(screen.getByText('SELECT MODE')).toBeTruthy();
    expect(screen.getByText('CLASSIC')).toBeTruthy();
    expect(screen.getByText('SPRINT')).toBeTruthy();
    expect(screen.getByText('ULTRA')).toBeTruthy();
    expect(screen.getByText('ZEN')).toBeTruthy();
  });

  it('picking SNAKE shows its mode select with Snake-specific modes', () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText(/Play SNAKE/i));
    expect(screen.getByText('SELECT MODE')).toBeTruthy();
    expect(screen.getByText('CLASSIC')).toBeTruthy();
    expect(screen.getByText('WRAPAROUND')).toBeTruthy();
    // Tetris-only modes should be absent
    expect(screen.queryByText('SPRINT')).toBeNull();
    expect(screen.queryByText('ULTRA')).toBeNull();
    expect(screen.queryByText('ZEN')).toBeNull();
  });

  it('picking a Tetris mode renders the Tetris play screen', () => {
    render(<App />);
    pickTetrisMode('CLASSIC');
    expect(screen.getByText('SCORE')).toBeTruthy();
  });

  it('picking a Snake mode renders the Snake play screen', () => {
    render(<App />);
    pickSnakeMode('CLASSIC');
    // Snake HUD shows SCORE and BEST
    expect(screen.getByText('SCORE')).toBeTruthy();
    expect(screen.getByText('BEST')).toBeTruthy();
  });
});

describe('App pause menu (Escape key)', () => {
  it('Escape opens the pause menu while playing', () => {
    render(<App />);
    pickTetrisMode('CLASSIC');
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('button', { name: /resume/i })).toBeTruthy();
  });

  it('Escape again closes the pause menu', () => {
    render(<App />);
    pickTetrisMode('CLASSIC');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Resume button closes the menu', () => {
    render(<App />);
    pickTetrisMode('CLASSIC');
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: /resume/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Change Mode returns to Mode Select', () => {
    render(<App />);
    pickTetrisMode('CLASSIC');
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: /change mode/i }));
    expect(screen.getByText('SELECT MODE')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Quit returns to Game Picker when 2+ games are registered', () => {
    render(<App />);
    pickTetrisMode('CLASSIC');
    fireEvent.keyDown(window, { key: 'Escape' });
    // Label flips to "Quit to Game Picker" with multiple games
    fireEvent.click(screen.getByRole('button', { name: /quit to game picker/i }));
    expect(screen.getByText('SELECT GAME')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Mute option in the menu toggles label between Mute and Unmute', () => {
    render(<App />);
    pickTetrisMode('CLASSIC');
    fireEvent.keyDown(window, { key: 'Escape' });
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Mute' })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mute' }));
    expect(within(dialog).getByRole('button', { name: 'Unmute' })).toBeTruthy();
  });

  it('Restart keeps player in the game and closes the menu', () => {
    render(<App />);
    pickTetrisMode('CLASSIC');
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: /restart/i }));
    expect(screen.getByText('SCORE')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Escape on the Game Picker does nothing (no menu, no crash)', () => {
    render(<App />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('SELECT GAME')).toBeTruthy();
  });

  it('Escape on the Snake game also opens the pause menu', () => {
    render(<App />);
    pickSnakeMode('CLASSIC');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});

describe('Audio: Tetris music starts on first game start', () => {
  let startSpy;
  let stopSpy;
  beforeEach(() => {
    startSpy = vi.spyOn(tetrisAudio, 'startMusic').mockImplementation(() => {});
    stopSpy = vi.spyOn(tetrisAudio, 'stopMusic').mockImplementation(() => {});
  });
  afterEach(() => {
    startSpy.mockRestore();
    stopSpy.mockRestore();
  });

  it('startMusic is called when picking a Tetris mode', () => {
    render(<App />);
    expect(startSpy).not.toHaveBeenCalled();
    pickTetrisMode('CLASSIC');
    expect(startSpy).toHaveBeenCalled();
  });

  it('startMusic fires for every Tetris mode (not classic-only)', () => {
    for (const label of ['SPRINT', 'ULTRA', 'ZEN']) {
      startSpy.mockClear();
      render(<App />);
      pickTetrisMode(label);
      expect(startSpy, `mode ${label}`).toHaveBeenCalled();
      cleanup();
    }
  });
});

describe('Controls: Tetris face button mapping', () => {
  const wrapDispatchSpy = () => {
    const realDispatch = window.__arcadeDispatch;
    const spy = vi.fn(realDispatch);
    window.__arcadeDispatch = spy;
    return spy;
  };

  beforeEach(() => {
    vi.spyOn(tetrisAudio, 'startMusic').mockImplementation(() => {});
    vi.spyOn(tetrisAudio, 'stopMusic').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('A face button dispatches ROTATE clockwise', () => {
    render(<App />);
    pickTetrisMode('CLASSIC');
    const spy = wrapDispatchSpy();
    fireEvent.pointerDown(screen.getByLabelText('A'));
    expect(spy).toHaveBeenCalledWith({ type: 'ROTATE', dir: 1 });
  });

  it('B face button dispatches HARD drop (not counter-rotate)', () => {
    render(<App />);
    pickTetrisMode('CLASSIC');
    const spy = wrapDispatchSpy();
    fireEvent.pointerDown(screen.getByLabelText('B'));
    expect(spy).toHaveBeenCalledWith({ type: 'HARD' });
    expect(spy).not.toHaveBeenCalledWith({ type: 'ROTATE', dir: -1 });
  });

  it('Y face button dispatches HOLD', () => {
    render(<App />);
    pickTetrisMode('CLASSIC');
    const spy = wrapDispatchSpy();
    fireEvent.pointerDown(screen.getByLabelText('Y'));
    expect(spy).toHaveBeenCalledWith({ type: 'HOLD' });
  });

  it('keyboard Z still rotates counter-clockwise', () => {
    let attempts = 0;
    while (attempts++ < 10) {
      render(<App />);
      pickTetrisMode('CLASSIC');
      if (window.__arcadeState?.current?.type !== 'O') break;
      cleanup();
    }
    const before = window.__arcadeState.current.rot;
    fireEvent.keyDown(window, { key: 'z' });
    const after = window.__arcadeState.current.rot;
    expect(after).toBe((before + 3) % 4); // CCW
  });
});

describe('Controls: Snake d-pad mapping', () => {
  const wrapDispatchSpy = () => {
    const realDispatch = window.__arcadeDispatch;
    const spy = vi.fn(realDispatch);
    window.__arcadeDispatch = spy;
    return spy;
  };

  it('D-pad up dispatches DIR up (not Tetris HARD drop)', () => {
    render(<App />);
    pickSnakeMode('CLASSIC');
    const spy = wrapDispatchSpy();
    fireEvent.pointerDown(screen.getByLabelText('Up'));
    expect(spy).toHaveBeenCalledWith({ type: 'DIR', dir: 'up' });
    expect(spy).not.toHaveBeenCalledWith({ type: 'HARD' });
  });

  it('D-pad left/right/down all dispatch DIR with matching direction', () => {
    render(<App />);
    pickSnakeMode('CLASSIC');
    const spy = wrapDispatchSpy();
    fireEvent.pointerDown(screen.getByLabelText('Left'));
    fireEvent.pointerDown(screen.getByLabelText('Right'));
    fireEvent.pointerDown(screen.getByLabelText('Down'));
    expect(spy).toHaveBeenCalledWith({ type: 'DIR', dir: 'left' });
    expect(spy).toHaveBeenCalledWith({ type: 'DIR', dir: 'right' });
    expect(spy).toHaveBeenCalledWith({ type: 'DIR', dir: 'down' });
  });
});
