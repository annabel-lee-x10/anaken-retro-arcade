// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { PauseMenu } from './PauseMenu.jsx';

afterEach(cleanup);

const defaultProps = () => ({
  muted: false,
  onResume: vi.fn(),
  onRestart: vi.fn(),
  onChangeMode: vi.fn(),
  onQuit: vi.fn(),
  onToggleMute: vi.fn(),
  onClose: vi.fn(),
});

describe('PauseMenu', () => {
  it('renders all 5 options', () => {
    render(<PauseMenu {...defaultProps()} />);
    expect(screen.getByRole('button', { name: /resume/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /restart/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /change mode/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /quit/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /mute/i })).toBeTruthy();
  });

  it('shows "Mute" when not muted, "Unmute" when muted', () => {
    const { rerender } = render(<PauseMenu {...defaultProps()} muted={false} />);
    expect(screen.getByRole('button', { name: 'Mute' })).toBeTruthy();
    rerender(<PauseMenu {...defaultProps()} muted={true} />);
    expect(screen.getByRole('button', { name: 'Unmute' })).toBeTruthy();
  });

  it('Resume calls onResume', () => {
    const props = defaultProps();
    render(<PauseMenu {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /resume/i }));
    expect(props.onResume).toHaveBeenCalledTimes(1);
  });

  it('Restart calls onRestart', () => {
    const props = defaultProps();
    render(<PauseMenu {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /restart/i }));
    expect(props.onRestart).toHaveBeenCalledTimes(1);
  });

  it('Change Mode calls onChangeMode', () => {
    const props = defaultProps();
    render(<PauseMenu {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /change mode/i }));
    expect(props.onChangeMode).toHaveBeenCalledTimes(1);
  });

  it('Quit calls onQuit', () => {
    const props = defaultProps();
    render(<PauseMenu {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /quit/i }));
    expect(props.onQuit).toHaveBeenCalledTimes(1);
  });

  it('Mute toggle calls onToggleMute', () => {
    const props = defaultProps();
    render(<PauseMenu {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /mute/i }));
    expect(props.onToggleMute).toHaveBeenCalledTimes(1);
  });

  it('clicking the backdrop calls onClose', () => {
    const props = defaultProps();
    render(<PauseMenu {...props} />);
    const backdrop = document.querySelector('.pause-menu-backdrop');
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking inside the menu card does NOT close it', () => {
    const props = defaultProps();
    render(<PauseMenu {...props} />);
    const card = document.querySelector('.pause-menu-card');
    fireEvent.click(card);
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('renders as a dialog with aria-modal', () => {
    render(<PauseMenu {...defaultProps()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });
});
