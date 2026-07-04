import type { Puzzle, PuzzleKind } from '../game/types';

const KIND_LABEL: Record<PuzzleKind, string> = {
  sort: '小さい順にならべよう',
  sortDesc: '大きい順にならべよう',
  reverse: '逆順にならべよう',
  maxLast: '一番大きい値を最後へ',
  minFirst: '一番小さい値を先頭へ',
};

interface Props {
  puzzle: Puzzle;
  /** 現在の配列(swap を適用した状態) */
  values: number[];
  /** 直前に交換した位置(ハイライト用) */
  lastSwap: [number, number] | null;
  solved: boolean;
}

/** 配列パズルの表示: 値を棒グラフ+数字カードで見せ、swap をハイライトする */
export function ArrayBoard({ puzzle, values, lastSwap, solved }: Props) {
  const max = Math.max(...puzzle.values);
  return (
    <div className="array-board">
      <p className="array-goal">🎯 {KIND_LABEL[puzzle.kind]}</p>
      <div className="array-bars">
        {values.map((v, i) => {
          const swapped = lastSwap !== null && (i === lastSwap[0] || i === lastSwap[1]);
          return (
            <div key={i} className="array-col">
              <div
                className={`array-bar ${swapped ? 'array-bar-swapped' : ''} ${solved ? 'array-bar-solved' : ''}`}
                style={{ height: `${Math.max(8, (v / max) * 160)}px` }}
              />
              <span className={`array-value ${swapped ? 'array-value-swapped' : ''}`}>{v}</span>
              <span className="array-index">{i}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
