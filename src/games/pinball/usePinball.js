// Pinball React hook — owns the reducer, game loop, audio dispatch, and high
// score persistence. Lives in its own file so PinballGame.jsx remains a
// pure-component module (satisfies react-refresh fast-refresh).

import { useEffect, useReducer, useRef, useState } from 'react';
import {
  createGame, tick, togglePause, setFlipper, pullPlunger, releasePlunger,
} from './engine.js';
import { pinballAudio } from './audio.js';

const HIGH_SCORE_KEY = 'arcade.pinball.highscore';

const reducer = (state, action) => {
  switch (action.type) {
    case 'NEW': return createGame({ mode: action.mode });
    case 'TICK': return tick(state, action.dt);
    case 'FLIPPER': return setFlipper(state, action.side, action.up);
    case 'PLUNGER_PULL': return pullPlunger(state, action.dt);
    case 'PLUNGER_RELEASE': return releasePlunger(state);
    case 'PAUSE': return togglePause(state);
    case 'RESET': return createGame({ mode: state.mode });
    default: return state;
  }
};

export const usePinball = (mode = 'classic') => {
  const [state, dispatch] = useReducer(reducer, undefined, () => createGame({ mode }));
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  const plungerHeldRef = useRef(false);

  // Game loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (t) => {
      const dt = Math.min(48, t - last);
      last = t;
      const s = stateRef.current;
      if (s.status === 'playing') {
        dispatch({ type: 'TICK', dt });
      } else if (s.status === 'waiting') {
        if (plungerHeldRef.current) {
          dispatch({ type: 'PLUNGER_PULL', dt });
        }
        dispatch({ type: 'TICK', dt });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // SFX dispatch — react to lastEvent changes
  const lastEventStampRef = useRef(0);
  useEffect(() => {
    const ev = state.lastEvent;
    if (!ev) return;
    const stamp = `${ev}|${state.score}|${state.ballsRemaining}|${state.status}`;
    if (lastEventStampRef.current === stamp) return;
    lastEventStampRef.current = stamp;
    switch (ev) {
      case 'bumper': pinballAudio.sfxBumper(); break;
      case 'sling': pinballAudio.sfxSling(); break;
      case 'drop': pinballAudio.sfxDrop(); break;
      case 'bonus': pinballAudio.sfxBonus(); break;
      case 'plunger': pinballAudio.sfxPlunger(); break;
      case 'drain': pinballAudio.sfxDrain(); break;
      case 'over': pinballAudio.sfxGameOver(); break;
      case 'flipper': pinballAudio.sfxFlipper(); break;
      default: break;
    }
  }, [state.lastEvent, state.score, state.ballsRemaining, state.status]);

  // High score: read once on mount; persist on score gains. Displayed HI uses
  // max(highScore, state.score), so the running game can exceed the loaded
  // value mid-session and the new max is picked up by the next game.
  const [initialHigh] = useState(() => parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10));
  useEffect(() => {
    if (state.score > initialHigh) {
      localStorage.setItem(HIGH_SCORE_KEY, String(state.score));
    }
  }, [state.score, initialHigh]);

  return { state, dispatch, plungerHeldRef, highScore: initialHigh };
};
