import { describe, it, expect } from 'vitest';
import {
  stepBall,
  reflectBallOffSegment,
  reflectBallOffCircle,
  flipperKick,
  segmentDistanceToPoint,
  GRAVITY,
} from './physics.js';

const ball = (over = {}) => ({ x: 100, y: 100, vx: 0, vy: 0, r: 8, ...over });

describe('physics: gravity', () => {
  it('ball under gravity gains downward velocity each step', () => {
    const b0 = ball();
    const b1 = stepBall(b0, 16);
    expect(b1.vy).toBeGreaterThan(b0.vy);
  });

  it('ball under gravity falls (y increases) over time', () => {
    const b0 = ball();
    const b1 = stepBall(b0, 16);
    expect(b1.y).toBeGreaterThan(b0.y);
  });

  it('zero dt produces no motion', () => {
    const b0 = ball({ vx: 5, vy: 5 });
    const b1 = stepBall(b0, 0);
    expect(b1.x).toBe(b0.x);
    expect(b1.y).toBe(b0.y);
  });

  it('GRAVITY constant exists and is positive', () => {
    expect(GRAVITY).toBeGreaterThan(0);
  });
});

describe('physics: wall reflection (line segments)', () => {
  it('ball bouncing off vertical wall flips vx, preserves vy', () => {
    // Vertical wall at x=200, ball moving right into it
    const b = { x: 195, y: 100, vx: 10, vy: 3, r: 8 };
    const seg = { x1: 200, y1: 0, x2: 200, y2: 400 };
    const result = reflectBallOffSegment(b, seg);
    expect(result).not.toBeNull();
    expect(result.vx).toBeLessThan(0);
    expect(result.vy).toBeCloseTo(3, 5);
  });

  it('ball bouncing off horizontal floor flips vy, preserves vx', () => {
    // Horizontal floor at y=200, ball moving down into it
    const b = { x: 100, y: 195, vx: 3, vy: 10, r: 8 };
    const seg = { x1: 0, y1: 200, x2: 400, y2: 200 };
    const result = reflectBallOffSegment(b, seg);
    expect(result).not.toBeNull();
    expect(result.vy).toBeLessThan(0);
    expect(result.vx).toBeCloseTo(3, 5);
  });

  it('reflection preserves total speed (no restitution amp)', () => {
    const b = { x: 195, y: 100, vx: 10, vy: 0, r: 8 };
    const seg = { x1: 200, y1: 0, x2: 200, y2: 400 };
    const result = reflectBallOffSegment(b, seg);
    const speed0 = Math.hypot(b.vx, b.vy);
    const speed1 = Math.hypot(result.vx, result.vy);
    // Default restitution should be <= 1 (no energy added on plain walls)
    expect(speed1).toBeLessThanOrEqual(speed0 + 0.001);
  });

  it('returns null when ball not in contact with segment', () => {
    const b = { x: 50, y: 50, vx: 1, vy: 1, r: 8 };
    const seg = { x1: 200, y1: 200, x2: 300, y2: 200 };
    expect(reflectBallOffSegment(b, seg)).toBeNull();
  });

  it('moving away from wall does not reflect (no double-bounce)', () => {
    // Ball touching wall but already moving away — should NOT reflect.
    const b = { x: 192, y: 100, vx: -5, vy: 0, r: 8 };
    const seg = { x1: 200, y1: 0, x2: 200, y2: 400 };
    expect(reflectBallOffSegment(b, seg)).toBeNull();
  });
});

describe('physics: bumper / circle reflection', () => {
  it('ball hitting bumper reflects away from bumper center', () => {
    // Bumper center at (200, 100), radius 20. Ball approaching from left.
    const b = { x: 175, y: 100, vx: 5, vy: 0, r: 8 };
    const bumper = { cx: 200, cy: 100, r: 20 };
    const result = reflectBallOffCircle(b, bumper, 1.0);
    expect(result).not.toBeNull();
    expect(result.vx).toBeLessThan(0); // bounced back
  });

  it('bumper with restitution > 1 increases speed', () => {
    const b = { x: 175, y: 100, vx: 5, vy: 0, r: 8 };
    const bumper = { cx: 200, cy: 100, r: 20 };
    const result = reflectBallOffCircle(b, bumper, 1.3);
    const s0 = Math.hypot(b.vx, b.vy);
    const s1 = Math.hypot(result.vx, result.vy);
    expect(s1).toBeGreaterThan(s0);
  });

  it('returns null if ball does not touch bumper', () => {
    const b = { x: 50, y: 50, vx: 5, vy: 0, r: 8 };
    const bumper = { cx: 200, cy: 200, r: 20 };
    expect(reflectBallOffCircle(b, bumper, 1.0)).toBeNull();
  });

  it('ball moving away from bumper does not reflect', () => {
    const b = { x: 175, y: 100, vx: -5, vy: 0, r: 8 };
    const bumper = { cx: 200, cy: 100, r: 20 };
    expect(reflectBallOffCircle(b, bumper, 1.0)).toBeNull();
  });
});

describe('physics: flipper kick', () => {
  it('flipper rotating up applies tangential velocity to contacting ball', () => {
    // Flipper pivot at (100, 300), rest length 50, currently rotating up.
    const flipper = {
      pivotX: 100,
      pivotY: 300,
      length: 50,
      angle: 0.4,        // current angle (rest)
      angularVel: -8,    // rotating up (negative = CCW for left flipper)
      side: 'left',
    };
    // Ball sitting on the flipper tip area
    const b = { x: 145, y: 320, vx: 0, vy: 2, r: 8 };
    const result = flipperKick(b, flipper);
    expect(result).not.toBeNull();
    // After kick, ball should have upward velocity (vy < 0)
    expect(result.vy).toBeLessThan(b.vy);
  });

  it('flipper at rest (angularVel=0) does not kick', () => {
    const flipper = {
      pivotX: 100,
      pivotY: 300,
      length: 50,
      angle: 0.4,
      angularVel: 0,
      side: 'left',
    };
    const b = { x: 145, y: 320, vx: 0, vy: 2, r: 8 };
    expect(flipperKick(b, flipper)).toBeNull();
  });

  it('flipper kick only applies when ball is touching the flipper segment', () => {
    const flipper = {
      pivotX: 100,
      pivotY: 300,
      length: 50,
      angle: 0.4,
      angularVel: -8,
      side: 'left',
    };
    // Ball far from flipper
    const b = { x: 400, y: 50, vx: 0, vy: 0, r: 8 };
    expect(flipperKick(b, flipper)).toBeNull();
  });
});

describe('physics: helpers', () => {
  it('segmentDistanceToPoint returns 0 when point on segment', () => {
    const d = segmentDistanceToPoint({ x: 50, y: 100 }, { x1: 0, y1: 100, x2: 100, y2: 100 });
    expect(d).toBeCloseTo(0, 5);
  });

  it('segmentDistanceToPoint returns perpendicular distance', () => {
    const d = segmentDistanceToPoint({ x: 50, y: 110 }, { x1: 0, y1: 100, x2: 100, y2: 100 });
    expect(d).toBeCloseTo(10, 5);
  });

  it('segmentDistanceToPoint clamps to endpoint when outside segment', () => {
    const d = segmentDistanceToPoint({ x: -10, y: 100 }, { x1: 0, y1: 100, x2: 100, y2: 100 });
    expect(d).toBeCloseTo(10, 5);
  });
});
