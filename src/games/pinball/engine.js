// Pinball game engine — reducer-style pure state.
// Owns: ball, flipper state, drop targets, score, ball count, plunger.
// Delegates collision math to physics.js.

import {
  stepBall,
  reflectBallOffSegment,
  reflectBallOffCircle,
  flipperKick,
  flipperSegment,
} from './physics.js';

// Playfield dimensions in logical pixels. Canvas scales to fit.
export const PLAYFIELD_W = 360;
export const PLAYFIELD_H = 600;

const BALL_RADIUS = 8;
const BUMPER_RADIUS = 18;
const BUMPER_RESTITUTION = 1.35;
const SLINGSHOT_RESTITUTION = 1.4;
const FLIPPER_LENGTH = 58;
const FLIPPER_REST_ANGLE = 0.45;  // ~26°, points down/outward at rest
const FLIPPER_UP_ANGLE = -0.45;   // points up/inward when raised
const FLIPPER_ANG_SPEED = 0.025;  // rad/ms - aggressive snap
const PLUNGER_LANE_X = PLAYFIELD_W - 22;
const PLUNGER_REST_Y = PLAYFIELD_H - 40;
const PLUNGER_MAX_FORCE = 1.4;     // px/ms upward velocity at full pull
const PLUNGER_MIN_FORCE = 0.55;
const PLUNGER_PULL_RATE = 0.0012;  // per ms
const DRAIN_Y = PLAYFIELD_H + 12;  // ball below this = drained

// ---- factory ---------------------------------------------------------------

const makeBumpers = () => [
  { cx: PLAYFIELD_W * 0.30, cy: PLAYFIELD_H * 0.22, r: BUMPER_RADIUS },
  { cx: PLAYFIELD_W * 0.70, cy: PLAYFIELD_H * 0.22, r: BUMPER_RADIUS },
  { cx: PLAYFIELD_W * 0.50, cy: PLAYFIELD_H * 0.36, r: BUMPER_RADIUS },
];

// Slingshots are triangular pads above the flippers. We model their angled
// striking face as a single line segment that the ball reflects off.
const makeSlingshots = () => [
  // Left sling — angled face from upper-inner to lower-outer
  {
    seg: {
      x1: PLAYFIELD_W * 0.18, y1: PLAYFIELD_H * 0.72,
      x2: PLAYFIELD_W * 0.30, y2: PLAYFIELD_H * 0.82,
    },
  },
  // Right sling — mirrored
  {
    seg: {
      x1: PLAYFIELD_W * 0.82, y1: PLAYFIELD_H * 0.72,
      x2: PLAYFIELD_W * 0.70, y2: PLAYFIELD_H * 0.82,
    },
  },
];

// Drop targets — row of rectangles in upper-mid area
const makeDropTargets = () => {
  const y = PLAYFIELD_H * 0.48;
  const startX = PLAYFIELD_W * 0.28;
  const endX = PLAYFIELD_W * 0.72;
  const count = 4;
  const w = (endX - startX) / count;
  return Array.from({ length: count }, (_, i) => ({
    x: startX + i * w + 4,
    y,
    w: w - 8,
    h: 10,
    down: false,
  }));
};

// Static walls forming the playfield boundary, plunger lane and the funnel
// that drains between the flippers. Ball reflects off each line segment.
const makeWalls = () => [
  // Outer walls
  { x1: 0, y1: 0, x2: 0, y2: PLAYFIELD_H },                          // left
  { x1: PLAYFIELD_W, y1: 0, x2: PLAYFIELD_W, y2: PLAYFIELD_H },      // right
  // Top arch — slopes from (left edge, 60) → (center, 0) → (plunger lane left, 30)
  { x1: 0, y1: PLAYFIELD_H * 0.10, x2: PLAYFIELD_W * 0.50, y2: 0 },
  { x1: PLAYFIELD_W * 0.50, y1: 0, x2: PLAYFIELD_W - 36, y2: PLAYFIELD_H * 0.05 },
  // Shooter-lane diverter: angles from (plunger lane left wall top, 30)
  // up-right to (playfield right, 80). Ball exiting plunger lane at high
  // velocity hits this slope and deflects LEFT-DOWN into the playfield.
  { x1: PLAYFIELD_W - 36, y1: PLAYFIELD_H * 0.05, x2: PLAYFIELD_W, y2: PLAYFIELD_H * 0.13 },
  // Plunger lane left wall (vertical) — runs from below the diverter down
  // to the bottom-right of the playfield.
  { x1: PLAYFIELD_W - 36, y1: PLAYFIELD_H * 0.13, x2: PLAYFIELD_W - 36, y2: PLAYFIELD_H * 0.92 },
  // Inner funnel walls forming the flipper "V" (ball drains between them)
  { x1: 0, y1: PLAYFIELD_H * 0.74, x2: PLAYFIELD_W * 0.20, y2: PLAYFIELD_H * 0.86 },
  { x1: PLAYFIELD_W - 36, y1: PLAYFIELD_H * 0.74, x2: PLAYFIELD_W * 0.80, y2: PLAYFIELD_H * 0.86 },
];

const makeFlippers = () => ({
  left: {
    side: 'left',
    pivotX: PLAYFIELD_W * 0.28,
    pivotY: PLAYFIELD_H * 0.90,
    length: FLIPPER_LENGTH,
    angle: FLIPPER_REST_ANGLE,
    angularVel: 0,
    up: false,
  },
  right: {
    side: 'right',
    pivotX: PLAYFIELD_W * 0.72,
    pivotY: PLAYFIELD_H * 0.90,
    length: FLIPPER_LENGTH,
    angle: FLIPPER_REST_ANGLE,
    angularVel: 0,
    up: false,
  },
});

const initialBall = () => ({
  x: PLUNGER_LANE_X,
  y: PLUNGER_REST_Y,
  vx: 0,
  vy: 0,
  r: BALL_RADIUS,
});

export const createGame = ({ mode = 'classic' } = {}) => ({
  mode,
  status: 'waiting',         // 'waiting' | 'playing' | 'paused' | 'over'
  ballsRemaining: mode === 'speedrun' ? 1 : 3,
  score: 0,
  ball: initialBall(),
  bumpers: makeBumpers(),
  slingshots: makeSlingshots(),
  dropTargets: makeDropTargets(),
  walls: makeWalls(),
  flippers: makeFlippers(),
  plungerPull: 0,
  lastEvent: null,    // most recent SFX trigger, e.g. 'bumper', 'sling', 'drop', 'bonus', 'drain', 'over'
  bonusFlash: 0,      // ms remaining to highlight bonus
});

// ---- scoring helpers -------------------------------------------------------

export const hitBumper = (g) => ({
  ...g,
  score: g.score + 100,
  lastEvent: 'bumper',
});

export const hitSlingshot = (g) => ({
  ...g,
  score: g.score + 50,
  lastEvent: 'sling',
});

export const hitDropTarget = (g, idx) => {
  const t = g.dropTargets[idx];
  if (!t || t.down) return g;
  const targets = g.dropTargets.map((dt, i) => i === idx ? { ...dt, down: true } : dt);
  let score = g.score + 500;
  let event = 'drop';
  let bonusFlash = g.bonusFlash;
  let resetTargets = targets;
  if (targets.every((dt) => dt.down)) {
    score += 5000;
    event = 'bonus';
    bonusFlash = 1200;
    resetTargets = g.dropTargets.map((dt) => ({ ...dt, down: false }));
  }
  return {
    ...g,
    dropTargets: resetTargets,
    score,
    lastEvent: event,
    bonusFlash,
  };
};

// ---- ball lifecycle --------------------------------------------------------

export const drainBall = (g) => {
  const remaining = g.ballsRemaining - 1;
  if (remaining <= 0) {
    return { ...g, ballsRemaining: 0, status: 'over', lastEvent: 'over' };
  }
  return {
    ...g,
    ballsRemaining: remaining,
    status: 'waiting',
    ball: initialBall(),
    plungerPull: 0,
    lastEvent: 'drain',
  };
};

// ---- plunger ---------------------------------------------------------------

export const pullPlunger = (g, dt) => {
  if (g.status !== 'waiting') return g;
  const pull = Math.min(1, g.plungerPull + dt * PLUNGER_PULL_RATE);
  return { ...g, plungerPull: pull };
};

export const releasePlunger = (g) => {
  if (g.status !== 'waiting') return g;
  const force = PLUNGER_MIN_FORCE + (PLUNGER_MAX_FORCE - PLUNGER_MIN_FORCE) * g.plungerPull;
  return {
    ...g,
    status: 'playing',
    plungerPull: 0,
    ball: { ...g.ball, vy: -force, vx: 0 },
    lastEvent: 'plunger',
  };
};

// ---- flippers --------------------------------------------------------------

export const setFlipper = (g, side, isUp) => {
  const f = g.flippers[side];
  if (!f) return g;
  const targetAngularVel = isUp
    ? (side === 'left' ? -FLIPPER_ANG_SPEED : FLIPPER_ANG_SPEED)
    : (side === 'left' ? FLIPPER_ANG_SPEED : -FLIPPER_ANG_SPEED);
  return {
    ...g,
    flippers: {
      ...g.flippers,
      [side]: { ...f, up: isUp, angularVel: targetAngularVel },
    },
  };
};

const advanceFlipper = (f, dt) => {
  const target = f.up
    ? (f.side === 'left' ? FLIPPER_UP_ANGLE : -FLIPPER_UP_ANGLE)
    : (f.side === 'left' ? FLIPPER_REST_ANGLE : -FLIPPER_REST_ANGLE);

  let newAngle = f.angle + f.angularVel * dt;
  let newVel = f.angularVel;

  // Clamp to target — when reached, stop angular motion
  if (f.angularVel < 0 && newAngle <= target) { newAngle = target; newVel = 0; }
  else if (f.angularVel > 0 && newAngle >= target) { newAngle = target; newVel = 0; }
  return { ...f, angle: newAngle, angularVel: newVel };
};

// ---- pause -----------------------------------------------------------------

export const togglePause = (g) => {
  if (g.status === 'playing') return { ...g, status: 'paused' };
  if (g.status === 'paused') return { ...g, status: 'playing' };
  return g;
};

// ---- main tick -------------------------------------------------------------

const MAX_SUBSTEP = 4; // ms per physics substep — ensures we don't tunnel through walls
const MAX_SPEED = 1.8;  // px/ms — clamp ball velocity

const clampSpeed = (b) => {
  const s = Math.hypot(b.vx, b.vy);
  if (s <= MAX_SPEED) return b;
  const k = MAX_SPEED / s;
  return { ...b, vx: b.vx * k, vy: b.vy * k };
};

const applyCollisions = (state) => {
  let { ball, bumpers, slingshots, dropTargets, walls, flippers, score } = state;
  let lastEvent = state.lastEvent;
  let bonusFlash = state.bonusFlash;

  // Walls
  for (const w of walls) {
    const r = reflectBallOffSegment(ball, w, 0.92);
    if (r) ball = r;
  }

  // Bumpers
  for (let i = 0; i < bumpers.length; i++) {
    const r = reflectBallOffCircle(ball, bumpers[i], BUMPER_RESTITUTION);
    if (r) {
      ball = r;
      score += 100;
      lastEvent = 'bumper';
    }
  }

  // Slingshots
  for (let i = 0; i < slingshots.length; i++) {
    const r = reflectBallOffSegment(ball, slingshots[i].seg, SLINGSHOT_RESTITUTION);
    if (r) {
      ball = r;
      score += 50;
      lastEvent = 'sling';
    }
  }

  // Drop targets (only collide with standing ones)
  let targetsChanged = false;
  let workingTargets = dropTargets;
  for (let i = 0; i < workingTargets.length; i++) {
    const t = workingTargets[i];
    if (t.down) continue;
    const seg = { x1: t.x, y1: t.y, x2: t.x + t.w, y2: t.y };
    const r = reflectBallOffSegment(ball, seg, 1.0);
    if (r) {
      ball = r;
      if (!targetsChanged) workingTargets = workingTargets.slice();
      workingTargets[i] = { ...t, down: true };
      targetsChanged = true;
      score += 500;
      lastEvent = 'drop';
    }
  }
  if (targetsChanged && workingTargets.every((t) => t.down)) {
    workingTargets = workingTargets.map((t) => ({ ...t, down: false }));
    score += 5000;
    lastEvent = 'bonus';
    bonusFlash = 1200;
  }

  // Flippers — both as solid segments to bounce off, AND as kickers
  for (const side of ['left', 'right']) {
    const f = flippers[side];
    // Kick first if rotating
    const kicked = flipperKick(ball, f);
    if (kicked) {
      ball = kicked;
      lastEvent = 'flipper';
    } else {
      // Static reflect off flipper body
      const seg = flipperSegment(f);
      const r = reflectBallOffSegment(ball, seg, 0.5);
      if (r) ball = r;
    }
  }

  return {
    ...state,
    ball,
    dropTargets: workingTargets,
    score,
    lastEvent,
    bonusFlash,
  };
};

export const tick = (g, dt) => {
  if (g.status === 'paused' || g.status === 'over') return g;
  if (g.status === 'waiting') {
    // Hold ball in plunger lane (moves down with pull for visual effect)
    const pullOffset = g.plungerPull * 18;
    const ball = { ...g.ball, x: PLUNGER_LANE_X, y: PLUNGER_REST_Y + pullOffset, vx: 0, vy: 0 };
    return { ...g, ball, bonusFlash: Math.max(0, g.bonusFlash - dt) };
  }

  // Advance flippers
  let flippers = {
    left: advanceFlipper(g.flippers.left, dt),
    right: advanceFlipper(g.flippers.right, dt),
  };

  // Substep physics for stability
  let state = { ...g, flippers };
  let remaining = dt;
  let safety = 0;
  while (remaining > 0 && safety++ < 64) {
    const step = Math.min(MAX_SUBSTEP, remaining);
    let nextBall = stepBall(state.ball, step);
    nextBall = clampSpeed(nextBall);
    state = { ...state, ball: nextBall };
    state = applyCollisions(state);
    remaining -= step;

    // Drain check — ball below playfield bottom AND between the flippers
    if (state.ball.y > DRAIN_Y) {
      return drainBall(state);
    }
  }

  return {
    ...state,
    bonusFlash: Math.max(0, state.bonusFlash - dt),
  };
};
