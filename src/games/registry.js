// Registered games for the arcade. Each entry describes a game and how to
// surface it in the Game Picker. New games register themselves here.

export const GAMES = [
  {
    id: 'tetris',
    name: 'TETRIS',
    description: 'stack · clear · survive',
    icon: '▦',
  },
];

export const shouldShowPicker = (games = GAMES) => games.length >= 2;

export const getDefaultGame = (games = GAMES) => games[0] ?? null;

export const getGameById = (games, id) => games.find((g) => g.id === id) ?? null;
