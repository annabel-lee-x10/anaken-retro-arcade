import { useCallback, useEffect, useState } from 'react';
import { TopBar } from './components/TopBar.jsx';
import { Controller } from './components/Controller.jsx';
import { Screen } from './components/Screen.jsx';
import { ModeSelect } from './components/ModeSelect.jsx';
import { TetrisScreen, useTetris } from './games/tetris/TetrisGame.jsx';
import { tetrisAudio } from './games/tetris/audio.js';
import './App.css';

const SKIN_KEY = 'arcade.skin';
const MUTE_KEY = 'arcade.muted';

export default function App() {
  const [skin, setSkin] = useState(() => localStorage.getItem(SKIN_KEY) || 'neon');
  const [muted, setMuted] = useState(() => localStorage.getItem(MUTE_KEY) === '1');
  const [mode, setMode] = useState(null); // null = mode select screen

  useEffect(() => {
    document.body.dataset.skin = skin;
    localStorage.setItem(SKIN_KEY, skin);
  }, [skin]);

  useEffect(() => {
    tetrisAudio.setMuted(muted);
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  }, [muted]);

  const cycleSkin = useCallback((next) => {
    setSkin(next);
  }, []);

  const initAudio = useCallback(() => {
    tetrisAudio.init();
    tetrisAudio.resume();
  }, []);

  return (
    <div className="device-shell skin-bg" onPointerDown={initAudio}>
      <div className="device-frame">
        <TopBar
          skin={skin}
          onSkin={cycleSkin}
          muted={muted}
          onMute={() => setMuted((m) => !m)}
        />
        <Screen>
          {mode == null ? (
            <ModeSelect onPick={(m) => { initAudio(); setMode(m); }} />
          ) : (
            <Game key={mode} mode={mode} onMenu={() => setMode(null)} />
          )}
        </Screen>
        <ControllerBound mode={mode} />
        <div className="skin-grain" />
      </div>
    </div>
  );
}

// Bridge between game state + controller buttons + keyboard.
// Game lives inside the Screen; the controller dispatches via a window-scoped ref.

function Game({ mode, onMenu }) {
  const { state, dispatch } = useTetris(mode);
  // expose dispatch globally so the controller (rendered as sibling) can talk to it
  useEffect(() => {
    window.__arcadeDispatch = dispatch;
    window.__arcadeState = state;
    return () => {
      if (window.__arcadeDispatch === dispatch) window.__arcadeDispatch = null;
    };
  });

  // keyboard
  useEffect(() => {
    const onKey = (e) => {
      const map = {
        ArrowLeft:  () => dispatch({ type: 'MOVE', dx: -1 }),
        ArrowRight: () => dispatch({ type: 'MOVE', dx: 1 }),
        ArrowDown:  () => dispatch({ type: 'SOFT' }),
        ArrowUp:    () => dispatch({ type: 'HARD' }),
        ' ':        () => dispatch({ type: 'HARD' }),
        x:          () => dispatch({ type: 'ROTATE', dir: 1 }),
        X:          () => dispatch({ type: 'ROTATE', dir: 1 }),
        z:          () => dispatch({ type: 'ROTATE', dir: -1 }),
        Z:          () => dispatch({ type: 'ROTATE', dir: -1 }),
        c:          () => dispatch({ type: 'HOLD' }),
        C:          () => dispatch({ type: 'HOLD' }),
        Enter:      () => dispatch({ type: 'PAUSE' }),
        p:          () => dispatch({ type: 'PAUSE' }),
        P:          () => dispatch({ type: 'PAUSE' }),
      };
      const fn = map[e.key];
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);

  return (
    <TetrisScreen
      state={state}
      onAction={(a) => {
        if (a === 'reset') dispatch({ type: 'RESET' });
        if (a === 'menu') onMenu();
      }}
    />
  );
}

function ControllerBound({ mode }) {
  const send = (type, payload = {}) => {
    const d = window.__arcadeDispatch;
    if (!d) return;
    d({ type, ...payload });
  };
  return (
    <Controller
      onDir={(dir) => {
        if (dir === 'left') send('MOVE', { dx: -1 });
        else if (dir === 'right') send('MOVE', { dx: 1 });
        else if (dir === 'down') send('SOFT');
        else if (dir === 'up') send('HARD');
      }}
      onA={() => send('ROTATE', { dir: 1 })}
      onB={() => send('ROTATE', { dir: -1 })}
      onX={() => send('ROTATE', { dir: 1 })}
      onY={() => send('ROTATE', { dir: -1 })}
      onSelect={() => send('HOLD')}
      onStart={() => send('PAUSE')}
    />
  );
}
