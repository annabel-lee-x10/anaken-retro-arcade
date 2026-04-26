// Registered games for the arcade. Each entry describes a game and how to
// surface it in the Game Picker. New games register themselves here.

const TETRIS_MODES = [
  { id: 'classic', name: 'CLASSIC', desc: 'endless · level up every 10 lines' },
  { id: 'sprint', name: 'SPRINT', desc: 'clear 40 lines as fast as you can' },
  { id: 'ultra', name: 'ULTRA', desc: '3 minutes · maximum score' },
  { id: 'zen', name: 'ZEN', desc: 'no pressure · no level-up' },
];

const SNAKE_MODES = [
  { id: 'classic', name: 'CLASSIC', desc: 'walls bite · grow forever' },
  { id: 'wraparound', name: 'WRAPAROUND', desc: 'walls warp · only you can stop you' },
];

export const GAMES = [
  {
    id: 'tetris',
    name: 'TETRIS',
    description: 'stack · clear · survive',
    icon: '▦',
    modes: TETRIS_MODES,
  },
  {
    id: 'snake',
    name: 'SNAKE',
    description: 'eat · grow · survive',
    icon: '◆',
    modes: SNAKE_MODES,
  },
];

export const shouldShowPicker = (games = GAMES) => games.length >= 2;

export const getDefaultGame = (games = GAMES) => games[0] ?? null;

export const getGameById = (games, id) => games.find((g) => g.id === id) ?? null;
