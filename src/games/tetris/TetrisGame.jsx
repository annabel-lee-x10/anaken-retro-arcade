import { useEffect, useReducer, useRef, useState } from 'react';
import {
  createGame, move, rotate, softDrop, hardDrop, hold,
  tick, togglePause, ghostY, getNext, clampDt,
} from './engine.js';
import { getCells, getColor, PIECE_TYPES } from './pieces.js';
import { ROWS, COLS } from './board.js';
import { tetrisAudio } from './audio.js';

const PIECE_COLORS = PIECE_TYPES.map((t) => getColor(t));

const reducer = (state, action) => {
  switch (action.type) {
    case 'NEW': return createGame({ mode: action.mode });
    case 'TICK': return tick(state, action.dt);
    case 'MOVE': return move(state, action.dx);
    case 'ROTATE': return rotate(state, action.dir);
    case 'SOFT': return softDrop(state);
    case 'HARD': return hardDrop(state);
    case 'HOLD': return hold(state);
    case 'PAUSE': return togglePause(state);
    case 'RESET': return createGame({ mode: state.mode });
    default: return state;
  }
};

const formatMs = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  const cs = Math.floor((Math.max(0, ms) % 1000) / 10);
  return `${m}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
};

// expose actions via ref so controller buttons can dispatch
export const useTetris = (mode = 'classic') => {
  const [state, dispatch] = useReducer(reducer, undefined, () => createGame({ mode }));
  const stateRef = useRef(state);
  stateRef.current = state;

  // Game loop. dt is clamped so a backgrounded tab returning doesn't dump
  // a giant accumulated delta into the gravity loop (which would lock several
  // pieces in one frame — the "random blocks dropping" bug).
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (t) => {
      const dt = clampDt(t - last);
      last = t;
      if (stateRef.current.status === 'playing') {
        dispatch({ type: 'TICK', dt });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // SFX hooks
  const lastLines = useRef(0);
  const lastLevel = useRef(1);
  // Init to null (not state.status) so the very first 'playing' render is
  // detected as a transition and music starts on first game start. Otherwise
  // music only kicks in after the first pause/unpause cycle.
  const lastStatus = useRef(null);
  useEffect(() => {
    if (state.lines > lastLines.current) {
      const cleared = state.lines - lastLines.current;
      tetrisAudio.sfxClear(cleared);
      lastLines.current = state.lines;
    }
    if (state.level > lastLevel.current) {
      tetrisAudio.sfxLevelUp();
      lastLevel.current = state.level;
    }
    if (state.status === 'over' && lastStatus.current !== 'over') {
      tetrisAudio.sfxGameOver();
      tetrisAudio.stopMusic();
    }
    if (state.status === 'paused' && lastStatus.current === 'playing') {
      tetrisAudio.stopMusic();
    }
    if (state.status === 'playing' && lastStatus.current !== 'playing') {
      tetrisAudio.startMusic();
    }
    lastStatus.current = state.status;
  }, [state.lines, state.level, state.status]);

  return { state, dispatch };
};

// Compose board + current piece + ghost into a render grid
const buildRenderGrid = (state) => {
  const grid = state.board.map((row) => row.slice());
  if (!state.current) return { grid, ghostCells: [] };
  const c = state.current;
  // ghost first
  const gy = ghostY(state);
  const ghostCells = getCells(c.type, c.rot, c.x, gy);
  // overlay current piece (color index)
  const colorIdx = PIECE_TYPES.indexOf(c.type) + 1;
  for (const [r, col] of getCells(c.type, c.rot, c.x, c.y)) {
    if (r >= 0 && r < ROWS && col >= 0 && col < COLS) grid[r][col] = colorIdx;
  }
  return { grid, ghostCells };
};

export const TetrisScreen = ({ state, onAction }) => {
  const { grid, ghostCells } = buildRenderGrid(state);
  const ghostSet = new Set(ghostCells.map(([r, c]) => `${r},${c}`));

  return (
    <div className="tetris-screen">
      <div className="tetris-hud-top">
        <div className="hud-block">
          <div className="hud-label">SCORE</div>
          <div className="hud-value">{state.score}</div>
        </div>
        <div className="hud-block">
          <div className="hud-label">{state.mode === 'sprint' ? 'LINES LEFT' : state.mode === 'ultra' ? 'TIME' : 'LINES'}</div>
          <div className="hud-value">
            {state.mode === 'sprint'
              ? Math.max(0, (state.sprintGoal ?? 40) - state.lines)
              : state.mode === 'ultra'
              ? formatMs(Math.max(0, (state.ultraLimit ?? 0) - state.elapsedMs))
              : state.lines}
          </div>
        </div>
        <div className="hud-block">
          <div className="hud-label">LV</div>
          <div className="hud-value">{state.level}</div>
        </div>
      </div>

      <div className="tetris-playfield-wrap">
        <div className="tetris-side tetris-hold">
          <div className="hud-mini">HOLD</div>
          <PieceMini type={state.holdPiece} dim={state.holdUsed} />
        </div>
        <div className="tetris-board" role="grid" aria-label="Tetris board">
          {grid.map((row, r) => (
            row.map((cell, c) => {
              const key = `${r},${c}`;
              const isGhost = !cell && ghostSet.has(key);
              const color = cell ? PIECE_COLORS[cell - 1] : null;
              return (
                <div
                  key={key}
                  className={`cell${cell ? ' filled' : ''}${isGhost ? ' ghost' : ''}`}
                  style={cell ? { background: color, '--cell-color': color } : isGhost ? { '--cell-color': PIECE_COLORS[(PIECE_TYPES.indexOf(state.current.type))] } : undefined}
                />
              );
            })
          ))}
        </div>
        <div className="tetris-side tetris-next">
          <div className="hud-mini">NEXT</div>
          {getNext(state, 3).map((t, i) => (
            <PieceMini key={`${t}-${i}`} type={t} />
          ))}
        </div>
      </div>

      {state.status === 'paused' && (
        <Overlay title="PAUSED" subtitle="press start to resume" />
      )}
      {state.status === 'over' && (
        <Overlay
          title={state.mode === 'sprint' && state.lines >= (state.sprintGoal ?? 40) ? 'CLEAR!' : 'GAME OVER'}
          subtitle={
            state.mode === 'sprint' && state.lines >= (state.sprintGoal ?? 40)
              ? `time ${formatMs(state.elapsedMs)}`
              : `score ${state.score}`
          }
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

const PieceMini = ({ type, dim }) => {
  if (!type) return <div className="piece-mini empty" />;
  const cells = getCells(type, 0, 0, 0);
  const color = getColor(type);
  // normalize to small bbox
  const minR = Math.min(...cells.map((c) => c[0]));
  const maxR = Math.max(...cells.map((c) => c[0]));
  const minC = Math.min(...cells.map((c) => c[1]));
  const maxC = Math.max(...cells.map((c) => c[1]));
  const h = maxR - minR + 1;
  const w = maxC - minC + 1;
  const set = new Set(cells.map(([r, c]) => `${r - minR},${c - minC}`));
  return (
    <div className={`piece-mini${dim ? ' dim' : ''}`} style={{ '--mini-cols': w, '--mini-rows': h }}>
      {Array.from({ length: h }).map((_, r) => (
        Array.from({ length: w }).map((_, c) => (
          <div
            key={`${r},${c}`}
            className={`mini-cell${set.has(`${r},${c}`) ? ' on' : ''}`}
            style={set.has(`${r},${c}`) ? { background: color } : undefined}
          />
        ))
      ))}
    </div>
  );
};

const Overlay = ({ title, subtitle, actions }) => (
  <div className="tetris-overlay">
    <div className="tetris-overlay-title">{title}</div>
    {subtitle && <div className="tetris-overlay-sub">{subtitle}</div>}
    {actions && <div className="tetris-overlay-actions">{actions}</div>}
  </div>
);
