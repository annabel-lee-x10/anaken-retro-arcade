import { describe, it, expect } from 'vitest';
import {
  createGame,
  setFlipper,
  pullPlunger,
  releasePlunger,
  tick,
  togglePause,
  hitBumper,
  hitSlingshot,
  hitDropTarget,
  drainBall,
  PLAYFIELD_W,
  PLAYFIELD_H,
} from './engine.js';

describe('engine: setup', () => {
  it('createGame starts in classic mode with 3 balls', () => {
    const g = createGame({ mode: 'classic' });
    expect(g.mode).toBe('classic');
    expect(g.ballsRemaining).toBe(3);
    expect(g.score).toBe(0);
  });

  it('createGame in speedrun mode has 1 ball', () => {
    const g = createGame({ mode: 'speedrun' });
    expect(g.mode).toBe('speedrun');
    expect(g.ballsRemaining).toBe(1);
  });

  it('starts in waiting state with ball in plunger lane', () => {
    const g = createGame({ mode: 'classic' });
    expect(g.status).toBe('waiting');
    expect(g.ball.x).toBeGreaterThan(PLAYFIELD_W * 0.85); // plunger lane is on right
    expect(g.ball.y).toBeGreaterThan(PLAYFIELD_H * 0.7); // near the bottom
  });

  it('has 3-5 bumpers in upper playfield', () => {
    const g = createGame({ mode: 'classic' });
    expect(g.bumpers.length).toBeGreaterThanOrEqual(3);
    expect(g.bumpers.length).toBeLessThanOrEqual(5);
    g.bumpers.forEach((b) => {
      expect(b.cy).toBeLessThan(PLAYFIELD_H * 0.6);
    });
  });

  it('has 2 slingshots above the flippers', () => {
    const g = createGame({ mode: 'classic' });
    expect(g.slingshots.length).toBe(2);
  });

  it('has at least 3 drop targets in a row, all standing', () => {
    const g = createGame({ mode: 'classic' });
    expect(g.dropTargets.length).toBeGreaterThanOrEqual(3);
    g.dropTargets.forEach((t) => expect(t.down).toBe(false));
  });

  it('has two flippers (left + right) at the bottom', () => {
    const g = createGame({ mode: 'classic' });
    expect(g.flippers.left).toBeDefined();
    expect(g.flippers.right).toBeDefined();
    expect(g.flippers.left.side).toBe('left');
    expect(g.flippers.right.side).toBe('right');
    expect(g.flippers.left.pivotY).toBeGreaterThan(PLAYFIELD_H * 0.7);
  });
});

describe('engine: scoring', () => {
  it('hitBumper adds 100 points', () => {
    const g = createGame({ mode: 'classic' });
    const g2 = hitBumper(g, 0);
    expect(g2.score).toBe(100);
  });

  it('hitSlingshot adds 50 points', () => {
    const g = createGame({ mode: 'classic' });
    const g2 = hitSlingshot(g, 0);
    expect(g2.score).toBe(50);
  });

  it('hitDropTarget adds 500 points and knocks down target', () => {
    const g = createGame({ mode: 'classic' });
    const g2 = hitDropTarget(g, 0);
    expect(g2.score).toBe(500);
    expect(g2.dropTargets[0].down).toBe(true);
  });

  it('hitting same drop target twice scores once', () => {
    const g = createGame({ mode: 'classic' });
    const g2 = hitDropTarget(g, 0);
    const g3 = hitDropTarget(g2, 0);
    expect(g3.score).toBe(500);
  });

  it('clearing all drop targets awards bonus + resets them', () => {
    let g = createGame({ mode: 'classic' });
    for (let i = 0; i < g.dropTargets.length; i++) {
      g = hitDropTarget(g, i);
    }
    // After last one: 500 * N + 5000 bonus
    const expectedBase = 500 * g.dropTargets.length;
    expect(g.score).toBe(expectedBase + 5000);
    expect(g.dropTargets.every((t) => t.down === false)).toBe(true);
  });
});

describe('engine: ball / lives', () => {
  it('drainBall decrements ballsRemaining and resets ball to plunger lane', () => {
    let g = createGame({ mode: 'classic' });
    g = { ...g, status: 'playing' };
    const g2 = drainBall(g);
    expect(g2.ballsRemaining).toBe(2);
    expect(g2.status).toBe('waiting'); // ready for next ball
    expect(g2.ball.x).toBeGreaterThan(PLAYFIELD_W * 0.85);
  });

  it('draining last ball -> game over', () => {
    let g = createGame({ mode: 'classic' });
    g = { ...g, status: 'playing', ballsRemaining: 1 };
    const g2 = drainBall(g);
    expect(g2.ballsRemaining).toBe(0);
    expect(g2.status).toBe('over');
  });

  it('speedrun: draining the only ball ends game', () => {
    let g = createGame({ mode: 'speedrun' });
    g = { ...g, status: 'playing' };
    const g2 = drainBall(g);
    expect(g2.status).toBe('over');
  });

  it('score persists across ball drains', () => {
    let g = createGame({ mode: 'classic' });
    g = { ...g, status: 'playing', score: 1234 };
    const g2 = drainBall(g);
    expect(g2.score).toBe(1234);
  });
});

describe('engine: plunger', () => {
  it('pullPlunger increases plunger pull while waiting', () => {
    const g = createGame({ mode: 'classic' });
    const g2 = pullPlunger(g, 100);
    expect(g2.plungerPull).toBeGreaterThan(0);
  });

  it('pullPlunger caps at 1.0', () => {
    let g = createGame({ mode: 'classic' });
    g = pullPlunger(g, 100000);
    expect(g.plungerPull).toBeLessThanOrEqual(1);
  });

  it('releasePlunger launches ball upward and clears pull', () => {
    let g = createGame({ mode: 'classic' });
    g = pullPlunger(g, 1000);
    const g2 = releasePlunger(g);
    expect(g2.ball.vy).toBeLessThan(0); // ball moving up
    expect(g2.plungerPull).toBe(0);
    expect(g2.status).toBe('playing');
  });

  it('releasePlunger does nothing when not waiting', () => {
    let g = createGame({ mode: 'classic' });
    g = { ...g, status: 'playing' };
    const g2 = releasePlunger(g);
    expect(g2).toEqual(g);
  });

  it('releasePlunger with zero pull still launches with min force', () => {
    const g = createGame({ mode: 'classic' });
    const g2 = releasePlunger(g);
    expect(g2.ball.vy).toBeLessThan(0);
  });
});

describe('engine: flipper control', () => {
  it('setFlipper("left", true) raises left flipper angularVel up', () => {
    const g = createGame({ mode: 'classic' });
    const g2 = setFlipper(g, 'left', true);
    expect(g2.flippers.left.angularVel).not.toBe(0);
  });

  it('setFlipper("left", false) sets target to rest', () => {
    let g = createGame({ mode: 'classic' });
    g = setFlipper(g, 'left', true);
    g = setFlipper(g, 'left', false);
    expect(g.flippers.left.up).toBe(false);
  });

  it('flipper held up stays up across ticks', () => {
    let g = createGame({ mode: 'classic' });
    g = { ...g, status: 'playing' };
    g = setFlipper(g, 'right', true);
    for (let i = 0; i < 60; i++) g = tick(g, 16);
    // Flipper should be at the up angle (not back at rest)
    expect(g.flippers.right.up).toBe(true);
  });
});

describe('engine: tick / pause', () => {
  it('tick on waiting status does not move ball (ball anchored to plunger)', () => {
    const g = createGame({ mode: 'classic' });
    const x0 = g.ball.x;
    const y0 = g.ball.y;
    const g2 = tick(g, 100);
    expect(g2.ball.x).toBe(x0);
    expect(g2.ball.y).toBe(y0);
  });

  it('tick on playing status moves ball under gravity', () => {
    let g = createGame({ mode: 'classic' });
    g = { ...g, status: 'playing', ball: { ...g.ball, vx: 0, vy: 0 } };
    const g2 = tick(g, 100);
    expect(g2.ball.vy).toBeGreaterThan(0); // gained downward velocity
  });

  it('togglePause flips between playing and paused', () => {
    let g = createGame({ mode: 'classic' });
    g = { ...g, status: 'playing' };
    const g2 = togglePause(g);
    expect(g2.status).toBe('paused');
    const g3 = togglePause(g2);
    expect(g3.status).toBe('playing');
  });

  it('tick on paused does nothing', () => {
    let g = createGame({ mode: 'classic' });
    g = { ...g, status: 'paused', ball: { ...g.ball, vx: 5, vy: 5 } };
    const g2 = tick(g, 100);
    expect(g2.ball.x).toBe(g.ball.x);
  });

  it('tick on game over does nothing', () => {
    let g = createGame({ mode: 'classic' });
    g = { ...g, status: 'over' };
    const g2 = tick(g, 1000);
    expect(g2).toEqual(g);
  });
});

describe('engine: drain detection', () => {
  it('ball falling past the bottom drain triggers drainBall', () => {
    let g = createGame({ mode: 'classic' });
    // Place ball mid-drain, moving down
    g = {
      ...g,
      status: 'playing',
      ball: { ...g.ball, x: PLAYFIELD_W * 0.5, y: PLAYFIELD_H + 50, vx: 0, vy: 5 },
    };
    const g2 = tick(g, 16);
    expect(g2.ballsRemaining).toBe(2);
  });
});
