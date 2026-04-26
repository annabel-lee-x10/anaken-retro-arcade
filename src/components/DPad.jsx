import { useCallback, useRef, useEffect } from 'react';

// SNES-style D-pad: 4 arms of a single cross. Tap each arm to dispatch.
// Supports continuous press (autorepeat) for left/right/down.

const REPEAT_DELAY = 140;
const REPEAT_RATE = 50;

export const DPad = ({ onDir }) => {
  const heldRef = useRef(null); // currently held direction
  const timerRef = useRef(null);

  const stop = useCallback(() => {
    heldRef.current = null;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const begin = useCallback((dir) => {
    if (heldRef.current === dir) return;
    stop();
    heldRef.current = dir;
    onDir(dir);
    if (dir !== 'up') {
      const repeat = () => {
        if (heldRef.current !== dir) return;
        onDir(dir);
        timerRef.current = setTimeout(repeat, REPEAT_RATE);
      };
      timerRef.current = setTimeout(repeat, REPEAT_DELAY);
    }
  }, [onDir, stop]);

  useEffect(() => () => stop(), [stop]);

  const handler = (dir) => ({
    onPointerDown: (e) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); begin(dir); },
    onPointerUp: (e) => { e.preventDefault(); stop(); },
    onPointerCancel: stop,
    onPointerLeave: stop,
    onContextMenu: (e) => e.preventDefault(),
  });

  return (
    <div className="dpad" role="group" aria-label="D-pad">
      <button className="dpad-arm dpad-up" {...handler('up')} aria-label="Up" />
      <button className="dpad-arm dpad-right" {...handler('right')} aria-label="Right" />
      <button className="dpad-arm dpad-down" {...handler('down')} aria-label="Down" />
      <button className="dpad-arm dpad-left" {...handler('left')} aria-label="Left" />
      <div className="dpad-hub" />
    </div>
  );
};
