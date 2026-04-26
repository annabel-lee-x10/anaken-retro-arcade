// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import App from './App.jsx';

// jsdom doesn't ship requestAnimationFrame timing fidelity needed for the
// game loop, so we just verify navigation state machine — not gameplay.

beforeEach(() => {
  // Fresh localStorage so skin/mute defaults are predictable.
  window.localStorage.clear();
  // Wipe any leaked dispatch global from previous render.
  window.__arcadeDispatch = null;
});

afterEach(cleanup);

describe('App boot flow (1 game registered)', () => {
  it('skips Game Picker and boots directly to Mode Select', () => {
    render(<App />);
    expect(screen.getByText('SELECT MODE')).toBeTruthy();
    // Game Picker title should NOT appear in single-game state
    expect(screen.queryByText('SELECT GAME')).toBeNull();
  });

  it('picking a mode renders the Tetris play screen', () => {
    render(<App />);
    fireEvent.click(screen.getByText('CLASSIC'));
    // Tetris HUD shows SCORE label
    expect(screen.getByText('SCORE')).toBeTruthy();
  });
});

describe('App pause menu (Escape key)', () => {
  it('Escape opens the pause menu while playing', () => {
    render(<App />);
    fireEvent.click(screen.getByText('CLASSIC'));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('button', { name: /resume/i })).toBeTruthy();
  });

  it('Escape again closes the pause menu', () => {
    render(<App />);
    fireEvent.click(screen.getByText('CLASSIC'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Resume button closes the menu', () => {
    render(<App />);
    fireEvent.click(screen.getByText('CLASSIC'));
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: /resume/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Change Mode returns to Mode Select', () => {
    render(<App />);
    fireEvent.click(screen.getByText('CLASSIC'));
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: /change mode/i }));
    expect(screen.getByText('SELECT MODE')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Quit returns to Mode Select when only 1 game is registered', () => {
    render(<App />);
    fireEvent.click(screen.getByText('CLASSIC'));
    fireEvent.keyDown(window, { key: 'Escape' });
    // Label is "Quit Game" in single-game state
    fireEvent.click(screen.getByRole('button', { name: /quit/i }));
    expect(screen.getByText('SELECT MODE')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Mute option in the menu toggles label between Mute and Unmute', () => {
    render(<App />);
    fireEvent.click(screen.getByText('CLASSIC'));
    fireEvent.keyDown(window, { key: 'Escape' });
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Mute' })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mute' }));
    expect(within(dialog).getByRole('button', { name: 'Unmute' })).toBeTruthy();
  });

  it('Restart keeps player in the game and closes the menu', () => {
    render(<App />);
    fireEvent.click(screen.getByText('CLASSIC'));
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: /restart/i }));
    // Still on the game screen (HUD visible), no dialog
    expect(screen.getByText('SCORE')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Escape on Mode Select does nothing (no menu, no crash)', () => {
    render(<App />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('SELECT MODE')).toBeTruthy();
  });
});
