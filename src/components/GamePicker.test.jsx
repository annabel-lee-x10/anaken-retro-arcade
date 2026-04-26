// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { GamePicker } from './GamePicker.jsx';

afterEach(cleanup);

const mockGames = [
  { id: 'tetris', name: 'TETRIS', description: 'stack · clear · survive', icon: '▦' },
  { id: 'snake',  name: 'SNAKE',  description: 'eat · grow · do not bite', icon: '◉' },
];

describe('GamePicker', () => {
  it('renders one card per registered game', () => {
    render(<GamePicker games={mockGames} onPick={() => {}} />);
    expect(screen.getByText('TETRIS')).toBeTruthy();
    expect(screen.getByText('SNAKE')).toBeTruthy();
  });

  it('shows each game description and icon', () => {
    render(<GamePicker games={mockGames} onPick={() => {}} />);
    expect(screen.getByText('stack · clear · survive')).toBeTruthy();
    expect(screen.getByText('eat · grow · do not bite')).toBeTruthy();
    expect(screen.getByText('▦')).toBeTruthy();
    expect(screen.getByText('◉')).toBeTruthy();
  });

  it('clicking a card calls onPick with that game id', () => {
    const onPick = vi.fn();
    render(<GamePicker games={mockGames} onPick={onPick} />);
    fireEvent.click(screen.getByText('SNAKE'));
    expect(onPick).toHaveBeenCalledWith('snake');
  });

  it('shows a "more games coming soon" hint', () => {
    render(<GamePicker games={mockGames} onPick={() => {}} />);
    expect(screen.getByText(/coming soon|tap a game/i)).toBeTruthy();
  });

  it('renders a single card when only 1 game is registered', () => {
    render(<GamePicker games={[mockGames[0]]} onPick={() => {}} />);
    expect(screen.getByText('TETRIS')).toBeTruthy();
    expect(screen.queryByText('SNAKE')).toBeNull();
  });
});
