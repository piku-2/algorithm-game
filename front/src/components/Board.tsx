import { useEffect, useState, type CSSProperties } from 'react';
import type { Direction, Pos, Stage } from '../game/types';
import type { Skin } from '../game/skins';

const ARROW: Record<Direction, string> = {
  up: '▲',
  down: '▼',
  left: '◀',
  right: '▶',
};

// きせかえスキン用: 絵文字は「うえ向き」で描かれている想定で回転させる
const ROTATION: Record<Direction, number> = {
  up: 0,
  right: 90,
  down: 180,
  left: 270,
};

const CONFETTI = ['🎉', '✨', '🎊', '⭐', '💫', '🎈', '✨', '🎊'];

const CRASH_QUIPS = ['いたた!', 'あいたっ!', 'ぶつかっちゃった!', 'かべだ!'];
const GOAL_QUIPS = ['やったー!', 'ゴール!', 'できた!', 'せいこう!'];

function pickQuip(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}

interface Props {
  stage: Stage;
  pos: Pos;
  dir: Direction;
  crashed: boolean;
  goaled: boolean;
  skin?: Skin;
}

export function Board({ stage, pos, dir, crashed, goaled, skin }: Props) {
  const [quip, setQuip] = useState<string | null>(null);

  useEffect(() => {
    if (crashed) setQuip(pickQuip(skin?.crashQuips ?? CRASH_QUIPS));
    else if (goaled) setQuip(pickQuip(skin?.goalQuips ?? GOAL_QUIPS));
    else setQuip(null);
    // skin の変更自体ではセリフを出し直さない(crashed/goaled の立ち上がりのみ反応)
  }, [crashed, goaled]);

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
        row.map((cell, x) => (
          <div key={`${x}-${y}`} className={`cell cell-${cell}`}>
            {cell === 'goal' && <span className="goal-flag">🚩</span>}
          </div>
        )),
      )}
      <span
        className={`player ${crashed ? 'player-crashed player-shake' : ''} ${goaled ? 'player-goaled' : ''}`}
        style={
          {
            '--px': pos.x,
            '--py': pos.y,
          } as CSSProperties
        }
      >
        {crashed ? (
          '💥'
        ) : goaled ? (
          '🎉'
        ) : skin?.emoji ? (
          <span
            className="player-skin"
            style={{ transform: `rotate(${ROTATION[dir]}deg)` } as CSSProperties}
          >
            {skin.emoji}
          </span>
        ) : (
          ARROW[dir]
        )}
      </span>
      {goaled && (
        <div className="confetti" aria-hidden="true">
          {CONFETTI.map((c, i) => (
            <span key={i} className="confetti-piece" style={{ '--n': i } as CSSProperties}>
              {c}
            </span>
          ))}
        </div>
      )}
      {quip && (
        <span
          key={quip}
          className={`speech-bubble ${crashed ? 'speech-bubble-crash' : 'speech-bubble-goal'}`}
          style={
            {
              '--px': pos.x,
              '--py': pos.y,
            } as CSSProperties
          }
        >
          {quip}
        </span>
      )}
    </div>
  );
}
