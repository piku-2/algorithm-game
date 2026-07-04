import type { BlockType, Cell, Direction, Puzzle, Stage } from './types';
import bundled from './stages.data.json';

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
//
// ↓のコードは「かべなら右をむく」だけの単純な作戦。
// まっすぐな道はクリアできるが、迷路では同じ場所を
// 行ったり来たりしてしまう。「右手法」(右手を壁に
// つけたまま歩く) などのアルゴリズムに改造してみよう!

int main(void) {
    while (!is_goal()) {
        if (is_wall_ahead()) {
            turn_right();
        } else {
            move_forward();
        }
    }
    return 0;
}
`;
