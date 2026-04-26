// Pure-logic Snake engine. UI / audio / RAF live in SnakeGame.jsx.
// Tick advances the head one cell in `direction`; the body follows.

export const COLS = 20;
export const ROWS = 20;

const BASE_INTERVAL = 200;
const MIN_INTERVAL = 60;
const SPEEDUP_PER = 5; // foods per speedup
const SPEEDUP_DELTA = 10; // ms per speedup

const OPPOSITE = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

const STEP = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export const intervalForFoods = (foods) =>
  Math.max(MIN_INTERVAL, BASE_INTERVAL - SPEEDUP_DELTA * Math.floor(foods / SPEEDUP_PER));

const cellEq = (a, b) => a.x === b.x && a.y === b.y;
const containsCell = (cells, c) => cells.some((s) => cellEq(s, c));

const spawnFood = (snake, cols, rows, rng) => {
  // Pick random empty cell. With small grids and short snakes, rejection
  // sampling is fine. (Worst case ~400 cells for 20x20.)
  for (let i = 0; i < 1000; i++) {
    const x = Math.floor(rng() * cols);
    const y = Math.floor(rng() * rows);
    if (!containsCell(snake, { x, y })) return { x, y };
  }
  // Fallback: scan for first empty cell.
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!containsCell(snake, { x, y })) return { x, y };
    }
  }
  return null; // board full (won)
};

export const createGame = ({
  mode = 'classic',
  rng = Math.random,
  cols = COLS,
  rows = ROWS,
} = {}) => {
  const cy = Math.floor(rows / 2);
  const cx = Math.floor(cols / 2);
  const snake = [
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ];
  const food = spawnFood(snake, cols, rows, rng);
  return {
    mode,
    cols,
    rows,
    snake,
    direction: 'right',
    nextDirection: 'right',
    food,
    score: 0,
    foodsEaten: 0,
    status: 'playing',
    rng,
    interval: BASE_INTERVAL,
  };
};

export const changeDirection = (g, dir) => {
  if (g.status !== 'playing') return g;
  if (!STEP[dir]) return g;
  // Forbid 180° reversal against the LAST APPLIED direction so rapid double
  // input (right → up → left in one frame) can't flip the snake into itself.
  if (OPPOSITE[g.direction] === dir) return g;
  if (g.nextDirection === dir) return g;
  return { ...g, nextDirection: dir };
};

const wrap = (v, max) => ((v % max) + max) % max;

export const tick = (g) => {
  if (g.status !== 'playing') return g;
  const direction = g.nextDirection || g.direction;
  const step = STEP[direction];
  const head = g.snake[0];
  let nx = head.x + step.dx;
  let ny = head.y + step.dy;

  // Wall handling
  const offBoard = nx < 0 || nx >= g.cols || ny < 0 || ny >= g.rows;
  if (offBoard) {
    if (g.mode === 'wraparound') {
      nx = wrap(nx, g.cols);
      ny = wrap(ny, g.rows);
    } else {
      return { ...g, status: 'over', direction };
    }
  }

  const newHead = { x: nx, y: ny };
  const eats = g.food && cellEq(newHead, g.food);

  // Build new snake. If we eat, keep tail; otherwise drop tail before checking
  // self-collision so we don't false-positive on a tail cell that's about to
  // move out of the way this same tick.
  const bodyAfter = eats ? g.snake : g.snake.slice(0, -1);
  const selfHit = containsCell(bodyAfter, newHead);
  if (selfHit) {
    return { ...g, status: 'over', direction };
  }
  const newSnake = [newHead, ...bodyAfter];

  let foodsEaten = g.foodsEaten;
  let score = g.score;
  let food = g.food;
  if (eats) {
    foodsEaten += 1;
    score += 10;
    food = spawnFood(newSnake, g.cols, g.rows, g.rng);
  }

  return {
    ...g,
    snake: newSnake,
    direction,
    nextDirection: direction,
    food,
    score,
    foodsEaten,
    interval: intervalForFoods(foodsEaten),
  };
};

export const togglePause = (g) => {
  if (g.status === 'playing') return { ...g, status: 'paused' };
  if (g.status === 'paused') return { ...g, status: 'playing' };
  return g;
};
