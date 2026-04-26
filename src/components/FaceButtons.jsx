// 4 face buttons in SNES diamond layout: B (bottom, yellow), A (right, red),
// Y (left, green), X (top, blue).

const FaceBtn = ({ id, label, onPress }) => {
  const handlers = {
    onPointerDown: (e) => { e.preventDefault(); e.currentTarget.classList.add('pressed'); onPress(); },
    onPointerUp: (e) => { e.preventDefault(); e.currentTarget.classList.remove('pressed'); },
    onPointerCancel: (e) => e.currentTarget.classList.remove('pressed'),
    onPointerLeave: (e) => e.currentTarget.classList.remove('pressed'),
    onContextMenu: (e) => e.preventDefault(),
  };
  return (
    <button className={`face-btn face-${id.toLowerCase()}`} aria-label={label} {...handlers}>
      <span className="face-letter">{id}</span>
    </button>
  );
};

export const FaceButtons = ({ onA, onB, onX, onY }) => (
  <div className="face-cluster">
    <div className="face-pos face-pos-x"><FaceBtn id="X" label="X" onPress={onX} /></div>
    <div className="face-pos face-pos-y"><FaceBtn id="Y" label="Y" onPress={onY} /></div>
    <div className="face-pos face-pos-a"><FaceBtn id="A" label="A" onPress={onA} /></div>
    <div className="face-pos face-pos-b"><FaceBtn id="B" label="B" onPress={onB} /></div>
  </div>
);
