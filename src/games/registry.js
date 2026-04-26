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

const INVADERS_MODES = [
  { id: 'classic', name: 'CLASSIC', desc: 'endless waves · 3 lives · 4 bunkers' },
  { id: 'survival', name: 'SURVIVAL', desc: 'one life · no bunkers · how long?' },
  { id: 'attack', name: 'TIME ATTACK', desc: '3 minutes · maximum score' },
];

const PINBALL_MODES = [
  { id: 'classic', name: 'CLASSIC', desc: '3 balls · score chase' },
  { id: 'speedrun', name: 'SPEEDRUN', desc: '1 ball · go for max' },
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
  {
    id: 'invaders',
    name: 'SPACE INVADERS',
    description: 'defend · aim · fire',
    icon: '👾',
    modes: INVADERS_MODES,
  },
  {
    id: 'pinball',
    name: 'PINBALL',
    description: 'flip · bounce · don’t drain',
    icon: '◉',
    modes: PINBALL_MODES,
  },
];

export const shouldShowPicker = (games = GAMES) => games.length >= 2;

export const getDefaultGame = (games = GAMES) => games[0] ?? null;

export const getGameById = (games, id) => games.find((g) => g.id === id) ?? null;
