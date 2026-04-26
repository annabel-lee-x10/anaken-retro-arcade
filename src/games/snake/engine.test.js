import { describe, it, expect } from 'vitest';
import {
  createGame,
  changeDirection,
  tick,
  togglePause,
  intervalForFoods,
  COLS,
  ROWS,
} from './engine.js';

const makeSeed = () => {
  let s = 42;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

const cellEq = (a, b) => a.x === b.x && a.y === b.y;
const containsCell = (snake, c) => snake.some((s) => cellEq(s, c));

describe('snake engine: setup', () => {
  it('createGame returns a playing state', () => {
    const g = createGame({ rng: makeSeed() });
    expect(g.status).toBe('playing');
  });

  it('createGame default mode is classic', () => {
    const g = createGame({ rng: makeSeed() });
    expect(g.mode).toBe('classic');
  });

  it('createGame accepts wraparound mode', () => {
    const g = createGame({ mode: 'wraparound', rng: makeSeed() });
    expect(g.mode).toBe('wraparound');
  });

  it('initial snake has length 3 and points right', () => {
    const g = createGame({ rng: makeSeed() });
    expect(g.snake.length).toBe(3);
    expect(g.direction).toBe('right');
    // body extends to the left of the head
    const head = g.snake[0];
    const body = g.snake[1];
    expect(body.x).toBe(head.x - 1);
    expect(body.y).toBe(head.y);
  });

  it('initial food is on an empty cell (not on snake)', () => {
    const g = createGame({ rng: makeSeed() });
    expect(containsCell(g.snake, g.food)).toBe(false);
  });

  it('score and stats start at zero', () => {
    const g = createGame({ rng: makeSeed() });
    expect(g.score).toBe(0);
    expect(g.foodsEaten).toBe(0);
  });

  it('grid dimensions are exposed', () => {
    expect(typeof COLS).toBe('number');
    expect(typeof ROWS).toBe('number');
    expect(COLS).toBeGreaterThan(5);
    expect(ROWS).toBeGreaterThan(5);
  });
});

describe('snake engine: tick + movement', () => {
  it('tick moves head one cell in current direction (right)', () => {
    const g = createGame({ rng: makeSeed() });
    const head = g.snake[0];
    const g2 = tick(g);
    expect(g2.snake[0].x).toBe(head.x + 1);
    expect(g2.snake[0].y).toBe(head.y);
  });

  it('tick: body follows the head (each segment slides forward)', () => {
    const g = createGame({ rng: makeSeed() });
    const before = g.snake.map((c) => ({ ...c }));
    const g2 = tick(g);
    // each segment after the head occupies the position of its predecessor in the prior frame
    for (let i = 1; i < g2.snake.length; i++) {
      expect(g2.snake[i]).toEqual(before[i - 1]);
    }
  });

  it('tick: snake length unchanged when no food eaten', () => {
    const g = createGame({ rng: makeSeed() });
    const len = g.snake.length;
    const g2 = tick(g);
    expect(g2.snake.length).toBe(len);
  });

  it('tick on a non-playing state returns the same state', () => {
    const g = createGame({ rng: makeSeed() });
    const paused = togglePause(g);
    const t = tick(paused);
    expect(t).toBe(paused);
  });
});

describe('snake engine: direction control', () => {
  it('changeDirection updates direction (perpendicular, allowed)', () => {
    const g = createGame({ rng: makeSeed() });
    const g2 = changeDirection(g, 'up');
    const g3 = tick(g2);
    expect(g3.snake[0].y).toBe(g.snake[0].y - 1);
    expect(g3.direction).toBe('up');
  });

  it('changeDirection ignores reversal (right -> left)', () => {
    const g = createGame({ rng: makeSeed() });
    const g2 = changeDirection(g, 'left');
    const g3 = tick(g2);
    // still moved right, not left
    expect(g3.snake[0].x).toBe(g.snake[0].x + 1);
    expect(g3.direction).toBe('right');
  });

  it('changeDirection ignores reversal (up -> down)', () => {
    let g = createGame({ rng: makeSeed() });
    g = changeDirection(g, 'up');
    g = tick(g); // direction is now 'up' applied
    const headBefore = g.snake[0];
    g = changeDirection(g, 'down');
    g = tick(g);
    // still moved up, not down
    expect(g.snake[0].y).toBe(headBefore.y - 1);
    expect(g.direction).toBe('up');
  });

  it('rapid double change against current direction still ignores reverse', () => {
    // moving right; press up then immediately left (left = reverse of right). left must be ignored.
    let g = createGame({ rng: makeSeed() });
    g = changeDirection(g, 'up');
    g = changeDirection(g, 'left');
    g = tick(g);
    // queued direction is up (left ignored), so head moves up
    expect(g.direction).toBe('up');
  });
});

describe('snake engine: food + growth', () => {
  it('eating food grows the snake and increments score by 10', () => {
    // craft a state where the next tick eats food
    const rng = makeSeed();
    let g = createGame({ rng });
    // place food directly in front of head
    const head = g.snake[0];
    g = { ...g, food: { x: head.x + 1, y: head.y } };
    const lenBefore = g.snake.length;
    const g2 = tick(g);
    expect(g2.snake.length).toBe(lenBefore + 1);
    expect(g2.score).toBe(10);
    expect(g2.foodsEaten).toBe(1);
  });

  it('after eating, food respawns on a non-snake cell', () => {
    let g = createGame({ rng: makeSeed() });
    const head = g.snake[0];
    g = { ...g, food: { x: head.x + 1, y: head.y } };
    const g2 = tick(g);
    expect(containsCell(g2.snake, g2.food)).toBe(false);
    // food has actual coordinates
    expect(g2.food.x).toBeGreaterThanOrEqual(0);
    expect(g2.food.x).toBeLessThan(COLS);
    expect(g2.food.y).toBeGreaterThanOrEqual(0);
    expect(g2.food.y).toBeLessThan(ROWS);
  });
});

describe('snake engine: collisions', () => {
  it('classic mode: hitting right wall ends the game', () => {
    let g = createGame({ rng: makeSeed() });
    // walk head to the right edge
    while (g.snake[0].x < COLS - 1 && g.status === 'playing') {
      g = { ...g, food: { x: 0, y: 0 } }; // keep food away
      g = tick(g);
    }
    // one more tick should run into the wall
    expect(g.status).toBe('playing');
    g = tick(g);
    expect(g.status).toBe('over');
  });

  it('wraparound mode: walking off right edge teleports head to x=0', () => {
    let g = createGame({ mode: 'wraparound', rng: makeSeed() });
    // walk head until just at right edge
    while (g.snake[0].x < COLS - 1 && g.status === 'playing') {
      g = { ...g, food: { x: 0, y: 0 } };
      g = tick(g);
    }
    expect(g.status).toBe('playing');
    expect(g.snake[0].x).toBe(COLS - 1);
    g = tick(g);
    expect(g.status).toBe('playing');
    expect(g.snake[0].x).toBe(0);
  });

  it('wraparound mode: walking off top edge teleports head to bottom', () => {
    let g = createGame({ mode: 'wraparound', rng: makeSeed() });
    g = changeDirection(g, 'up');
    while (g.snake[0].y > 0 && g.status === 'playing') {
      g = { ...g, food: { x: COLS - 1, y: ROWS - 1 } };
      g = tick(g);
    }
    expect(g.snake[0].y).toBe(0);
    g = tick(g);
    expect(g.status).toBe('playing');
    expect(g.snake[0].y).toBe(ROWS - 1);
  });

  it('hitting yourself ends the game', () => {
    // Snake forms a loop where moving right puts the head into a non-tail
    // body cell. The tail (7,6) moves out, but (6,5) stays put → collision.
    const rng = makeSeed();
    const snake = [
      { x: 5, y: 5 }, // head, moving right
      { x: 4, y: 5 },
      { x: 4, y: 4 },
      { x: 5, y: 4 },
      { x: 6, y: 4 },
      { x: 6, y: 5 }, // <- head will land here next tick
      { x: 6, y: 6 },
      { x: 7, y: 6 }, // tail
    ];
    const g = {
      mode: 'classic',
      cols: COLS,
      rows: ROWS,
      snake,
      direction: 'right',
      nextDirection: 'right',
      food: { x: 0, y: 0 },
      score: 0,
      foodsEaten: 0,
      status: 'playing',
      rng,
      interval: 200,
    };
    const g2 = tick(g);
    expect(g2.status).toBe('over');
  });

  it('chasing your own tail does NOT end the game (tail moves first)', () => {
    // Realistic snake invariant: in normal Snake, the cell the tail just
    // vacated is fair game for the head on the same tick.
    const rng = makeSeed();
    const snake = [
      { x: 5, y: 5 }, // head, moving right
      { x: 4, y: 5 },
      { x: 4, y: 6 },
      { x: 5, y: 6 },
      { x: 6, y: 6 },
      { x: 6, y: 5 }, // tail — head will land here as it moves away
    ];
    const g = {
      mode: 'classic',
      cols: COLS,
      rows: ROWS,
      snake,
      direction: 'right',
      nextDirection: 'right',
      food: { x: 0, y: 0 },
      score: 0,
      foodsEaten: 0,
      status: 'playing',
      rng,
      interval: 200,
    };
    const g2 = tick(g);
    expect(g2.status).toBe('playing');
  });
});

describe('snake engine: speed ramp', () => {
  it('intervalForFoods(0) is 200', () => {
    expect(intervalForFoods(0)).toBe(200);
  });
  it('intervalForFoods(4) is still 200 (ramp every 5 foods)', () => {
    expect(intervalForFoods(4)).toBe(200);
  });
  it('intervalForFoods(5) drops by 10 to 190', () => {
    expect(intervalForFoods(5)).toBe(190);
  });
  it('intervalForFoods(50) hits the floor of 60', () => {
    expect(intervalForFoods(50)).toBeGreaterThanOrEqual(60);
  });
  it('intervalForFoods never drops below 60', () => {
    expect(intervalForFoods(9999)).toBe(60);
  });
});

describe('snake engine: pause', () => {
  it('togglePause flips playing <-> paused', () => {
    const g = createGame({ rng: makeSeed() });
    const p = togglePause(g);
    expect(p.status).toBe('paused');
    const r = togglePause(p);
    expect(r.status).toBe('playing');
  });

  it('togglePause does nothing when game is over', () => {
    const g = { ...createGame({ rng: makeSeed() }), status: 'over' };
    const p = togglePause(g);
    expect(p.status).toBe('over');
  });
});
