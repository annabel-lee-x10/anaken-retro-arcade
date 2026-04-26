export const ROWS = 20;
export const COLS = 10;

export const createBoard = () =>
  Array.from({ length: ROWS }, () => Array(COLS).fill(0));

export const isInside = (r, c) =>
  r >= 0 && r < ROWS && c >= 0 && c < COLS;

export const collides = (board, cells) => {
  for (const [r, c] of cells) {
    if (c < 0 || c >= COLS) return true;
    if (r >= ROWS) return true;
    // Allow piece to exist above visible board (r < 0)
    if (r >= 0 && board[r][c] !== 0) return true;
  }
  return false;
};

export const lock = (board, cells, value) => {
  const next = board.map((row) => row.slice());
  for (const [r, c] of cells) {
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) next[r][c] = value;
  }
  return next;
};

export const clearLines = (board) => {
  const kept = board.filter((row) => row.some((cell) => cell === 0));
  const cleared = ROWS - kept.length;
  const empty = Array.from({ length: cleared }, () => Array(COLS).fill(0));
  return { board: [...empty, ...kept], cleared };
};
