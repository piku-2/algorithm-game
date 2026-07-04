import type { Block, BlockType, Cell, Direction, IoProblem, Puzzle, Stage } from './types';
import bundled from './stages.data.json';

/** データファイル上の模範解答ブロック(id なし。ネストは body で表現) */
export interface RawSolutionBlock {
  kind: BlockType;
  times?: number;
  body?: RawSolutionBlock[];
}

/** バックエンド/生成データの転送フォーマット(rows は '#'=壁 '.'=床 'G'=ゴール) */
export interface StageJson {
  id: string;
  name: string;
  mode: 'block' | 'code';
  rows: string[];
  start: { x: number; y: number; dir: Direction };
  allowedBlocks: BlockType[];
  starThresholds: [number, number];
  maxSteps: number;
  hint?: string;
  puzzle?: Puzzle;
  template?: string;
  statement?: string;
  io?: IoProblem;
  solution?: string;
  solutionBlocks?: RawSolutionBlock[];
}

let solutionBlockSeq = 0;

/** id なしの模範解答ブロック列に、再帰的に一意な id を振る */
function assignSolutionBlockIds(raw: RawSolutionBlock[]): Block[] {
  return raw.map((b) => {
    solutionBlockSeq++;
    const id = `sol${solutionBlockSeq}`;
    return b.body
      ? { id, kind: b.kind, times: b.times, body: assignSolutionBlockIds(b.body) }
      : { id, kind: b.kind, times: b.times };
  });
}

export function toStage(j: StageJson): Stage {
  return {
    id: j.id,
    name: j.name,
    mode: j.mode,
    grid: j.rows.map((row) =>
      [...row].map((ch): Cell => (ch === '#' ? 'wall' : ch === 'G' ? 'goal' : 'floor')),
    ),
    start: j.start,
    allowedBlocks: j.allowedBlocks,
    starThresholds: j.starThresholds,
    maxSteps: j.maxSteps,
    hint: j.hint,
    puzzle: j.puzzle,
    template: j.template,
    statement: j.statement,
    io: j.io,
    solution: j.solution,
    solutionBlocks: j.solutionBlocks ? assignSolutionBlockIds(j.solutionBlocks) : undefined,
  };
}

/**
 * フロント同梱のステージデータ(scripts/gen-stages.ts が生成)。
 * 通常はバックエンド API から取得し、API が使えないときのフォールバックとして使う。
 */
export const BUNDLED_STAGES: Stage[] = (bundled as StageJson[]).map(toStage);

export const CODE_TEMPLATE = `#include "game.h"

// つかえる関数:
//   move_forward();    // 1マスすすむ
//   turn_left();       // ひだりをむく
//   turn_right();      // みぎをむく
//   is_wall_ahead();   // まえがかべなら1
//   is_goal();         // ゴールなら1

int main(void) {
    // ここに プログラムを かこう

    return 0;
}
`;
