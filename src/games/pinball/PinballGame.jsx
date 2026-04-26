import { useEffect, useRef } from 'react';
import { PLAYFIELD_W, PLAYFIELD_H } from './engine.js';
import { flipperSegment } from './physics.js';

// Read CSS custom properties from the screen element so canvas matches the skin.
const readSkinColors = (el) => {
  if (!el) return {};
  const cs = getComputedStyle(el);
  return {
    fg: cs.getPropertyValue('--fg').trim() || '#ffffff',
    fgDim: cs.getPropertyValue('--fg-dim').trim() || '#888888',
    accent: cs.getPropertyValue('--accent').trim() || '#00ff88',
    accent2: cs.getPropertyValue('--accent-2').trim() || '#00e0ff',
    accent3: cs.getPropertyValue('--accent-3').trim() || '#ff00aa',
    bg: cs.getPropertyValue('--screen-bg').trim() || '#000000',
  };
};

const drawPlayfield = (ctx, state, colors, w, h) => {
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, w, h);

  const sx = w / PLAYFIELD_W;
  const sy = h / PLAYFIELD_H;
  ctx.save();
  ctx.scale(sx, sy);

  ctx.fillStyle = colors.fgDim;
  ctx.globalAlpha = 0.05;
  ctx.fillRect(0, 0, PLAYFIELD_W, PLAYFIELD_H);
  ctx.globalAlpha = 1;

  // Walls
  ctx.strokeStyle = colors.fgDim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const wseg of state.walls) {
    ctx.moveTo(wseg.x1, wseg.y1);
    ctx.lineTo(wseg.x2, wseg.y2);
  }
  ctx.stroke();

  // Bumpers
  for (const b of state.bumpers) {
    ctx.fillStyle = colors.accent3;
    ctx.beginPath();
    ctx.arc(b.cx, b.cy, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = colors.fg;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = colors.fg;
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.arc(b.cx - 3, b.cy - 3, b.r * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Slingshots — draw as filled triangles
  for (const sl of state.slingshots) {
    const s = sl.seg;
    ctx.fillStyle = colors.accent2;
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.lineTo(s.x1, s.y2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = colors.fg;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Drop targets
  for (const t of state.dropTargets) {
    if (t.down) {
      ctx.fillStyle = colors.fgDim;
      ctx.globalAlpha = 0.25;
      ctx.fillRect(t.x, t.y - 1, t.w, 2);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = colors.accent;
      ctx.fillRect(t.x, t.y - t.h, t.w, t.h);
      ctx.strokeStyle = colors.fg;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(t.x + 0.5, t.y - t.h + 0.5, t.w - 1, t.h - 1);
    }
  }

  // Flippers
  for (const side of ['left', 'right']) {
    const f = state.flippers[side];
    const seg = flipperSegment(f);
    ctx.strokeStyle = colors.accent;
    ctx.lineCap = 'round';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(seg.x1, seg.y1);
    ctx.lineTo(seg.x2, seg.y2);
    ctx.stroke();
    ctx.fillStyle = colors.fg;
    ctx.beginPath();
    ctx.arc(f.pivotX, f.pivotY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Plunger (visual rod)
  const plungerYOffset = state.status === 'waiting' ? state.plungerPull * 18 : 0;
  ctx.fillStyle = colors.fgDim;
  ctx.fillRect(PLAYFIELD_W - 30, PLAYFIELD_H - 18 + plungerYOffset, 16, 18);
  ctx.strokeStyle = colors.fg;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(PLAYFIELD_W - 30 + 0.5, PLAYFIELD_H - 18 + plungerYOffset + 0.5, 15, 17);

  // Ball
  const ball = state.ball;
  ctx.fillStyle = colors.fg;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(ball.x - 2.5, ball.y - 2.5, ball.r * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Bonus flash overlay
  if (state.bonusFlash > 0) {
    const a = Math.min(0.35, state.bonusFlash / 3000);
    ctx.fillStyle = colors.accent;
    ctx.globalAlpha = a;
    ctx.fillRect(0, 0, PLAYFIELD_W, PLAYFIELD_H);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
};

export const PinballScreen = ({ state, highScore = 0, onAction }) => {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (canvas && wrap) {
        const dpr = window.devicePixelRatio || 1;
        const rect = wrap.getBoundingClientRect();
        const w = Math.max(80, rect.width);
        const h = Math.max(120, rect.height);
        if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
          canvas.width = Math.floor(w * dpr);
          canvas.height = Math.floor(h * dpr);
          canvas.style.width = `${w}px`;
          canvas.style.height = `${h}px`;
        }
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const colors = readSkinColors(wrap);
        drawPlayfield(ctx, state, colors, w, h);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [state]);

  return (
    <div className="pinball-screen">
      <div className="pinball-hud-top">
        <div className="hud-block">
          <div className="hud-label">SCORE</div>
          <div className="hud-value">{state.score}</div>
        </div>
        <div className="hud-block">
          <div className="hud-label">BALLS</div>
          <div className="hud-value">{state.ballsRemaining}</div>
        </div>
        <div className="hud-block">
          <div className="hud-label">HI</div>
          <div className="hud-value">{Math.max(highScore, state.score)}</div>
        </div>
      </div>

      <div className="pinball-table-wrap" ref={wrapRef}>
        <canvas ref={canvasRef} className="pinball-canvas" />
      </div>

      {state.status === 'waiting' && (
        <div className="pinball-hint">hold B / SPACE to pull plunger · release to launch</div>
      )}
      {state.status === 'paused' && (
        <Overlay title="PAUSED" subtitle="press start to resume" />
      )}
      {state.status === 'over' && (
        <Overlay
          title="GAME OVER"
          subtitle={`score ${state.score}`}
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
  <div className="pinball-overlay">
    <div className="pinball-overlay-title">{title}</div>
    {subtitle && <div className="pinball-overlay-sub">{subtitle}</div>}
    {actions && <div className="pinball-overlay-actions">{actions}</div>}
  </div>
);
