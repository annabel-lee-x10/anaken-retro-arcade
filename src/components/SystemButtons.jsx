const Sys = ({ label, onPress }) => {
  const handlers = {
    onPointerDown: (e) => { e.preventDefault(); e.currentTarget.classList.add('pressed'); onPress(); },
    onPointerUp: (e) => { e.preventDefault(); e.currentTarget.classList.remove('pressed'); },
    onPointerCancel: (e) => e.currentTarget.classList.remove('pressed'),
    onPointerLeave: (e) => e.currentTarget.classList.remove('pressed'),
    onContextMenu: (e) => e.preventDefault(),
  };
  return (
    <button className={`sys-btn sys-${label.toLowerCase()}`} {...handlers}>
      <span>{label}</span>
    </button>
  );
};

export const SystemButtons = ({ onSelect, onStart }) => (
  <div className="sys-cluster">
    <Sys label="SELECT" onPress={onSelect} />
    <Sys label="START" onPress={onStart} />
  </div>
);
