// Space Invaders engine — pure logic, no DOM.
// State is mutated in place by the exported operations and returned for chaining.
// React triggers a re-render via a rev counter after each tick.

export const FIELD_W = 224;
export const FIELD_H = 256;

export const ALIEN_ROWS = 5;
export const ALIEN_COLS = 11;
export const ALIEN_W = 12;
export const ALIEN_H = 8;
export const ALIEN_HSPACE = 16;
export const ALIEN_VSPACE = 14;
export const ALIEN_START_X = 24;
export const ALIEN_START_Y = 32;
export const ALIEN_STEP_X = 4;
export const ALIEN_STEP_Y = 8;
export const ALIEN_BASE_INTERVAL = 850;
export const ALIEN_MIN_INTERVAL = 80;

// Row 0 = top (30 pts), rows 1–2 = middle (20 pts), rows 3–4 = bottom (10 pts).
export const ALIEN_POINTS = [30, 20, 20, 10, 10];
// Visual sprite type per row (0/1/2 — same shape as classic SI).
export const ALIEN_TYPE = [0, 1, 1, 2, 2];

export const PLAYER_W = 16;
export const PLAYER_H = 8;
export const PLAYER_Y = FIELD_H - 24;
export const PLAYER_STEP = 4;
export const PLAYER_RESPAWN_MS = 900;

export const PLAYER_BULLET_W = 1;
export const PLAYER_BULLET_H = 6;
export const PLAYER_BULLET_SPEED = 0.45; // px / ms

export const ALIEN_BULLET_W = 2;
export const ALIEN_BULLET_H = 6;
export const ALIEN_BULLET_SPEED = 0.18; // px / ms

export const ALIEN_SHOOT_MIN = 700;
export const ALIEN_SHOOT_MAX = 1700;

export const BUNKER_COUNT = 4;
export const BUNKER_W = 22;
export const BUNKER_H = 16;
export const BUNKER_Y = FIELD_H - 56;
export const BUNKER_GAP = (FIELD_W - BUNKER_COUNT * BUNKER_W) / (BUNKER_COUNT + 1);

export const SAUCER_W = 16;
export const SAUCER_H = 7;
export const SAUCER_Y = 16;
export const SAUCER_SPEED = 0.06;
export const SAUCER_INTERVAL_MIN = 18000;
export const SAUCER_INTERVAL_MAX = 30000;
export const SAUCER_POINTS = [50, 100, 150, 200, 300];

export const ALIEN_FLOOR_Y = PLAYER_Y; // aliens reaching this == game over

const TIME_ATTACK_MS = 180000;

const rectsOverlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// Build the carved bunker shape (true = solid). Two notches at top corners and
// an arch carved out of the bottom — rough approximation of the iconic block.
export const buildBunkerPixels = () => {
  const grid = Array.from({ length: BUNKER_H }, () => new Array(BUNKER_W).fill(true));
  // top-left and top-right corner bevels
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4 - r; c++) {
      grid[r][c] = false;
      grid[r][BUNKER_W - 1 - c] = false;
    }
  }
  // bottom arch
  for (let r = BUNKER_H - 6; r < BUNKER_H; r++) {
    const w = Math.min(8, (r - (BUNKER_H - 7)) * 2);
    const start = Math.floor((BUNKER_W - w) / 2);
    for (let c = start; c < start + w; c++) grid[r][c] = false;
  }
  return grid;
};

const buildBunkers = () => {
  const out = [];
  for (let i = 0; i < BUNKER_COUNT; i++) {
    out.push({
      x: Math.round(BUNKER_GAP + i * (BUNKER_W + BUNKER_GAP)),
      y: BUNKER_Y,
      pixels: buildBunkerPixels(),
    });
  }
  return out;
};

const buildAliens = (waveOffset = 0) => {
  const out = [];
  for (let r = 0; r < ALIEN_ROWS; r++) {
    for (let c = 0; c < ALIEN_COLS; c++) {
      out.push({
        row: r,
        col: c,
        x: ALIEN_START_X + c * ALIEN_HSPACE,
        y: ALIEN_START_Y + waveOffset + r * ALIEN_VSPACE,
        type: ALIEN_TYPE[r],
        alive: true,
        animFrame: 0,
      });
    }
  }
  return out;
};

const stepIntervalFor = (remaining, total) => {
  if (remaining <= 0) return ALIEN_BASE_INTERVAL;
  const t = remaining / total;
  return Math.max(ALIEN_MIN_INTERVAL, ALIEN_MIN_INTERVAL + (ALIEN_BASE_INTERVAL - ALIEN_MIN_INTERVAL) * t);
};

export const createGame = ({ mode = 'classic', rng = Math.random, wave = 1 } = {}) => {
  const includeBunkers = mode !== 'survival';
  const lives = mode === 'survival' ? 1 : 3;
  const waveOffset = (wave - 1) * 8;
  const aliens = buildAliens(waveOffset);
  const total = aliens.length;
  return {
    mode,
    rng,
    wave,
    status: 'playing',
    elapsedMs: 0,
    timeLimit: mode === 'attack' ? TIME_ATTACK_MS : null,

    aliens,
    alienDir: 1,
    alienStepTimer: 0,
    alienStepInterval: stepIntervalFor(total, total),
    alienStepPhase: 0, // 0..3 — drives the heartbeat tone
    alienAnimFrame: 0,
    alienTotal: total,
    pendingDrop: false,

    player: { x: (FIELD_W - PLAYER_W) / 2, y: PLAYER_Y, w: PLAYER_W, h: PLAYER_H },
    playerAlive: true,
    playerRespawnTimer: 0,
    lives,

    playerBullet: null,
    alienBullets: [],
    alienShootTimer: ALIEN_SHOOT_MIN + (ALIEN_SHOOT_MAX - ALIEN_SHOOT_MIN) * rng(),

    bunkers: includeBunkers ? buildBunkers() : [],

    saucer: null,
    saucerTimer: SAUCER_INTERVAL_MIN + (SAUCER_INTERVAL_MAX - SAUCER_INTERVAL_MIN) * rng(),
    saucerHitFlash: 0,

    score: 0,
    waveClearTimer: 0,

    // last-frame events for SFX hooks (consumed/cleared by tick or by reader)
    events: { shot: 0, alienHit: 0, playerHit: 0, alienStep: 0, saucerSpawn: 0, saucerHit: 0, waveClear: 0 },
  };
};

export const movePlayer = (g, dx) => {
  if (g.status !== 'playing' || !g.playerAlive) return g;
  g.player.x = Math.max(0, Math.min(FIELD_W - PLAYER_W, g.player.x + dx * PLAYER_STEP));
  return g;
};

export const playerShoot = (g) => {
  if (g.status !== 'playing' || !g.playerAlive) return g;
  if (g.playerBullet) return g;
  g.playerBullet = {
    x: g.player.x + g.player.w / 2 - PLAYER_BULLET_W / 2,
    y: g.player.y - PLAYER_BULLET_H,
    w: PLAYER_BULLET_W,
    h: PLAYER_BULLET_H,
  };
  g.events.shot++;
  return g;
};

export const togglePause = (g) => {
  if (g.status === 'playing') g.status = 'paused';
  else if (g.status === 'paused') g.status = 'playing';
  return g;
};

const aliveAliens = (g) => g.aliens.filter((a) => a.alive);

const aliensBounds = (alive) => {
  let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const a of alive) {
    if (a.x < minX) minX = a.x;
    if (a.x + ALIEN_W > maxX) maxX = a.x + ALIEN_W;
    if (a.y + ALIEN_H > maxY) maxY = a.y + ALIEN_H;
  }
  return { minX, maxX, maxY };
};

const stepAliens = (g) => {
  const alive = aliveAliens(g);
  if (alive.length === 0) return;

  const { minX, maxX } = aliensBounds(alive);
  let dropping = false;
  if (g.pendingDrop) {
    dropping = true;
    g.pendingDrop = false;
  } else {
    const nextLeft = minX + g.alienDir * ALIEN_STEP_X;
    const nextRight = maxX + g.alienDir * ALIEN_STEP_X;
    if (nextLeft < 0 || nextRight > FIELD_W) {
      // queue a drop next step + reverse direction NOW
      g.pendingDrop = true;
      g.alienDir = -g.alienDir;
    }
  }

  if (dropping) {
    for (const a of g.aliens) if (a.alive) a.y += ALIEN_STEP_Y;
  } else {
    for (const a of g.aliens) if (a.alive) a.x += g.alienDir * ALIEN_STEP_X;
  }

  g.alienStepPhase = (g.alienStepPhase + 1) % 4;
  g.alienAnimFrame = 1 - g.alienAnimFrame;
  g.events.alienStep++;
};

const pickShootingAlien = (g) => {
  // group by column, take bottom-most alive in a random column
  const byCol = new Map();
  for (const a of g.aliens) {
    if (!a.alive) continue;
    const cur = byCol.get(a.col);
    if (!cur || a.y > cur.y) byCol.set(a.col, a);
  }
  const cols = Array.from(byCol.values());
  if (cols.length === 0) return null;
  return cols[Math.floor(g.rng() * cols.length)];
};

const fireAlienBullet = (g) => {
  const shooter = pickShootingAlien(g);
  if (!shooter) return;
  g.alienBullets.push({
    x: shooter.x + ALIEN_W / 2 - ALIEN_BULLET_W / 2,
    y: shooter.y + ALIEN_H,
    w: ALIEN_BULLET_W,
    h: ALIEN_BULLET_H,
  });
};

// Erode a circular region of a bunker around (cx, cy) (bunker-local pixel coords).
const erodeBunker = (bunker, cx, cy, radius) => {
  const r2 = radius * radius;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy > r2) continue;
      const py = cy + dy, px = cx + dx;
      if (py < 0 || py >= BUNKER_H || px < 0 || px >= BUNKER_W) continue;
      bunker.pixels[py][px] = false;
    }
  }
};

// Returns true if the bullet collides with any solid pixel in any bunker, and
// erodes that bunker. Bullet rect is mutated/removed by caller.
const bulletHitsBunker = (g, bullet, fromAbove) => {
  for (const b of g.bunkers) {
    if (
      bullet.x + bullet.w <= b.x ||
      bullet.x >= b.x + BUNKER_W ||
      bullet.y + bullet.h <= b.y ||
      bullet.y >= b.y + BUNKER_H
    ) continue;
    // local pixel column of bullet center
    const lx = Math.floor(bullet.x + bullet.w / 2 - b.x);
    const range = fromAbove
      ? { from: 0, to: BUNKER_H - 1, step: 1 }
      : { from: BUNKER_H - 1, to: 0, step: -1 };
    for (let ly = range.from; range.step > 0 ? ly <= range.to : ly >= range.to; ly += range.step) {
      const localY = ly;
      const worldY = b.y + localY;
      if (worldY < bullet.y || worldY >= bullet.y + bullet.h) continue;
      if (lx < 0 || lx >= BUNKER_W) continue;
      if (b.pixels[localY][lx]) {
        erodeBunker(b, lx, localY, 3);
        return true;
      }
    }
  }
  return false;
};

// Sub-step bullets so fast bullets cannot tunnel through 8-px-tall aliens.
const MAX_STEP_PX = 4;

const handlePlayerBulletCollisions = (g) => {
  if (!g.playerBullet) return false;
  if (g.saucer && rectsOverlap(g.playerBullet, { x: g.saucer.x, y: g.saucer.y, w: SAUCER_W, h: SAUCER_H })) {
    const pts = SAUCER_POINTS[Math.floor(g.rng() * SAUCER_POINTS.length)];
    g.score += pts;
    g.saucerHitFlash = 600;
    g.events.saucerHit++;
    g.saucer = null;
    g.playerBullet = null;
    return true;
  }
  for (const a of g.aliens) {
    if (!a.alive) continue;
    if (rectsOverlap(g.playerBullet, { x: a.x, y: a.y, w: ALIEN_W, h: ALIEN_H })) {
      a.alive = false;
      g.score += ALIEN_POINTS[a.row];
      g.events.alienHit++;
      g.playerBullet = null;
      const remaining = g.aliens.reduce((s, x) => s + (x.alive ? 1 : 0), 0);
      g.alienStepInterval = stepIntervalFor(remaining, g.alienTotal);
      return true;
    }
  }
  if (bulletHitsBunker(g, g.playerBullet, false)) {
    g.playerBullet = null;
    return true;
  }
  return false;
};

const advancePlayerBullet = (g, dt) => {
  if (!g.playerBullet) return;
  let remaining = PLAYER_BULLET_SPEED * dt;
  while (g.playerBullet && remaining > 0) {
    const step = Math.min(MAX_STEP_PX, remaining);
    g.playerBullet.y -= step;
    remaining -= step;
    if (g.playerBullet.y + g.playerBullet.h < 0) { g.playerBullet = null; return; }
    if (handlePlayerBulletCollisions(g)) return;
  }
};

const advanceAlienBullets = (g, dt) => {
  // sub-step alien bullets too — symmetry, and prevents tunneling through bunkers/player.
  for (let i = g.alienBullets.length - 1; i >= 0; i--) {
    const b = g.alienBullets[i];
    let remaining = ALIEN_BULLET_SPEED * dt;
    while (remaining > 0) {
      const step = Math.min(MAX_STEP_PX, remaining);
      b.y += step;
      remaining -= step;
      if (b.y > FIELD_H) { g.alienBullets.splice(i, 1); break; }
      if (bulletHitsBunker(g, b, true)) { g.alienBullets.splice(i, 1); break; }
      if (g.playerAlive && rectsOverlap(b, g.player)) {
        g.alienBullets.splice(i, 1);
        g.playerAlive = false;
        g.lives -= 1;
        g.events.playerHit++;
        g.playerRespawnTimer = PLAYER_RESPAWN_MS;
        if (g.lives <= 0) g.status = 'over';
        break;
      }
    }
  }
};

const advanceSaucer = (g, dt) => {
  if (g.saucer) {
    g.saucer.x += g.saucer.dir * SAUCER_SPEED * dt;
    if (g.saucer.dir > 0 && g.saucer.x > FIELD_W) g.saucer = null;
    else if (g.saucer.dir < 0 && g.saucer.x + SAUCER_W < 0) g.saucer = null;
    return;
  }
  g.saucerTimer -= dt;
  if (g.saucerTimer <= 0) {
    const fromLeft = g.rng() < 0.5;
    g.saucer = {
      x: fromLeft ? -SAUCER_W : FIELD_W,
      y: SAUCER_Y,
      dir: fromLeft ? 1 : -1,
    };
    g.saucerTimer = SAUCER_INTERVAL_MIN + (SAUCER_INTERVAL_MAX - SAUCER_INTERVAL_MIN) * g.rng();
    g.events.saucerSpawn++;
  }
};

const startNextWave = (g) => {
  g.wave += 1;
  const offset = Math.min(64, (g.wave - 1) * 8);
  g.aliens = buildAliens(offset);
  g.alienTotal = g.aliens.length;
  g.alienDir = 1;
  g.alienStepTimer = 0;
  g.alienStepInterval = stepIntervalFor(g.alienTotal, g.alienTotal) * 0.92; // slight global creep
  g.alienStepPhase = 0;
  g.pendingDrop = false;
  g.alienBullets = [];
  g.playerBullet = null;
  g.events.waveClear++;
};

export const tick = (g, dt) => {
  if (g.status !== 'playing') return g;
  g.elapsedMs += dt;

  if (g.timeLimit != null && g.elapsedMs >= g.timeLimit) {
    g.status = 'over';
    return g;
  }

  // respawn timer
  if (!g.playerAlive && g.lives > 0) {
    g.playerRespawnTimer -= dt;
    if (g.playerRespawnTimer <= 0) {
      g.playerAlive = true;
      g.player.x = (FIELD_W - PLAYER_W) / 2;
    }
  }

  if (g.saucerHitFlash > 0) g.saucerHitFlash = Math.max(0, g.saucerHitFlash - dt);

  // alien step
  g.alienStepTimer += dt;
  while (g.alienStepTimer >= g.alienStepInterval && g.status === 'playing') {
    g.alienStepTimer -= g.alienStepInterval;
    stepAliens(g);
  }

  // alien shooting
  g.alienShootTimer -= dt;
  if (g.alienShootTimer <= 0 && aliveAliens(g).length > 0) {
    fireAlienBullet(g);
    g.alienShootTimer = ALIEN_SHOOT_MIN + (ALIEN_SHOOT_MAX - ALIEN_SHOOT_MIN) * g.rng();
  }

  advancePlayerBullet(g, dt);
  advanceAlienBullets(g, dt);
  advanceSaucer(g, dt);

  // alien reaches the floor — instant game over
  for (const a of g.aliens) {
    if (!a.alive) continue;
    if (a.y + ALIEN_H >= ALIEN_FLOOR_Y) {
      g.status = 'over';
      g.lives = 0;
      break;
    }
  }

  // wave clear
  if (g.status === 'playing' && aliveAliens(g).length === 0) {
    startNextWave(g);
  }

  return g;
};

// Event drain — called by React component once per frame to fire SFX, then resets counters.
export const drainEvents = (g) => {
  const e = { ...g.events };
  for (const k of Object.keys(g.events)) g.events[k] = 0;
  return e;
};

export const reset = (g) => createGame({ mode: g.mode, rng: g.rng });
