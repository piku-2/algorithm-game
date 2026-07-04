import type { Cell, Direction, Pos, Stage } from './types';

export interface SimState {
  pos: Pos;
  dir: Direction;
}

const DELTA: Record<Direction, Pos> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const LEFT_OF: Record<Direction, Direction> = {
  up: 'left',
  left: 'down',
  down: 'right',
  right: 'up',
};

const RIGHT_OF: Record<Direction, Direction> = {
  up: 'right',
  right: 'down',
  down: 'left',
  left: 'up',
};

export function cellAt(stage: Stage, pos: Pos): Cell | null {
  const row = stage.grid[pos.y];
  if (!row) return null;
  return row[pos.x] ?? null;
}

export function forwardPos(state: SimState): Pos {
  const d = DELTA[state.dir];
  return { x: state.pos.x + d.x, y: state.pos.y + d.y };
}

/** 前方が壁または盤外か */
export function isBlocked(stage: Stage, state: SimState): boolean {
  const cell = cellAt(stage, forwardPos(state));
  return cell === null || cell === 'wall';
}

export function isOnGoal(stage: Stage, state: SimState): boolean {
  return cellAt(stage, state.pos) === 'goal';
}

export function turnLeft(dir: Direction): Direction {
  return LEFT_OF[dir];
}

export function turnRight(dir: Direction): Direction {
  return RIGHT_OF[dir];
}

export function initialState(stage: Stage): SimState {
  return { pos: { x: stage.start.x, y: stage.start.y }, dir: stage.start.dir };
}
