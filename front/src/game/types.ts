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

/** 標準入出力問題(paiza/AtCoder 風)の入出力例 */
export interface IoSample {
  input: string;
  output: string;
  /** 例の説明(任意) */
  note?: string;
}

/** 標準入出力問題の定義。判定は samples + hiddenTests の全ケース一致 */
export interface IoProblem {
  /** 入力形式の説明 */
  inputFormat: string;
  /** 出力形式の説明 */
  outputFormat: string;
  /** 制約(例: "1 ≦ N ≦ 100") */
  constraints: string;
  /** 問題文に表示する入出力例(判定にも使う) */
  samples: IoSample[];
  /** 隠しテストケース */
  hiddenTests: { input: string; output: string }[];
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
   * 問題文本文(上級のみ)。IO問題では必須。ナビ・配列問題でも
   * 背景ストーリー付きの問題文として表示する。
   */
  statement?: string;
  /** 標準入出力問題(paiza/AtCoder 風)。ある場合、盤面・トレース再生は使わない */
  io?: IoProblem;
  /** 模範解答の C コード(上級のみ。「解答例を見る」ボタンで表示) */
  solution?: string;
  /**
   * 模範解答のブロック列(初級のみ。「解答例を見る」ボタンで表示)。
   * データファイルでは id なしで保存され、ロード時に id が振られる。
   */
  solutionBlocks?: Block[];
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
