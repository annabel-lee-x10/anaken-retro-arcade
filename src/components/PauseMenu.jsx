// In-game pause menu overlay. Opened by SELECT.
// Backdrop click closes; clicks on the card itself stay open.

export const PauseMenu = ({
  muted,
  onResume,
  onRestart,
  onChangeMode,
  onQuit,
  onToggleMute,
  onClose,
  hasPicker = true,
}) => {
  const stop = (e) => e.stopPropagation();
  return (
    <div
      className="pause-menu-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Game menu"
    >
      <div className="pause-menu-card" onClick={stop}>
        <div className="pause-menu-title">PAUSED</div>
        <div className="pause-menu-options">
          <button className="pause-menu-btn primary" onClick={onResume}>Resume</button>
          <button className="pause-menu-btn" onClick={onRestart}>Restart</button>
          <button className="pause-menu-btn" onClick={onChangeMode}>Change Mode</button>
          <button className="pause-menu-btn" onClick={onQuit}>
            {hasPicker ? 'Quit to Game Picker' : 'Quit Game'}
          </button>
          <button className="pause-menu-btn ghost" onClick={onToggleMute}>
            {muted ? 'Unmute' : 'Mute'}
          </button>
        </div>
        <div className="pause-menu-hint">SELECT or ESC to close</div>
      </div>
    </div>
  );
};
