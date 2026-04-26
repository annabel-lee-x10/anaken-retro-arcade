import { describe, it, expect } from 'vitest';
import {
  createGame, movePlayer, playerShoot, togglePause, tick,
  FIELD_W, FIELD_H, ALIEN_W, ALIEN_H, ALIEN_ROWS, ALIEN_COLS,
  ALIEN_STEP_X, ALIEN_STEP_Y, ALIEN_BASE_INTERVAL, ALIEN_MIN_INTERVAL,
  PLAYER_STEP, PLAYER_W, PLAYER_BULLET_SPEED, PLAYER_RESPAWN_MS,
  ALIEN_POINTS, BUNKER_W, BUNKER_H,
} from './engine.js';

const seed = (s = 42) => () => {
  s = (s * 9301 + 49297) % 233280;
  return s / 233280;
};

describe('invaders: setup', () => {
  it('createGame returns playing state with full formation', () => {
    const g = createGame({ rng: seed() });
    expect(g.status).toBe('playing');
    expect(g.aliens.length).toBe(ALIEN_ROWS * ALIEN_COLS);
    expect(g.aliens.every((a) => a.alive)).toBe(true);
    expect(g.score).toBe(0);
    expect(g.lives).toBe(3);
  });

  it('classic has 4 bunkers; survival has none', () => {
    const c = createGame({ rng: seed() });
    expect(c.bunkers.length).toBe(4);
    const s = createGame({ mode: 'survival', rng: seed() });
    expect(s.bunkers.length).toBe(0);
    expect(s.lives).toBe(1);
  });

  it('time-attack mode sets a 3-minute limit', () => {
    const g = createGame({ mode: 'attack', rng: seed() });
    expect(g.timeLimit).toBe(180000);
  });
});

describe('invaders: player movement', () => {
  it('left/right move the player by PLAYER_STEP', () => {
    const g = createGame({ rng: seed() });
    const x0 = g.player.x;
    movePlayer(g, 1);
    expect(g.player.x).toBe(x0 + PLAYER_STEP);
    movePlayer(g, -1);
    movePlayer(g, -1);
    expect(g.player.x).toBe(x0 - PLAYER_STEP);
  });

  it('movement clamps at the walls', () => {
    const g = createGame({ rng: seed() });
    for (let i = 0; i < 200; i++) movePlayer(g, -1);
    expect(g.player.x).toBe(0);
    for (let i = 0; i < 200; i++) movePlayer(g, 1);
    expect(g.player.x).toBe(FIELD_W - PLAYER_W);
  });

  it('movement is blocked while the player is dead', () => {
    const g = createGame({ rng: seed() });
    g.playerAlive = false;
    const x0 = g.player.x;
    movePlayer(g, 1);
    expect(g.player.x).toBe(x0);
  });
});

describe('invaders: shoot rate-limit (one bullet at a time)', () => {
  it('first shoot creates a bullet, second is ignored while one is on screen', () => {
    const g = createGame({ rng: seed() });
    playerShoot(g);
    expect(g.playerBullet).not.toBeNull();
    const before = g.playerBullet;
    playerShoot(g);
    expect(g.playerBullet).toBe(before); // same bullet, not replaced
  });

  it('after the bullet leaves the screen, a new shot is allowed', () => {
    const g = createGame({ rng: seed() });
    playerShoot(g);
    // simulate enough time for the bullet to clear the field
    tick(g, FIELD_H / PLAYER_BULLET_SPEED + 100);
    expect(g.playerBullet).toBeNull();
    playerShoot(g);
    expect(g.playerBullet).not.toBeNull();
  });
});

describe('invaders: alien formation movement', () => {
  it('formation moves horizontally on each step', () => {
    const g = createGame({ rng: seed() });
    const x0 = g.aliens[0].x;
    g.alienStepTimer = g.alienStepInterval; // force a step
    tick(g, 1);
    expect(g.aliens[0].x).toBe(x0 + ALIEN_STEP_X);
  });

  it('hitting the right wall reverses direction and drops the formation', () => {
    const g = createGame({ rng: seed() });
    // shove the entire formation to within ALIEN_STEP_X of the right wall
    const rightmost = Math.max(...g.aliens.map((a) => a.x + ALIEN_W));
    const shift = FIELD_W - rightmost - 1; // just touching the wall after one more step
    for (const a of g.aliens) a.x += shift;
    const ys0 = g.aliens.map((a) => a.y);

    // step 1: no room → reverses + queues drop
    g.alienStepTimer = g.alienStepInterval;
    tick(g, 1);
    expect(g.alienDir).toBe(-1);
    expect(g.pendingDrop).toBe(true);

    // step 2: drops by ALIEN_STEP_Y
    g.alienStepTimer = g.alienStepInterval;
    tick(g, 1);
    g.aliens.forEach((a, i) => expect(a.y).toBe(ys0[i] + ALIEN_STEP_Y));
    expect(g.alienDir).toBe(-1);
  });
});

describe('invaders: bullet ↔ alien collision', () => {
  it('player bullet kills the targeted alien and awards points', () => {
    const g = createGame({ rng: seed() });
    // pick the first alien and spawn a bullet directly under it
    const a = g.aliens[0];
    g.player.x = a.x + ALIEN_W / 2 - PLAYER_W / 2;
    playerShoot(g);
    // place the bullet just below the alien for a guaranteed hit on next tick
    g.playerBullet.y = a.y + ALIEN_H + 1;
    const score0 = g.score;
    tick(g, 16); // bullet moves up, hits alien
    expect(a.alive).toBe(false);
    expect(g.score).toBe(score0 + ALIEN_POINTS[a.row]);
    expect(g.playerBullet).toBeNull();
  });

  it('alien bullet kills the player and decrements lives', () => {
    const g = createGame({ rng: seed() });
    g.alienBullets.push({
      x: g.player.x + 4,
      y: g.player.y - 2,
      w: 2, h: 6,
    });
    const lives0 = g.lives;
    tick(g, 16);
    expect(g.playerAlive).toBe(false);
    expect(g.lives).toBe(lives0 - 1);
  });
});

describe('invaders: bunker erosion', () => {
  it('player bullet erodes bunker pixels on impact', () => {
    const g = createGame({ rng: seed() });
    const b = g.bunkers[0];
    // count solid pixels before
    const before = b.pixels.flat().filter(Boolean).length;
    // place bullet inside the bunker, aimed upward
    g.playerBullet = { x: b.x + Math.floor(BUNKER_W / 2), y: b.y + BUNKER_H - 2, w: 1, h: 6 };
    tick(g, 16);
    const after = b.pixels.flat().filter(Boolean).length;
    expect(after).toBeLessThan(before);
    expect(g.playerBullet).toBeNull();
  });

  it('alien bullet erodes the top of the bunker on impact', () => {
    const g = createGame({ rng: seed() });
    const b = g.bunkers[1];
    const before = b.pixels.flat().filter(Boolean).length;
    g.alienBullets.push({ x: b.x + Math.floor(BUNKER_W / 2), y: b.y - 1, w: 2, h: 6 });
    tick(g, 16);
    const after = b.pixels.flat().filter(Boolean).length;
    expect(after).toBeLessThan(before);
    expect(g.alienBullets.length).toBe(0);
  });
});

describe('invaders: speed creep', () => {
  it('killing aliens makes the formation step interval shrink', () => {
    const g = createGame({ rng: seed() });
    const slow = g.alienStepInterval;
    // kill ~half the formation directly
    for (let i = 0; i < Math.floor(g.aliens.length / 2); i++) g.aliens[i].alive = false;
    // simulate engine bookkeeping after a kill
    const a = g.aliens.find((x) => x.alive);
    g.player.x = a.x + ALIEN_W / 2 - PLAYER_W / 2;
    playerShoot(g);
    g.playerBullet.y = a.y + ALIEN_H + 1;
    tick(g, 16);
    expect(g.alienStepInterval).toBeLessThan(slow);
    expect(g.alienStepInterval).toBeGreaterThanOrEqual(ALIEN_MIN_INTERVAL);
  });

  it('full formation interval matches the base rate', () => {
    const g = createGame({ rng: seed() });
    expect(g.alienStepInterval).toBeCloseTo(ALIEN_BASE_INTERVAL, 0);
  });
});

describe('invaders: wave clear → next wave', () => {
  it('clearing all aliens spawns a new wave and increments g.wave', () => {
    const g = createGame({ rng: seed() });
    for (const a of g.aliens) a.alive = false;
    tick(g, 1);
    expect(g.wave).toBe(2);
    expect(g.aliens.filter((a) => a.alive).length).toBe(ALIEN_ROWS * ALIEN_COLS);
  });
});

describe('invaders: game over conditions', () => {
  it('game over when lives reach 0', () => {
    const g = createGame({ rng: seed() });
    g.lives = 1;
    g.alienBullets.push({ x: g.player.x + 4, y: g.player.y - 2, w: 2, h: 6 });
    tick(g, 16);
    expect(g.lives).toBe(0);
    expect(g.status).toBe('over');
  });

  it('game over when an alien reaches the player line', () => {
    const g = createGame({ rng: seed() });
    g.aliens[0].y = FIELD_H; // forced floor breach
    tick(g, 16);
    expect(g.status).toBe('over');
  });

  it('time-attack ends when the limit is reached', () => {
    const g = createGame({ mode: 'attack', rng: seed() });
    g.elapsedMs = 179999;
    tick(g, 100);
    expect(g.status).toBe('over');
  });
});

describe('invaders: pause', () => {
  it('togglePause flips between playing and paused', () => {
    const g = createGame({ rng: seed() });
    togglePause(g);
    expect(g.status).toBe('paused');
    togglePause(g);
    expect(g.status).toBe('playing');
  });

  it('tick on a paused game does nothing', () => {
    const g = createGame({ rng: seed() });
    togglePause(g);
    const x0 = g.aliens[0].x;
    tick(g, 5000);
    expect(g.aliens[0].x).toBe(x0);
  });
});

describe('invaders: respawn after death', () => {
  it('player returns to center after the respawn timer elapses', () => {
    const g = createGame({ rng: seed() });
    g.lives = 3;
    g.alienBullets.push({ x: g.player.x + 4, y: g.player.y - 2, w: 2, h: 6 });
    tick(g, 16);
    expect(g.playerAlive).toBe(false);
    tick(g, PLAYER_RESPAWN_MS + 50);
    expect(g.playerAlive).toBe(true);
    expect(g.player.x).toBe((FIELD_W - PLAYER_W) / 2);
  });
});
