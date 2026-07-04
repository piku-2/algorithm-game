import type { Block, RunResult, Stage, TraceEvent } from './types';
import {
  forwardPos,
  initialState,
  isBlocked,
  isOnGoal,
  turnLeft,
  turnRight,
  type SimState,
} from './simulator';

/**
 * ブロック列を実行してトレースを生成する純粋関数。
 * 壁衝突・ゴール到達・ステップ上限で実行を打ち切る。
 */
export function run(stage: Stage, blocks: Block[]): RunResult {
  const trace: TraceEvent[] = [];
  const blockIds: (string | null)[] = [];
  const state: SimState = initialState(stage);
  let steps = 0;
  let halted = false;
  let cleared = false;
  const remainingGems = new Set((stage.gems ?? []).map((g) => `${g.x},${g.y}`));

  const push = (ev: TraceEvent, blockId: string) => {
    trace.push(ev);
    blockIds.push(blockId);
  };

  const exec = (list: Block[]) => {
    for (const block of list) {
      if (halted) return;
      if (steps >= stage.maxSteps) {
        push({ type: 'stepLimit', at: { ...state.pos }, dir: state.dir }, block.id);
        halted = true;
        return;
      }
      steps++;
      switch (block.kind) {
        case 'move': {
          if (isBlocked(stage, state)) {
            push({ type: 'crash', at: { ...state.pos }, dir: state.dir }, block.id);
            halted = true;
            return;
          }
          const from = { ...state.pos };
          state.pos = forwardPos(state);
          push({ type: 'move', from, to: { ...state.pos }, dir: state.dir }, block.id);
          const gemKey = `${state.pos.x},${state.pos.y}`;
          if (remainingGems.has(gemKey)) {
            remainingGems.delete(gemKey);
            push({ type: 'gem', at: { ...state.pos } }, block.id);
          }
          if (isOnGoal(stage, state)) {
            push({ type: 'goal', at: { ...state.pos }, dir: state.dir }, block.id);
            halted = true;
            cleared = true;
            return;
          }
          break;
        }
        case 'turnLeft':
          state.dir = turnLeft(state.dir);
          push({ type: 'turn', dir: state.dir, at: { ...state.pos } }, block.id);
          break;
        case 'turnRight':
          state.dir = turnRight(state.dir);
          push({ type: 'turn', dir: state.dir, at: { ...state.pos } }, block.id);
          break;
        case 'repeat': {
          const times = block.times ?? 1;
          for (let i = 0; i < times; i++) {
            if (halted) return;
            exec(block.body ?? []);
          }
          break;
        }
        case 'repeatForever': {
          while (!halted) {
            // 空の body でも steps を消費させ、maxSteps で必ず停止させる
            if (steps >= stage.maxSteps) {
              push({ type: 'stepLimit', at: { ...state.pos }, dir: state.dir }, block.id);
              halted = true;
              return;
            }
            steps++;
            exec(block.body ?? []);
          }
          break;
        }
        case 'ifWall': {
          if (isBlocked(stage, state)) {
            exec(block.body ?? []);
          }
          break;
        }
      }
    }
  };

  exec(blocks);
  return { trace, cleared, blockIds };
}

/** 星評価に使うブロック数（repeat の中身も数える） */
export function countBlocks(blocks: Block[]): number {
  let n = 0;
  for (const b of blocks) {
    n++;
    if (b.body) n += countBlocks(b.body);
  }
  return n;
}

export function starsFor(stage: Stage, blockCount: number): 1 | 2 | 3 {
  if (blockCount <= stage.starThresholds[0]) return 3;
  if (blockCount <= stage.starThresholds[1]) return 2;
  return 1;
}
