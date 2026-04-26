// 4 face buttons in SNES diamond layout: B (bottom, yellow), A (right, red),
// Y (left, green), X (top, blue).
//
// Each button supports two callback styles:
//   onPress(id)   — single tap (fires on pointerdown)
//   onDown(id) / onUp(id) — fires on pointerdown / pointerup (or cancel/leave)
// Pinball needs hold-to-up flippers, so down/up handlers are essential.
// Tetris and most other games can keep using onPress.

const FaceBtn = ({ id, label, onPress, onDown, onUp }) => {
  const handlers = {
    onPointerDown: (e) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      e.currentTarget.classList.add('pressed');
      onPress?.();
      onDown?.();
    },
    onPointerUp: (e) => {
      e.preventDefault();
      e.currentTarget.classList.remove('pressed');
      onUp?.();
    },
    onPointerCancel: (e) => {
      e.currentTarget.classList.remove('pressed');
      onUp?.();
    },
    onPointerLeave: (e) => {
      // Only treat as "up" if button was being held (pointer captured).
      if (e.currentTarget.classList.contains('pressed')) {
        e.currentTarget.classList.remove('pressed');
        onUp?.();
      }
    },
    onContextMenu: (e) => e.preventDefault(),
  };
  return (
    <button className={`face-btn face-${id.toLowerCase()}`} aria-label={label} {...handlers}>
      <span className="face-letter">{id}</span>
    </button>
  );
};

export const FaceButtons = ({
  onA, onB, onX, onY,
  onADown, onAUp, onBDown, onBUp, onXDown, onXUp, onYDown, onYUp,
}) => (
  <div className="face-cluster">
    <div className="face-pos face-pos-x"><FaceBtn id="X" label="X" onPress={onX} onDown={onXDown} onUp={onXUp} /></div>
    <div className="face-pos face-pos-y"><FaceBtn id="Y" label="Y" onPress={onY} onDown={onYDown} onUp={onYUp} /></div>
    <div className="face-pos face-pos-a"><FaceBtn id="A" label="A" onPress={onA} onDown={onADown} onUp={onAUp} /></div>
    <div className="face-pos face-pos-b"><FaceBtn id="B" label="B" onPress={onB} onDown={onBDown} onUp={onBUp} /></div>
  </div>
);
