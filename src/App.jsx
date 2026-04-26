import { useCallback, useEffect, useRef, useState } from 'react';
import { TopBar } from './components/TopBar.jsx';
import { Controller } from './components/Controller.jsx';
import { Screen } from './components/Screen.jsx';
import { ModeSelect } from './components/ModeSelect.jsx';
import { GamePicker } from './components/GamePicker.jsx';
import { PauseMenu } from './components/PauseMenu.jsx';
import { TetrisScreen, useTetris } from './games/tetris/TetrisGame.jsx';
import { tetrisAudio } from './games/tetris/audio.js';
import { GAMES, shouldShowPicker, getDefaultGame } from './games/registry.js';
import './App.css';

const SKIN_KEY = 'arcade.skin';
const MUTE_KEY = 'arcade.muted';

// Screens: 'picker' (top-level game grid) | 'mode-select' | 'playing'
// With one registered game, the picker is bypassed entirely on boot AND on quit.

export default function App() {
  const [skin, setSkin] = useState(() => localStorage.getItem(SKIN_KEY) || 'neon');
  const [muted, setMuted] = useState(() => localStorage.getItem(MUTE_KEY) === '1');
  const [screen, setScreen] = useState(() => (shouldShowPicker(GAMES) ? 'picker' : 'mode-select'));
  const [gameId, setGameId] = useState(() => (shouldShowPicker(GAMES) ? null : getDefaultGame(GAMES)?.id ?? null));
  const [mode, setMode] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.dataset.skin = skin;
    localStorage.setItem(SKIN_KEY, skin);
  }, [skin]);

  useEffect(() => {
    tetrisAudio.setMuted(muted);
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  }, [muted]);

  const cycleSkin = useCallback((next) => setSkin(next), []);

  const initAudio = useCallback(() => {
    tetrisAudio.init();
    tetrisAudio.resume();
  }, []);

  const goToPickerOrModeSelect = useCallback(() => {
    setScreen(shouldShowPicker(GAMES) ? 'picker' : 'mode-select');
    setMode(null);
    setMenuOpen(false);
  }, []);

  const onPickGame = useCallback((id) => {
    setGameId(id);
    setScreen('mode-select');
  }, []);

  const onPickMode = useCallback((m) => {
    initAudio();
    setMode(m);
    setScreen('playing');
  }, [initAudio]);

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
          {screen === 'picker' && (
            <GamePicker games={GAMES} onPick={onPickGame} />
          )}
          {screen === 'mode-select' && (
            <ModeSelect onPick={onPickMode} />
          )}
          {screen === 'playing' && gameId === 'tetris' && mode && (
            <Game
              key={mode}
              mode={mode}
              menuOpen={menuOpen}
              muted={muted}
              hasPicker={shouldShowPicker(GAMES)}
              onOpenMenu={() => setMenuOpen(true)}
              onCloseMenu={() => setMenuOpen(false)}
              onChangeMode={() => { setScreen('mode-select'); setMode(null); setMenuOpen(false); }}
              onQuit={goToPickerOrModeSelect}
              onToggleMute={() => setMuted((m) => !m)}
              onGameOverMenu={() => { setScreen('mode-select'); setMode(null); }}
            />
          )}
        </Screen>
        <ControllerBound active={screen === 'playing'} onSelect={() => setMenuOpen((o) => !o)} />
        <div className="skin-grain" />
      </div>
    </div>
  );
}

// Bridge between game state + controller buttons + keyboard.
// Game lives inside the Screen; the controller dispatches via a window-scoped ref.

function Game({
  mode, menuOpen, muted, hasPicker,
  onOpenMenu, onCloseMenu, onChangeMode, onQuit, onToggleMute, onGameOverMenu,
}) {
  const { state, dispatch } = useTetris(mode);
  // expose dispatch globally so the controller (rendered as sibling) can talk to it
  useEffect(() => {
    window.__arcadeDispatch = dispatch;
    window.__arcadeState = state;
    return () => {
      if (window.__arcadeDispatch === dispatch) window.__arcadeDispatch = null;
    };
  });

  // Track whether we paused the game on behalf of the menu so Resume can
  // restore the prior status without flipping a paused-by-user game to playing.
  const pausedByMenuRef = useRef(false);
  useEffect(() => {
    if (menuOpen) {
      if (state.status === 'playing') {
        pausedByMenuRef.current = true;
        dispatch({ type: 'PAUSE' });
      }
    } else if (pausedByMenuRef.current) {
      pausedByMenuRef.current = false;
      if (state.status === 'paused') dispatch({ type: 'PAUSE' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOpen]);

  // keyboard
  useEffect(() => {
    const onKey = (e) => {
      // Escape opens/closes the menu — always available while a game is mounted.
      if (e.key === 'Escape') {
        e.preventDefault();
        if (menuOpen) onCloseMenu();
        else onOpenMenu();
        return;
      }
      // Block gameplay keys while the menu is open.
      if (menuOpen) return;
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
  }, [dispatch, menuOpen, onOpenMenu, onCloseMenu]);

  return (
    <>
      <TetrisScreen
        state={state}
        onAction={(a) => {
          if (a === 'reset') dispatch({ type: 'RESET' });
          if (a === 'menu') onGameOverMenu();
        }}
      />
      {menuOpen && (
        <PauseMenu
          muted={muted}
          hasPicker={hasPicker}
          onResume={onCloseMenu}
          onRestart={() => { dispatch({ type: 'RESET' }); onCloseMenu(); }}
          onChangeMode={onChangeMode}
          onQuit={onQuit}
          onToggleMute={onToggleMute}
          onClose={onCloseMenu}
        />
      )}
    </>
  );
}

function ControllerBound({ active, onSelect }) {
  const send = (type, payload = {}) => {
    const d = window.__arcadeDispatch;
    if (!d) return;
    d({ type, ...payload });
  };
  return (
    <Controller
      onDir={(dir) => {
        if (!active) return;
        if (dir === 'left') send('MOVE', { dx: -1 });
        else if (dir === 'right') send('MOVE', { dx: 1 });
        else if (dir === 'down') send('SOFT');
        else if (dir === 'up') send('HARD');
      }}
      onA={() => active && send('ROTATE', { dir: 1 })}
      onB={() => active && send('HARD')}
      onX={() => active && send('ROTATE', { dir: 1 })}
      onY={() => active && send('HOLD')}
      onSelect={onSelect}
      onStart={() => active && send('PAUSE')}
    />
  );
}
