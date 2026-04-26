const SKINS = [
  { id: 'neon', label: 'NEON' },
  { id: 'snes', label: 'SNES' },
  { id: 'quiet', label: 'QUIET' },
];

export const TopBar = ({ skin, onSkin, muted, onMute }) => (
  <div className="topbar">
    <div className="topbar-title">
      <span className="title-glyph">▣</span>
      <span className="title-text">AnakenOS</span>
      <span className="title-glyph">▣</span>
    </div>
    <div className="topbar-controls">
      <div className="skin-switcher" role="group" aria-label="Skin">
        {SKINS.map((s) => (
          <button
            key={s.id}
            className={`skin-btn${skin === s.id ? ' active' : ''}`}
            onClick={() => onSkin(s.id)}
            aria-pressed={skin === s.id}
          >
            <span className={`skin-dot skin-dot-${s.id}`} />
            <span className="skin-label">{s.label}</span>
          </button>
        ))}
      </div>
      <button className="mute-btn" onClick={onMute} aria-label={muted ? 'Unmute' : 'Mute'}>
        {muted ? '♪̸' : '♪'}
      </button>
    </div>
  </div>
);
