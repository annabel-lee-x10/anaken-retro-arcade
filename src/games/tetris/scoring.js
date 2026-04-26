// Standard Tetris scoring guideline.

const LINE_SCORES = { 1: 100, 2: 300, 3: 500, 4: 800 };
const T_SPIN_SCORES = { 0: 400, 1: 800, 2: 1200, 3: 1600 };

export const computeScore = ({
  lines = 0,
  level = 1,
  combo = -1,
  isTSpin = false,
}) => {
  if (lines === 0 && !isTSpin) return 0;

  let base;
  if (isTSpin) {
    base = (T_SPIN_SCORES[lines] ?? 0) * level;
  } else {
    base = (LINE_SCORES[lines] ?? 0) * level;
  }

  // Combo bonus: 50 * combo * level for each consecutive clear (combo starts at 0 for 2nd in a row)
  const comboBonus = combo > 0 ? 50 * combo * level : 0;

  return base + comboBonus;
};

export const levelForLines = (lines) => {
  const lvl = Math.floor(lines / 10) + 1;
  return Math.min(lvl, 15);
};

// Gravity in milliseconds per cell. Standard Tetris-style curve.
const LEVEL_GRAVITY_MS = {
  1: 1000,
  2: 793,
  3: 618,
  4: 473,
  5: 355,
  6: 262,
  7: 190,
  8: 135,
  9: 94,
  10: 64,
  11: 43,
  12: 28,
  13: 18,
  14: 11,
  15: 7,
};

export const gravityForLevel = (level) =>
  LEVEL_GRAVITY_MS[Math.min(Math.max(level, 1), 15)];
