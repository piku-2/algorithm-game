import { describe, expect, it } from 'vitest';
import type { Block, Direction, Stage } from './types';
import { BUNDLED_STAGES } from './stages';
import { run } from './interpreter';

const DELTA: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};
const LEFT: Record<Direction, Direction> = { up: 'left', left: 'down', down: 'right', right: 'up' };
const RIGHT: Record<Direction, Direction> = { up: 'right', right: 'down', down: 'left', left: 'up' };

/** move/turnL/turnR の BFS でゴール到達可能かを判定 */
function solvable(stage: Stage): boolean {
  const seen = new Set<string>();
  let queue: [number, number, Direction][] = [[stage.start.x, stage.start.y, stage.start.dir]];
  seen.add(queue[0].join(','));
  const cell = (x: number, y: number) => stage.grid[y]?.[x] ?? 'wall';
  while (queue.length > 0) {
    const next: [number, number, Direction][] = [];
    for (const [x, y, d] of queue) {
      if (cell(x, y) === 'goal') return true;
      const [dx, dy] = DELTA[d];
      const cands: [number, number, Direction][] = [
        [x, y, LEFT[d]],
        [x, y, RIGHT[d]],
      ];
      if (cell(x + dx, y + dy) !== 'wall') cands.push([x + dx, y + dy, d]);
      for (const c of cands) {
        const k = c.join(',');
        if (!seen.has(k)) {
          seen.add(k);
          next.push(c);
        }
      }
    }
    queue = next;
  }
  return false;
}

describe('同梱ステージデータ', () => {
  it('初級200問 + 上級100問ある', () => {
    expect(BUNDLED_STAGES.filter((s) => s.mode === 'block')).toHaveLength(200);
    expect(BUNDLED_STAGES.filter((s) => s.mode === 'code')).toHaveLength(100);
  });

  it('id が一意', () => {
    const ids = new Set(BUNDLED_STAGES.map((s) => s.id));
    expect(ids.size).toBe(BUNDLED_STAGES.length);
  });

  it.each(BUNDLED_STAGES.map((s) => [s.id, s] as const))(
    '%s: 盤面が正しくクリア可能',
    (_id, stage) => {
      // しきい値・上限が妥当であること
      expect(stage.starThresholds[0]).toBeGreaterThan(0);
      expect(stage.starThresholds[1]).toBeGreaterThanOrEqual(stage.starThresholds[0]);
      expect(stage.maxSteps).toBeGreaterThan(0);
      if (stage.puzzle) {
        // 配列パズル: 値が重複せず、最初から達成済みでないこと
        const { kind, values } = stage.puzzle;
        expect(values.length).toBeGreaterThanOrEqual(3);
        expect(new Set(values).size).toBe(values.length);
        const asc = [...values].every((v, i) => i === 0 || values[i - 1] <= v);
        const desc = [...values].every((v, i) => i === 0 || values[i - 1] >= v);
        if (kind === 'sort') expect(asc).toBe(false);
        if (kind === 'sortDesc') expect(desc).toBe(false);
        if (kind === 'maxLast') expect(values[values.length - 1]).not.toBe(Math.max(...values));
        if (kind === 'minFirst') expect(values[0]).not.toBe(Math.min(...values));
        expect(stage.template).toBeTruthy();
        return;
      }
      // ナビ問題: 長方形であること
      const w = stage.grid[0].length;
      for (const row of stage.grid) expect(row).toHaveLength(w);
      // スタートが床の上であること
      expect(stage.grid[stage.start.y][stage.start.x]).not.toBe('wall');
      // ゴールが存在すること
      expect(stage.grid.flat()).toContain('goal');
      // クリア可能であること
      expect(solvable(stage)).toBe(true);
    },
  );

  // センサー問題は「右手法」「左手法」どちらの壁伝いプログラムでも
  // maxSteps 内にクリアできること(どちらも正しいアルゴリズムのため)
  const sensorStages = BUNDLED_STAGES.filter((s) => s.allowedBlocks.includes('ifWall'));

  function wallFollow(hand: 'right' | 'left'): Block[] {
    let n = 0;
    const b = (kind: Block['kind'], body?: Block[]): Block => ({ id: `w${n++}`, kind, body });
    const first = hand === 'right' ? 'turnRight' : 'turnLeft';
    const back = hand === 'right' ? 'turnLeft' : 'turnRight';
    return [
      b('repeatForever', [
        b(first),
        b('ifWall', [b(back)]),
        b('ifWall', [b(back)]),
        b('ifWall', [b(back)]),
        b('move'),
      ]),
    ];
  }

  it.each(sensorStages.map((s) => [s.id, s] as const))(
    '%s: 右手法・左手法の両方で解ける',
    (_id, stage) => {
      expect(run(stage, wallFollow('right')).cleared).toBe(true);
      expect(run(stage, wallFollow('left')).cleared).toBe(true);
    },
  );
});
