import type { Pos, Stage } from './types';

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * しょきゅう(ブロック)モードのナビステージに、決定的に宝石マスを最大2個配置する。
 * data/stages.json は変更せず、実行時にステージへ演出として付与する。
 * (壁/ゴール/開始マスには置かない。床マスが2個未満のステージには置かない)
 */
export function withGems(stage: Stage): Stage {
  if (stage.mode !== 'block' || stage.puzzle || stage.gems) return stage;
  const candidates: Pos[] = [];
  stage.grid.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell === 'floor' && !(x === stage.start.x && y === stage.start.y)) {
        candidates.push({ x, y });
      }
    });
  });
  if (candidates.length < 2) return stage;

  const rand = mulberry32(hashString(stage.id));
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return { ...stage, gems: shuffled.slice(0, 2) };
}
