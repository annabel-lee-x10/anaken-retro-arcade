// Top-level Game Picker. Renders a card per registered game.
// Auto-skipped when only one game is registered (App handles routing).

export const GamePicker = ({ games, onPick }) => (
  <div className="game-picker">
    <div className="game-picker-title">SELECT GAME</div>
    <div className="game-picker-grid">
      {games.map((g) => (
        <button
          key={g.id}
          className="game-card"
          onClick={() => onPick(g.id)}
          aria-label={`Play ${g.name}`}
        >
          <div className="game-card-icon" aria-hidden="true">{g.icon}</div>
          <div className="game-card-name">{g.name}</div>
          <div className="game-card-desc">{g.description}</div>
        </button>
      ))}
    </div>
    <div className="game-picker-hint">tap a game · more coming soon</div>
  </div>
);
