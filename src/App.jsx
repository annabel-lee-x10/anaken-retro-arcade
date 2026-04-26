import { useCallback, useEffect, useRef, useState } from 'react';
import { TopBar } from './components/TopBar.jsx';
import { Controller } from './components/Controller.jsx';
import { Screen } from './components/Screen.jsx';
import { ModeSelect } from './components/ModeSelect.jsx';
import { GamePicker } from './components/GamePicker.jsx';
import { PauseMenu } from './components/PauseMenu.jsx';
import { TetrisScreen, useTetris } from './games/tetris/TetrisGame.jsx';
import { SnakeScreen, useSnake } from './games/snake/SnakeGame.jsx';
import { InvadersScreen, useInvaders } from './games/invaders/InvadersGame.jsx';
import { tetrisAudio } from './games/tetris/audio.js';
import { snakeAudio } from './games/snake/audio.js';
import { invadersAudio } from './games/invaders/audio.js';
import { GAMES, shouldShowPicker, getDefaultGame, getGameById } from './games/registry.js';
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
    snakeAudio.setMuted(muted);
    invadersAudio.setMuted(muted);
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  }, [muted]);

  const cycleSkin = useCallback((next) => setSkin(next), []);

  const initAudio = useCallback(() => {
    tetrisAudio.init();
    tetrisAudio.resume();
    snakeAudio.init();
    snakeAudio.resume();
    invadersAudio.init();
    invadersAudio.resume();
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

  const activeGame = getGameById(GAMES, gameId);
  const activeModes = activeGame?.modes;

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
            <ModeSelect onPick={onPickMode} modes={activeModes} />
          )}
          {screen === 'playing' && gameId === 'tetris' && mode && (
            <TetrisGameMount
              key={`tetris-${mode}`}
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
          {screen === 'playing' && gameId === 'snake' && mode && (
            <SnakeGameMount
              key={`snake-${mode}`}
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
          {screen === 'playing' && gameId === 'invaders' && mode && (
            <InvadersGameMount
              key={`invaders-${mode}`}
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
        <ControllerBound
          active={screen === 'playing'}
          gameId={gameId}
          onSelect={() => setMenuOpen((o) => !o)}
        />
        <div className="skin-grain" />
      </div>
    </div>
  );
}

// ----- Tetris game mount ---------------------------------------------------

function TetrisGameMount({
  mode, menuOpen, muted, hasPicker,
  onOpenMenu, onCloseMenu, onChangeMode, onQuit, onToggleMute, onGameOverMenu,
}) {
  const { state, dispatch } = useTetris(mode);
  useEffect(() => {
    window.__arcadeDispatch = dispatch;
    window.__arcadeState = state;
    return () => {
      if (window.__arcadeDispatch === dispatch) window.__arcadeDispatch = null;
    };
  });

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

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (menuOpen) onCloseMenu();
        else onOpenMenu();
        return;
      }
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

// ----- Snake game mount ----------------------------------------------------

function SnakeGameMount({
  mode, menuOpen, muted, hasPicker,
  onOpenMenu, onCloseMenu, onChangeMode, onQuit, onToggleMute, onGameOverMenu,
}) {
  const { state, dispatch } = useSnake(mode);
  useEffect(() => {
    window.__arcadeDispatch = dispatch;
    window.__arcadeState = state;
    return () => {
      if (window.__arcadeDispatch === dispatch) window.__arcadeDispatch = null;
    };
  });

  // Pause-on-menu mirror logic identical to Tetris.
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

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (menuOpen) onCloseMenu();
        else onOpenMenu();
        return;
      }
      if (menuOpen) return;
      const map = {
        ArrowLeft:  () => dispatch({ type: 'DIR', dir: 'left' }),
        ArrowRight: () => dispatch({ type: 'DIR', dir: 'right' }),
        ArrowUp:    () => dispatch({ type: 'DIR', dir: 'up' }),
        ArrowDown:  () => dispatch({ type: 'DIR', dir: 'down' }),
        Enter:      () => {
          if (state.status === 'over') dispatch({ type: 'RESET' });
          else dispatch({ type: 'PAUSE' });
        },
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
  }, [dispatch, menuOpen, state.status, onOpenMenu, onCloseMenu]);

  return (
    <>
      <SnakeScreen
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

// ----- Invaders game mount -------------------------------------------------

function InvadersGameMount({
  mode, menuOpen, muted, hasPicker,
  onOpenMenu, onCloseMenu, onChangeMode, onQuit, onToggleMute, onGameOverMenu,
}) {
  const { state, dispatch } = useInvaders(mode);
  useEffect(() => {
    window.__arcadeDispatch = dispatch;
    window.__arcadeState = state;
    return () => {
      if (window.__arcadeDispatch === dispatch) window.__arcadeDispatch = null;
    };
  });

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

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (menuOpen) onCloseMenu();
        else onOpenMenu();
        return;
      }
      if (menuOpen) return;
      const map = {
        ArrowLeft:  () => dispatch({ type: 'MOVE', dx: -1 }),
        ArrowRight: () => dispatch({ type: 'MOVE', dx: 1 }),
        ' ':        () => dispatch({ type: 'SHOOT' }),
        z:          () => dispatch({ type: 'SHOOT' }),
        Z:          () => dispatch({ type: 'SHOOT' }),
        x:          () => dispatch({ type: 'SHOOT' }),
        X:          () => dispatch({ type: 'SHOOT' }),
        Enter:      () => {
          if (state.status === 'over') dispatch({ type: 'RESET' });
          else dispatch({ type: 'PAUSE' });
        },
        p: () => dispatch({ type: 'PAUSE' }),
        P: () => dispatch({ type: 'PAUSE' }),
      };
      const fn = map[e.key];
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch, menuOpen, state.status, onOpenMenu, onCloseMenu]);

  return (
    <>
      <InvadersScreen
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

// ----- Controller binding --------------------------------------------------

function ControllerBound({ active, gameId, onSelect }) {
  const send = (type, payload = {}) => {
    const d = window.__arcadeDispatch;
    if (!d) return;
    d({ type, ...payload });
  };

  const isSnake = gameId === 'snake';
  const isInvaders = gameId === 'invaders';

  return (
    <Controller
      onDir={(dir) => {
        if (!active) return;
        if (isSnake) {
          send('DIR', { dir });
        } else if (isInvaders) {
          if (dir === 'left') send('MOVE', { dx: -1 });
          else if (dir === 'right') send('MOVE', { dx: 1 });
        } else {
          if (dir === 'left') send('MOVE', { dx: -1 });
          else if (dir === 'right') send('MOVE', { dx: 1 });
          else if (dir === 'down') send('SOFT');
          else if (dir === 'up') send('HARD');
        }
      }}
      onA={() => {
        if (!active) return;
        if (isSnake) {
          const s = window.__arcadeState;
          if (s?.status === 'over') send('RESET');
        } else if (isInvaders) {
          const s = window.__arcadeState;
          if (s?.status === 'over') send('RESET');
          else send('SHOOT');
        } else {
          send('ROTATE', { dir: 1 });
        }
      }}
      onB={() => {
        if (!active) return;
        if (isSnake) {
          const s = window.__arcadeState;
          if (s?.status === 'over') send('RESET');
        } else if (isInvaders) {
          const s = window.__arcadeState;
          if (s?.status === 'over') send('RESET');
          else send('SHOOT');
        } else {
          send('HARD');
        }
      }}
      onX={() => {
        if (!active) return;
        if (!isSnake && !isInvaders) send('ROTATE', { dir: 1 });
      }}
      onY={() => {
        if (!active) return;
        if (!isSnake && !isInvaders) send('HOLD');
      }}
      onSelect={onSelect}
      onStart={() => active && send('PAUSE')}
    />
  );
}
