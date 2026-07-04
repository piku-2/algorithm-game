export type Direction = 'up' | 'down' | 'left' | 'right';

export type Cell = 'floor' | 'wall' | 'goal';

export interface Pos {
  x: number;
  y: number;
}

export type BlockType =
  | 'move'
  | 'turnLeft'
  | 'turnRight'
  | 'repeat'
  | 'repeatForever'
  | 'ifWall';

export interface Block {
  id: string;
  kind: BlockType;
  /** repeat のみ */
  times?: number;
  /** repeat / repeatForever / ifWall */
  body?: Block[];
}

/** 上級の配列パズル(ソート等)。kind が達成条件を表す */
export type PuzzleKind = 'sort' | 'sortDesc' | 'reverse' | 'maxLast' | 'minFirst';

export interface Puzzle {
  kind: PuzzleKind;
  values: number[];
}

export interface Stage {
  id: string;
  name: string;
  mode: 'block' | 'code';
  /** grid[y][x]。配列パズルのステージでは空 */
  grid: Cell[][];
  start: Pos & { dir: Direction };
  allowedBlocks: BlockType[];
  /**
   * [★3のしきい値, ★2のしきい値]。
   * 初級=ブロック数 / 上級ナビ=実行ステップ数 / 上級配列=swap回数
   */
  starThresholds: [number, number];
  maxSteps: number;
  hint?: string;
  /** 配列パズルのみ */
  puzzle?: Puzzle;
  /** 上級のコード初期テンプレート(未指定なら共通テンプレート) */
  template?: string;
  /**
   * 集める要素(宝石)の位置。データファイルには含まれず、front/src/game/gems.ts が
   * しょきゅうモードのナビステージに実行時決定的に付与する演出用フィールド。
   */
  gems?: Pos[];
}

/** 実行トレース: 初級(ブロック)・上級(Cコード)共通のフォーマット */
export type TraceEvent =
  | { type: 'move'; from: Pos; to: Pos; dir: Direction }
  | { type: 'turn'; dir: Direction; at: Pos }
  | { type: 'crash'; at: Pos; dir: Direction }
  | { type: 'goal'; at: Pos; dir: Direction }
  | { type: 'stepLimit'; at: Pos; dir: Direction }
  // 集める要素(宝石)。しょきゅうモードのインタプリタのみが発行する(Cサンドボックスは発行しない)
  | { type: 'gem'; at: Pos }
  // 配列パズル用
  | { type: 'swap'; i: number; j: number }
  | { type: 'solved' }     // 達成条件を満たした
  | { type: 'unsolved' };  // プログラムが終了したが条件を満たしていない

export interface RunResult {
  trace: TraceEvent[];
  cleared: boolean;
  /** trace と同じ長さ。各イベントを発生させたブロックの id(BlockEditor のハイライト用) */
  blockIds: (string | null)[];
}
