// Screen bezel — wraps the game canvas/area with the device's screen aesthetic.

export const Screen = ({ children }) => (
  <div className="screen-bezel">
    <div className="screen-inner">
      {children}
      <div className="skin-scanlines skin-flicker" />
      <div className="screen-glare" />
    </div>
  </div>
);
