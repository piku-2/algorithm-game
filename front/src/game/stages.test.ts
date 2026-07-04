import { describe, expect, it } from 'vitest';
import type { Block, BlockType, Direction, Stage } from './types';
import { BUNDLED_STAGES } from './stages';
import { countBlocks, run } from './interpreter';
import rawStages from './stages.data.json';

/** データファイルの solutionBlocks は id なしのネスト形式(front/scripts/gen-stages.ts の BlockJson と同じ) */
interface RawBlock {
  kind: BlockType;
  times?: number;
  body?: RawBlock[];
}

/** 生成データ(JSON)を直接参照する(io/statement/solution/solutionBlocks の構造検証用) */
interface RawStage {
  id: string;
  mode: 'block' | 'code';
  statement?: string;
  solution?: string;
  template?: string;
  puzzle?: unknown;
  solutionBlocks?: RawBlock[];
  allowedBlocks: BlockType[];
  starThresholds: [number, number];
  maxSteps: number;
  io?: {
    inputFormat: string;
    outputFormat: string;
    constraints: string;
    samples: { input: string; output: string; note?: string }[];
    hiddenTests: { input: string; output: string }[];
  };
}
const RAW = new Map((rawStages as unknown as RawStage[]).map((s) => [s.id, s]));

/** id なしの RawBlock[] に id を振って interpreter.run が食える Block[] にする */
function withIds(blocks: RawBlock[], counter: { n: number }): Block[] {
  return blocks.map((b) => ({
    id: `sol${counter.n++}`,
    kind: b.kind,
    times: b.times,
    body: b.body ? withIds(b.body, counter) : undefined,
  }));
}

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
  it('初級100問 + 上級100問ある', () => {
    expect(BUNDLED_STAGES.filter((s) => s.mode === 'block')).toHaveLength(100);
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
      // IO問題: 盤面を持たないのでナビ検証はスキップ(構造は下の describe で検証)
      if (RAW.get(stage.id)?.io) return;
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

  // 初級全問に模範解答ブロック列(solutionBlocks)が付いており、
  // 実際の interpreter.ts で実行してゴールに届き、かつ★3のしきい値以下であること
  const blockStages = BUNDLED_STAGES.filter((s) => s.mode === 'block');

  it.each(blockStages.map((s) => [s.id, s] as const))(
    '%s: solutionBlocks が★3以下でクリアできる',
    (id, stage) => {
      const raw = RAW.get(id)!;
      expect(raw.solutionBlocks, id).toBeTruthy();
      const counter = { n: 0 };
      const blocks = withIds(raw.solutionBlocks!, counter);
      // solutionBlocks が使うブロック種別は、そのステージで許可されたものだけであること
      const usedKinds = new Set<BlockType>();
      const collect = (list: Block[]) => {
        for (const b of list) {
          usedKinds.add(b.kind);
          if (b.body) collect(b.body);
        }
      };
      collect(blocks);
      for (const k of usedKinds) expect(stage.allowedBlocks, id).toContain(k);
      const result = run(stage, blocks);
      expect(result.cleared, id).toBe(true);
      expect(countBlocks(blocks), id).toBeLessThanOrEqual(stage.starThresholds[0]);
    },
  );

  it('初級の難易度は問題番号が大きくなるほど(緩やかに)上がる', () => {
    // 最短手数(move/turnLeft/turnRightのBFS)を各ステージの難易度指標とし、
    // 10問区切りの中央値が単調非減少であることを緩く検証する
    // (センサー問題導入や形状の入れ替えによる局所的な前後は許容する)
    const DELTA: Record<Direction, [number, number]> = {
      up: [0, -1],
      down: [0, 1],
      left: [-1, 0],
      right: [1, 0],
    };
    const shortestActions = (stage: Stage): number => {
      const at = (x: number, y: number) => stage.grid[y]?.[x] ?? 'wall';
      const key = (x: number, y: number, d: Direction) => `${x},${y},${d}`;
      const start = stage.start;
      if (at(start.x, start.y) === 'goal') return 0;
      const seen = new Set([key(start.x, start.y, start.dir)]);
      let queue: [number, number, Direction][] = [[start.x, start.y, start.dir]];
      let depth = 0;
      while (queue.length > 0) {
        depth++;
        const next: [number, number, Direction][] = [];
        for (const [x, y, d] of queue) {
          const cands: [number, number, Direction][] = [
            [x, y, LEFT[d]],
            [x, y, RIGHT[d]],
          ];
          const [dx, dy] = DELTA[d];
          if (at(x + dx, y + dy) !== 'wall') cands.push([x + dx, y + dy, d]);
          for (const c of cands) {
            const k = key(c[0], c[1], c[2]);
            if (seen.has(k)) continue;
            seen.add(k);
            if (at(c[0], c[1]) === 'goal') return depth;
            next.push(c);
          }
        }
        queue = next;
      }
      return Infinity;
    };
    const diffs = blockStages.map(shortestActions);
    const medians: number[] = [];
    for (let i = 0; i < diffs.length; i += 10) {
      const chunk = diffs.slice(i, i + 10).slice().sort((a, b) => a - b);
      medians.push(chunk[Math.floor(chunk.length / 2)]);
    }
    for (let i = 1; i < medians.length; i++) {
      expect(medians[i], `decile ${i} median (${medians[i]}) >= decile ${i - 1} median (${medians[i - 1]})`).toBeGreaterThanOrEqual(
        medians[i - 1],
      );
    }
  });
});

describe('上級ステージの問題文・模範解答・IO問題', () => {
  const rawCode = (rawStages as unknown as RawStage[]).filter((s) => s.mode === 'code');
  const ioStages = rawCode.filter((s) => s.io);

  it('上級はナビ30 + 配列25 + IO45 の計100問', () => {
    const arr = rawCode.filter((s) => s.puzzle).length;
    const nav = rawCode.filter((s) => !s.puzzle && !s.io).length;
    expect(nav).toBe(30);
    expect(arr).toBe(25);
    expect(ioStages).toHaveLength(45);
    expect(rawCode).toHaveLength(100);
  });

  it('上級の全問に statement と solution がある', () => {
    for (const s of rawCode) {
      expect(s.statement, s.id).toBeTruthy();
      expect(s.solution, s.id).toBeTruthy();
    }
  });

  it.each(ioStages.map((s) => [s.id, s] as const))('%s: IO問題の構造が正しい', (_id, s) => {
    const io = s.io!;
    // 入出力形式・制約の説明がある
    expect(io.inputFormat).toBeTruthy();
    expect(io.outputFormat).toBeTruthy();
    expect(io.constraints).toBeTruthy();
    // 表示用の例 2〜3個(最初の例には解説つき)、隠しテスト 3〜6個
    expect(io.samples.length).toBeGreaterThanOrEqual(2);
    expect(io.samples.length).toBeLessThanOrEqual(3);
    expect(io.samples[0].note).toBeTruthy();
    expect(io.hiddenTests.length).toBeGreaterThanOrEqual(3);
    expect(io.hiddenTests.length).toBeLessThanOrEqual(6);
    for (const c of [...io.samples, ...io.hiddenTests]) {
      expect(c.input.length).toBeGreaterThan(0);
      expect(c.output.length).toBeGreaterThan(0);
    }
    // scanf の骨組み入りテンプレートがある
    expect(s.template).toBeTruthy();
    expect(s.template).toContain('scanf');
    expect(s.solution).toContain('#include <stdio.h>');
  });

  it('IO問題のタイトルが重複しない', () => {
    const names = ioStages.map((s) => (rawStages as { id: string; name: string }[]).find((r) => r.id === s.id)!.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
