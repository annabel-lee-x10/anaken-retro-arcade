// Pinball physics — pure math, no React, no DOM.
// All math is in playfield-local pixel units. Gravity pulls +y (down).
// Time deltas are in milliseconds; velocities are in pixels per millisecond.

export const GRAVITY = 0.0018; // px / ms^2 — tuned for tabletop feel

// ---- vector helpers --------------------------------------------------------

const dot = (ax, ay, bx, by) => ax * bx + ay * by;

export const segmentDistanceToPoint = (p, seg) => {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - seg.x1, p.y - seg.y1);
  let t = ((p.x - seg.x1) * dx + (p.y - seg.y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = seg.x1 + t * dx;
  const cy = seg.y1 + t * dy;
  return Math.hypot(p.x - cx, p.y - cy);
};

// Closest point on segment to a given point — returns {x, y, t}
export const closestPointOnSegment = (p, seg) => {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: seg.x1, y: seg.y1, t: 0 };
  let t = ((p.x - seg.x1) * dx + (p.y - seg.y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return { x: seg.x1 + t * dx, y: seg.y1 + t * dy, t };
};

// ---- step + integrate -----------------------------------------------------

// Advance ball by dt ms under gravity. Pure — returns new ball.
export const stepBall = (b, dt) => {
  if (dt === 0) return { ...b };
  const vy = b.vy + GRAVITY * dt;
  return {
    ...b,
    x: b.x + b.vx * dt,
    y: b.y + (b.vy + vy) * 0.5 * dt, // average for slightly better integration
    vy,
  };
};

// ---- segment reflection (walls, slingshots, drop targets) ------------------

// Reflect ball off a line segment. Returns updated ball with corrected
// position (pushed out of penetration) and reflected velocity, OR null if
// the ball is not in contact / is already moving away.
//
// restitution defaults to 1 (no energy added). Slingshots pass ~1.4.
export const reflectBallOffSegment = (b, seg, restitution = 1) => {
  const cp = closestPointOnSegment({ x: b.x, y: b.y }, seg);
  const nx = b.x - cp.x;
  const ny = b.y - cp.y;
  const dist = Math.hypot(nx, ny);
  if (dist > b.r) return null;
  // Normal pointing from segment toward ball
  let normX, normY;
  if (dist < 1e-6) {
    // Ball center on the segment line — derive normal perpendicular to segment
    const segDx = seg.x2 - seg.x1;
    const segDy = seg.y2 - seg.y1;
    const segLen = Math.hypot(segDx, segDy) || 1;
    normX = -segDy / segLen;
    normY = segDx / segLen;
  } else {
    normX = nx / dist;
    normY = ny / dist;
  }
  const vDotN = dot(b.vx, b.vy, normX, normY);
  if (vDotN >= 0) return null; // already moving away — don't double-bounce

  const newVx = b.vx - (1 + restitution) * vDotN * normX;
  const newVy = b.vy - (1 + restitution) * vDotN * normY;
  // Push ball out of penetration
  const overlap = b.r - dist + 0.01;
  return {
    ...b,
    x: b.x + normX * overlap,
    y: b.y + normY * overlap,
    vx: newVx,
    vy: newVy,
  };
};

// ---- circle reflection (bumpers) ------------------------------------------

export const reflectBallOffCircle = (b, circle, restitution = 1) => {
  const dx = b.x - circle.cx;
  const dy = b.y - circle.cy;
  const dist = Math.hypot(dx, dy);
  const minDist = b.r + circle.r;
  if (dist > minDist) return null;
  if (dist < 1e-6) {
    // Co-located — push straight up arbitrarily
    return { ...b, x: b.x, y: b.y - minDist, vx: -b.vx, vy: -Math.abs(b.vy) };
  }
  const normX = dx / dist;
  const normY = dy / dist;
  const vDotN = dot(b.vx, b.vy, normX, normY);
  if (vDotN >= 0) return null;
  const newVx = b.vx - (1 + restitution) * vDotN * normX;
  const newVy = b.vy - (1 + restitution) * vDotN * normY;
  const overlap = minDist - dist + 0.01;
  return {
    ...b,
    x: b.x + normX * overlap,
    y: b.y + normY * overlap,
    vx: newVx,
    vy: newVy,
  };
};

// ---- flippers --------------------------------------------------------------

// Compute the segment representing the flipper's body at its current angle.
// `side` is 'left' or 'right' — angle is measured from horizontal,
// flipper extends in the +x or -x direction respectively.
export const flipperSegment = (flipper) => {
  const dirX = flipper.side === 'left' ? 1 : -1;
  const cosA = Math.cos(flipper.angle);
  const sinA = Math.sin(flipper.angle);
  return {
    x1: flipper.pivotX,
    y1: flipper.pivotY,
    x2: flipper.pivotX + dirX * flipper.length * cosA,
    y2: flipper.pivotY + flipper.length * sinA,
  };
};

// If the flipper is rotating and in contact with the ball, transfer angular
// velocity into linear velocity tangent to the rotation. Returns updated
// ball or null.
export const flipperKick = (b, flipper) => {
  if (!flipper.angularVel) return null;
  const seg = flipperSegment(flipper);
  const cp = closestPointOnSegment({ x: b.x, y: b.y }, seg);
  const dx = b.x - cp.x;
  const dy = b.y - cp.y;
  const dist = Math.hypot(dx, dy);
  if (dist > b.r + 2) return null; // not in contact

  // Tangential velocity at the contact point: v = ω × r
  // r is vector from pivot to contact point
  const rx = cp.x - flipper.pivotX;
  const ry = cp.y - flipper.pivotY;
  // 2D cross product: ω is scalar, tangent = (-ω·ry, ω·rx)
  const tangVx = -flipper.angularVel * ry;
  const tangVy = flipper.angularVel * rx;

  // Reflect ball off the flipper segment with restitution >1, then ADD a
  // portion of the tangential velocity for the kick.
  const reflected = reflectBallOffSegment(b, seg, 0.4) || { ...b };
  // Boost: add component of tangent velocity along the surface normal
  const normX = dist > 1e-6 ? dx / dist : 0;
  const normY = dist > 1e-6 ? dy / dist : -1;
  const tangAlongNorm = dot(tangVx, tangVy, normX, normY);
  const kickStrength = 0.6;
  return {
    ...reflected,
    vx: reflected.vx + normX * tangAlongNorm * kickStrength,
    vy: reflected.vy + normY * tangAlongNorm * kickStrength,
  };
};
