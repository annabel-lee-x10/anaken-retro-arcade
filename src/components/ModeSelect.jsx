const MODES = [
  { id: 'classic', name: 'CLASSIC', desc: 'endless · level up every 10 lines' },
  { id: 'sprint', name: 'SPRINT', desc: 'clear 40 lines as fast as you can' },
  { id: 'ultra', name: 'ULTRA', desc: '3 minutes · maximum score' },
  { id: 'zen', name: 'ZEN', desc: 'no pressure · no level-up' },
];

export const ModeSelect = ({ onPick }) => (
  <div className="mode-select">
    <div className="mode-title">SELECT MODE</div>
    <div className="mode-list">
      {MODES.map((m) => (
        <button key={m.id} className="mode-item" onClick={() => onPick(m.id)}>
          <div className="mode-name">{m.name}</div>
          <div className="mode-desc">{m.desc}</div>
        </button>
      ))}
    </div>
    <div className="mode-hint">tap a mode · press START in-game to pause</div>
  </div>
);
