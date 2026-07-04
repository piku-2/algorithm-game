import type { CSSProperties } from 'react';
import type { Direction, Pos, Stage } from '../game/types';

const ARROW: Record<Direction, string> = {
  up: '▲',
  down: '▼',
  left: '◀',
  right: '▶',
};

interface Props {
  stage: Stage;
  pos: Pos;
  dir: Direction;
  crashed: boolean;
  goaled: boolean;
}

export function Board({ stage, pos, dir, crashed, goaled }: Props) {
  const cols = stage.grid[0]?.length ?? 0;
  // 大きな盤面(最大27列)でも収まるようセルサイズを自動調整する
  const cellSize = Math.max(18, Math.min(48, Math.floor(620 / cols)));
  return (
    <div
      className="board"
      style={
        {
          gridTemplateColumns: `repeat(${cols}, var(--cell-size))`,
          '--cell-size': `${cellSize}px`,
        } as CSSProperties
      }
    >
      {stage.grid.map((row, y) =>
        row.map((cell, x) => {
          const here = pos.x === x && pos.y === y;
          return (
            <div key={`${x}-${y}`} className={`cell cell-${cell}`}>
              {cell === 'goal' && !here && <span className="goal-flag">🚩</span>}
              {here && (
                <span
                  className={`player ${crashed ? 'player-crashed' : ''} ${goaled ? 'player-goaled' : ''}`}
                >
                  {crashed ? '💥' : goaled ? '🎉' : ARROW[dir]}
                </span>
              )}
            </div>
          );
        }),
      )}
    </div>
  );
}
