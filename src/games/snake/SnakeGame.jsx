import { useEffect, useReducer, useRef, useState } from 'react';
import { createGame, changeDirection, tick, togglePause } from './engine.js';
import { snakeAudio } from './audio.js';

const HIGH_SCORE_KEY = 'snake.highScore';

export const SNAKE_MODES = [
  { id: 'classic', name: 'CLASSIC', desc: 'walls bite · grow forever' },
  { id: 'wraparound', name: 'WRAPAROUND', desc: 'walls warp · only you can stop you' },
];

const reducer = (state, action) => {
  switch (action.type) {
    case 'NEW': return createGame({ mode: action.mode ?? state.mode });
    case 'TICK': return tick(state);
    case 'DIR': return changeDirection(state, action.dir);
    case 'PAUSE': return togglePause(state);
    case 'RESET': return createGame({ mode: state.mode });
    default: return state;
  }
};

const readHighScore = () => {
  try {
    const v = parseInt(localStorage.getItem(HIGH_SCORE_KEY) ?? '0', 10);
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch { return 0; }
};

const writeHighScore = (v) => {
  try { localStorage.setItem(HIGH_SCORE_KEY, String(v)); } catch { /* ignore */ }
};

export const useSnake = (mode = 'classic') => {
  const [state, dispatch] = useReducer(reducer, undefined, () => createGame({ mode }));
  const stateRef = useRef(state);
  stateRef.current = state;

  // Game loop driven by state.interval (ms per tick). RAF for smooth pacing
  // while still respecting the interval for actual moves.
  useEffect(() => {
    let raf = 0;
    let lastTickAt = performance.now();
    const loop = (t) => {
      const s = stateRef.current;
      if (s.status === 'playing' && t - lastTickAt >= s.interval) {
        lastTickAt = t;
        dispatch({ type: 'TICK' });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // SFX hooks (eat / level-up / game-over) — fire on transitions
  const lastFoods = useRef(0);
  const lastInterval = useRef(state.interval);
  const lastStatus = useRef(state.status);
  useEffect(() => {
    if (state.foodsEaten > lastFoods.current) {
      snakeAudio.sfxEat();
      lastFoods.current = state.foodsEaten;
    }
    if (state.interval < lastInterval.current) {
      snakeAudio.sfxLevelUp();
    }
    lastInterval.current = state.interval;
    if (state.status === 'over' && lastStatus.current !== 'over') {
      snakeAudio.sfxGameOver();
    }
    lastStatus.current = state.status;
  }, [state.foodsEaten, state.interval, state.status]);

  return { state, dispatch };
};

const drawBoard = (canvas, state) => {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  const targetW = Math.floor(cssW * dpr);
  const targetH = Math.floor(cssH * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Resolve CSS variables to concrete colors so canvas can use them.
  const styles = getComputedStyle(canvas);
  const cBody = styles.getPropertyValue('--snake-body').trim() || styles.getPropertyValue('--accent').trim() || '#00ff88';
  const cHead = styles.getPropertyValue('--snake-head').trim() || styles.getPropertyValue('--accent-2').trim() || cBody;
  const cFood = styles.getPropertyValue('--snake-food').trim() || styles.getPropertyValue('--accent-3').trim() || '#ff00aa';
  const cGrid = styles.getPropertyValue('--snake-grid').trim() || 'rgba(255,255,255,0.05)';
  const cBg = styles.getPropertyValue('--snake-bg').trim() || 'rgba(0,0,0,0.5)';

  const w = canvas.width;
  const h = canvas.height;
  const cell = Math.floor(Math.min(w / state.cols, h / state.rows));
  const offX = Math.floor((w - cell * state.cols) / 2);
  const offY = Math.floor((h - cell * state.rows) / 2);

  ctx.fillStyle = cBg;
  ctx.fillRect(0, 0, w, h);

  // Subtle grid
  ctx.strokeStyle = cGrid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= state.cols; x++) {
    const px = offX + x * cell + 0.5;
    ctx.moveTo(px, offY);
    ctx.lineTo(px, offY + cell * state.rows);
  }
  for (let y = 0; y <= state.rows; y++) {
    const py = offY + y * cell + 0.5;
    ctx.moveTo(offX, py);
    ctx.lineTo(offX + cell * state.cols, py);
  }
  ctx.stroke();

  // Food (rounded square + inner highlight)
  if (state.food) {
    const fx = offX + state.food.x * cell;
    const fy = offY + state.food.y * cell;
    ctx.fillStyle = cFood;
    const inset = Math.max(2, Math.floor(cell * 0.18));
    roundRect(ctx, fx + inset, fy + inset, cell - inset * 2, cell - inset * 2, Math.floor(cell * 0.25));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.arc(fx + cell * 0.4, fy + cell * 0.35, Math.max(1.5, cell * 0.08), 0, Math.PI * 2);
    ctx.fill();
  }

  // Snake — body, then head on top
  for (let i = state.snake.length - 1; i >= 0; i--) {
    const seg = state.snake[i];
    const sx = offX + seg.x * cell;
    const sy = offY + seg.y * cell;
    const isHead = i === 0;
    ctx.fillStyle = isHead ? cHead : cBody;
    const pad = Math.max(1, Math.floor(cell * 0.08));
    roundRect(ctx, sx + pad, sy + pad, cell - pad * 2, cell - pad * 2, Math.floor(cell * 0.22));
    ctx.fill();
    if (isHead) {
      // Eye on head facing direction
      ctx.fillStyle = '#0a0c0e';
      const eyeR = Math.max(1, cell * 0.08);
      const cx = sx + cell / 2;
      const cy = sy + cell / 2;
      const dir = state.direction;
      const off = cell * 0.22;
      const e1 = { x: cx, y: cy };
      const e2 = { x: cx, y: cy };
      if (dir === 'right') { e1.x += off; e1.y -= off * 0.6; e2.x += off; e2.y += off * 0.6; }
      else if (dir === 'left') { e1.x -= off; e1.y -= off * 0.6; e2.x -= off; e2.y += off * 0.6; }
      else if (dir === 'up') { e1.y -= off; e1.x -= off * 0.6; e2.y -= off; e2.x += off * 0.6; }
      else { e1.y += off; e1.x -= off * 0.6; e2.y += off; e2.x += off * 0.6; }
      ctx.beginPath();
      ctx.arc(e1.x, e1.y, eyeR, 0, Math.PI * 2);
      ctx.arc(e2.x, e2.y, eyeR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};

const roundRect = (ctx, x, y, w, h, r) => {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
};

export const SnakeScreen = ({ state, onAction }) => {
  const canvasRef = useRef(null);
  const [highScore, setHighScore] = useState(readHighScore);

  // Persist new high score whenever the running game beats it.
  useEffect(() => {
    if (state.score > highScore) {
      setHighScore(state.score);
      writeHighScore(state.score);
    }
  }, [state.score, highScore]);

  // Re-paint canvas on every state change.
  useEffect(() => {
    drawBoard(canvasRef.current, state);
  }, [state]);

  // Keep canvas crisp on resize
  useEffect(() => {
    const onResize = () => drawBoard(canvasRef.current, state);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [state]);

  return (
    <div className={`snake-screen mode-${state.mode}`}>
      <div className="snake-hud">
        <div className="snake-hud-block">
          <div className="snake-hud-label">SCORE</div>
          <div className="snake-hud-value">{state.score}</div>
        </div>
        <div className="snake-hud-block right">
          <div className="snake-hud-label">BEST</div>
          <div className="snake-hud-value">{highScore}</div>
        </div>
      </div>

      <div className="snake-board-wrap">
        <canvas ref={canvasRef} className="snake-canvas" aria-label="Snake board" />
      </div>

      <div className="snake-hud-bottom">
        <span className="snake-hud-mode">{state.mode === 'wraparound' ? 'WRAP' : 'CLASSIC'}</span>
        <span className="snake-hud-len">LEN {state.snake.length}</span>
      </div>

      {state.status === 'paused' && (
        <SnakeOverlay title="PAUSED" subtitle="press start to resume" />
      )}
      {state.status === 'over' && (
        <SnakeOverlay
          title="GAME OVER"
          subtitle={`score ${state.score} · best ${highScore}`}
          actions={
            <>
              <button onClick={() => onAction('reset')}>retry</button>
              <button onClick={() => onAction('menu')}>menu</button>
            </>
          }
          hint="press A to play again"
        />
      )}
    </div>
  );
};

const SnakeOverlay = ({ title, subtitle, actions, hint }) => (
  <div className="snake-overlay">
    <div className="snake-overlay-title">{title}</div>
    {subtitle && <div className="snake-overlay-sub">{subtitle}</div>}
    {actions && <div className="snake-overlay-actions">{actions}</div>}
    {hint && <div className="snake-overlay-hint">{hint}</div>}
  </div>
);
