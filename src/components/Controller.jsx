import { DPad } from './DPad.jsx';
import { FaceButtons } from './FaceButtons.jsx';
import { SystemButtons } from './SystemButtons.jsx';

export const Controller = ({
  onDir,
  onA, onB, onX, onY,
  onADown, onAUp, onBDown, onBUp, onXDown, onXUp, onYDown, onYUp,
  onSelect, onStart,
}) => (
  <div className="controller-panel">
    <div className="controller-decor">
      <div className="controller-strip" />
    </div>
    <div className="controller-grid">
      <div className="controller-zone zone-dpad">
        <DPad onDir={onDir} />
      </div>
      <div className="controller-zone zone-sys">
        <SystemButtons onSelect={onSelect} onStart={onStart} />
      </div>
      <div className="controller-zone zone-face">
        <FaceButtons
          onA={onA} onB={onB} onX={onX} onY={onY}
          onADown={onADown} onAUp={onAUp}
          onBDown={onBDown} onBUp={onBUp}
          onXDown={onXDown} onXUp={onXUp}
          onYDown={onYDown} onYUp={onYUp}
        />
      </div>
    </div>
  </div>
);
