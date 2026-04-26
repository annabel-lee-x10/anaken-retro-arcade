import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createGame, movePlayer, playerShoot, togglePause, tick, drainEvents,
  FIELD_W, FIELD_H, ALIEN_W, BUNKER_W, BUNKER_H, ALIEN_FLOOR_Y,
} from './engine.js';
import { invadersAudio } from './audio.js';

// ---------- alien sprite shapes (8x8, low-fi pixel art) ----------
// Two animation frames per type. Encoded as strings of 'X' / '.'.
const ALIEN_SPRITES = [
  // Type 0 — top row "squid" (30 pts)
  [
    [
      '..XXXX..',
      '.XXXXXX.',
      'XXXXXXXX',
      'XX.XX.XX',
      'XXXXXXXX',
      '..X..X..',
      '.X.XX.X.',
      'X.X..X.X',
    ],
    [
      '..XXXX..',
      '.XXXXXX.',
      'XXXXXXXX',
      'XX.XX.XX',
      'XXXXXXXX',
      '.X.XX.X.',
      'X.X..X.X',
      '.X....X.',
    ],
  ],
  // Type 1 — middle "crab" (20 pts)
  [
    [
      'X..XX..X',
      '.X.XX.X.',
      'XXXXXXXX',
      'XX.XX.XX',
      'XXXXXXXX',
      '.XXXXXX.',
      'X.X..X.X',
      '.X....X.',
    ],
    [
      '.X.XX.X.',
      '..XXXX..',
      '.XXXXXX.',
      'XX.XX.XX',
      'XXXXXXXX',
      '.XXXXXX.',
      'X......X',
      '.X....X.',
    ],
  ],
  // Type 2 — bottom "octopus" (10 pts)
  [
    [
      '..XXXX..',
      '.XXXXXX.',
      'XX.XX.XX',
      'XXXXXXXX',
      '.XXXXXX.',
      '.X.XX.X.',
      'X.X..X.X',
      '.X....X.',
    ],
    [
      '..XXXX..',
      '.XXXXXX.',
      'XX.XX.XX',
      'XXXXXXXX',
      '.XXXXXX.',
      'X.X..X.X',
      'X.X..X.X',
      '.XX..XX.',
    ],
  ],
];

const PLAYER_SPRITE = [
  '.......XX.......',
  '......XXXX......',
  '......XXXX......',
  '.XXXXXXXXXXXXXX.',
  'XXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXX',
];

const SAUCER_SPRITE = [
  '...XXXXXXXXXX...',
  '..XXXXXXXXXXXX..',
  '.XX.XX.XX.XX.XX.',
  'XXXXXXXXXXXXXXXX',
  '..XX..XX..XX..XX',
  '...X........X...',
  '..XX........XX..',
];

// ---------- reducer ----------
const reducer = (state, action) => {
  switch (action.type) {
    case 'TICK':  tick(state, action.dt); return state;
    case 'MOVE':  movePlayer(state, action.dx); return state;
    case 'SHOOT': playerShoot(state); return state;
    case 'PAUSE': togglePause(state); return state;
    case 'RESET': return createGame({ mode: state.mode });
    default: return state;
  }
};

// dev / verification hook — exposed for testing in headless previews
// where rAF is throttled. Unused in production.
const exposeDebug = (engine) => {
  if (typeof window === 'undefined') return;
  window.__invaders = engine;
};

// ---------- React hook ----------
export const useInvaders = (mode = 'classic') => {
  // Engine is a stable mutable object (lives on the first useState). Re-renders
  // are driven by a counter bumped every tick / dispatch.
  const [engine] = useState(() => createGame({ mode }));
  const [, force] = useState(0);
  exposeDebug(engine);

  const dispatch = useCallback((action) => {
    if (action.type === 'RESET') {
      Object.assign(engine, createGame({ mode: engine.mode }));
      exposeDebug(engine);
    } else {
      reducer(engine, action);
    }
    force((x) => x + 1);
  }, [engine]);

  // game loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (t) => {
      const dt = Math.min(48, t - last);
      last = t;
      if (engine.status === 'playing') {
        tick(engine, dt);
        const ev = drainEvents(engine);
        if (ev.shot) invadersAudio.sfxShoot();
        if (ev.alienHit) invadersAudio.sfxAlienHit();
        if (ev.playerHit) invadersAudio.sfxPlayerHit();
        for (let i = 0; i < ev.alienStep; i++) invadersAudio.sfxAlienStep(engine.alienStepPhase);
        if (ev.saucerSpawn) invadersAudio.sfxSaucer();
        if (ev.saucerHit) invadersAudio.sfxSaucerHit();
        if (ev.waveClear) invadersAudio.sfxWaveClear();
        if (engine.status === 'over') invadersAudio.sfxGameOver();
        force((x) => x + 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [engine]);

  return { state: engine, dispatch };
};

// ---------- canvas rendering ----------
const drawSprite = (ctx, sprite, x, y, scale, color) => {
  ctx.fillStyle = color;
  for (let r = 0; r < sprite.length; r++) {
    const row = sprite[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c] === 'X') ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
    }
  }
};

const draw = (ctx, state, theme, dpr) => {
  const w = FIELD_W * theme.scale * dpr;
  const h = FIELD_H * theme.scale * dpr;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.scale(theme.scale * dpr, theme.scale * dpr);

  // ground line
  ctx.fillStyle = theme.line;
  ctx.fillRect(0, ALIEN_FLOOR_Y + 4, FIELD_W, 1);

  // bunkers
  for (const b of state.bunkers) {
    ctx.fillStyle = theme.bunker;
    for (let r = 0; r < BUNKER_H; r++) {
      for (let c = 0; c < BUNKER_W; c++) {
        if (b.pixels[r][c]) ctx.fillRect(b.x + c, b.y + r, 1, 1);
      }
    }
  }

  // aliens
  const frame = state.alienAnimFrame;
  for (const a of state.aliens) {
    if (!a.alive) continue;
    const sprite = ALIEN_SPRITES[a.type][frame];
    const color = theme.aliens[a.type] ?? theme.aliens[0];
    // sprites are 8 wide; engine alien is 12 wide → render at 1.5 px/cell
    drawSprite(ctx, sprite, a.x + (ALIEN_W - 12) / 2, a.y, 1.5, color);
  }

  // saucer
  if (state.saucer) {
    drawSprite(ctx, SAUCER_SPRITE, state.saucer.x, state.saucer.y, 1, theme.saucer);
  }

  // player
  if (state.playerAlive) {
    drawSprite(ctx, PLAYER_SPRITE, state.player.x, state.player.y, 1, theme.player);
  } else if (state.lives > 0) {
    // death flicker
    const flicker = Math.floor(state.elapsedMs / 80) % 2 === 0;
    ctx.fillStyle = flicker ? theme.alert : theme.player;
    for (let r = 0; r < PLAYER_SPRITE.length; r++) {
      const row = PLAYER_SPRITE[r];
      for (let c = 0; c < row.length; c++) {
        if (row[c] === 'X' && Math.random() < 0.6) ctx.fillRect(state.player.x + c, state.player.y + r, 1, 1);
      }
    }
  }

  // bullets
  if (state.playerBullet) {
    ctx.fillStyle = theme.playerBullet;
    ctx.fillRect(state.playerBullet.x, state.playerBullet.y, state.playerBullet.w, state.playerBullet.h);
  }
  ctx.fillStyle = theme.alienBullet;
  for (const b of state.alienBullets) {
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }

  ctx.restore();
};

const readTheme = (host) => {
  const cs = getComputedStyle(host);
  const get = (v, fb) => (cs.getPropertyValue(v).trim() || fb);
  return {
    bg: 'transparent',
    line: get('--accent', '#0f0'),
    aliens: [
      get('--inv-alien-top', get('--accent', '#0f0')),
      get('--inv-alien-mid', get('--accent-2', '#0ff')),
      get('--inv-alien-bot', get('--accent-3', '#f0f')),
    ],
    saucer: get('--inv-saucer', get('--accent-3', '#ff0')),
    player: get('--inv-player', get('--accent', '#0f0')),
    playerBullet: get('--inv-bullet', '#fff'),
    alienBullet: get('--inv-alien-bullet', get('--accent-3', '#f0f')),
    bunker: get('--inv-bunker', get('--accent', '#0f0')),
    alert: get('--accent-3', '#f55'),
    scale: 1,
  };
};

// ---------- screen component ----------
export const InvadersScreen = ({ state, onAction }) => {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  // size canvas to its container preserving aspect ratio, then redraw
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const fit = () => {
      const { width, height } = wrap.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      const aspect = FIELD_W / FIELD_H;
      let w = width, h = width / aspect;
      if (h > height) { h = height; w = height * aspect; }
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = `${Math.floor(w)}px`;
      canvas.style.height = `${Math.floor(h)}px`;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.dataset.dpr = String(dpr);
      canvas.dataset.scale = String(w / FIELD_W);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    window.addEventListener('resize', fit);
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); };
  }, []);

  // redraw on every state change (engine tick force-renders us)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const dpr = parseFloat(canvas.dataset.dpr || '1');
    const scale = parseFloat(canvas.dataset.scale || '1');
    const theme = readTheme(canvas);
    theme.scale = scale;
    draw(ctx, state, theme, dpr);
  });

  return (
    <div className="invaders-screen">
      <div className="invaders-hud">
        <div className="hud-block">
          <div className="hud-label">SCORE</div>
          <div className="hud-value">{state.score}</div>
        </div>
        <div className="hud-block">
          <div className="hud-label">{state.mode === 'attack' ? 'TIME' : 'WAVE'}</div>
          <div className="hud-value">
            {state.mode === 'attack'
              ? formatMs(Math.max(0, (state.timeLimit ?? 0) - state.elapsedMs))
              : state.wave}
          </div>
        </div>
        <div className="hud-block">
          <div className="hud-label">LIVES</div>
          <div className="hud-value lives-row">
            {Array.from({ length: state.lives }).map((_, i) => (
              <span key={i} className="life-pip" aria-hidden="true">▲</span>
            ))}
          </div>
        </div>
      </div>

      <div className="invaders-stage" ref={wrapRef}>
        <canvas ref={canvasRef} className="invaders-canvas" />
      </div>

      {state.status === 'paused' && (
        <Overlay title="PAUSED" subtitle="press start to resume" />
      )}
      {state.status === 'over' && (
        <Overlay
          title={state.mode === 'attack' ? "TIME'S UP" : 'GAME OVER'}
          subtitle={`score ${state.score} · wave ${state.wave}`}
          actions={
            <>
              <button onClick={() => onAction('reset')}>retry</button>
              <button onClick={() => onAction('menu')}>menu</button>
            </>
          }
        />
      )}
    </div>
  );
};

const Overlay = ({ title, subtitle, actions }) => (
  <div className="invaders-overlay">
    <div className="invaders-overlay-title">{title}</div>
    {subtitle && <div className="invaders-overlay-sub">{subtitle}</div>}
    {actions && <div className="invaders-overlay-actions">{actions}</div>}
  </div>
);

const formatMs = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};
