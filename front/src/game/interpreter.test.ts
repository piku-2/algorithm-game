import { describe, expect, it } from 'vitest';
import type { Block, Stage } from './types';
import { countBlocks, run, starsFor } from './interpreter';

let seq = 0;
const b = (kind: Block['kind'], extra?: Partial<Block>): Block => ({
  id: `t${seq++}`,
  kind,
  ...extra,
});

function stage(rows: string[], x: number, y: number, dir: Stage['start']['dir']): Stage {
  return {
    id: 'test',
    name: 'test',
    mode: 'block',
    grid: rows.map((r) => [...r].map((c) => (c === '#' ? 'wall' : c === 'G' ? 'goal' : 'floor'))),
    start: { x, y, dir },
    allowedBlocks: ['move', 'turnLeft', 'turnRight', 'repeat', 'repeatForever', 'ifWall'],
    starThresholds: [3, 6],
    maxSteps: 200,
    hint: '',
  };
}

describe('run', () => {
  it('まえにすすむ でゴールする', () => {
    const s = stage(['#####', '#..G#', '#####'], 1, 1, 'right');
    const result = run(s, [b('move'), b('move')]);
    expect(result.cleared).toBe(true);
    expect(result.trace.at(-1)).toEqual({ type: 'goal', at: { x: 3, y: 1 }, dir: 'right' });
  });

  it('壁にぶつかると crash で停止する', () => {
    const s = stage(['#####', '#..G#', '#####'], 1, 1, 'up');
    const result = run(s, [b('move'), b('move')]);
    expect(result.cleared).toBe(false);
    expect(result.trace).toEqual([{ type: 'crash', at: { x: 1, y: 1 }, dir: 'up' }]);
  });

  it('turnLeft / turnRight で向きが変わる', () => {
    const s = stage(['#####', '#..G#', '#####'], 1, 1, 'right');
    const result = run(s, [b('turnLeft'), b('turnRight'), b('turnRight')]);
    expect(result.trace.map((e) => (e.type === 'turn' ? e.dir : ''))).toEqual([
      'up',
      'right',
      'down',
    ]);
  });

  it('repeat が子ブロックを N 回実行する', () => {
    const s = stage(['######', '#...G#', '######'], 1, 1, 'right');
    const result = run(s, [b('repeat', { times: 3, body: [b('move')] })]);
    expect(result.cleared).toBe(true);
  });

  it('repeatForever + ifWall(右手法)で迷路を解ける', () => {
    const s = stage(
      ['#########', '#...#...#', '#.#.#.#.#', '#.#...#G#', '#########'],
      1,
      1,
      'right',
    );
    const rightHand = b('repeatForever', {
      body: [
        b('turnRight'),
        b('ifWall', { body: [b('turnLeft')] }),
        b('ifWall', { body: [b('turnLeft')] }),
        b('ifWall', { body: [b('turnLeft')] }),
        b('move'),
      ],
    });
    const result = run(s, [rightHand]);
    expect(result.cleared).toBe(true);
  });

  it('空の repeatForever は stepLimit で必ず停止する', () => {
    const s = stage(['#####', '#..G#', '#####'], 1, 1, 'right');
    const result = run(s, [b('repeatForever', { body: [] })]);
    expect(result.cleared).toBe(false);
    expect(result.trace.at(-1)?.type).toBe('stepLimit');
  });

  it('maxSteps を超えると stepLimit で打ち切る', () => {
    const s = stage(['#####', '#..G#', '#####'], 1, 1, 'right');
    const result = run(s, [
      b('repeat', { times: 99, body: [b('turnLeft'), b('turnRight'), b('turnLeft')] }),
    ]);
    expect(result.cleared).toBe(false);
    expect(result.trace.at(-1)?.type).toBe('stepLimit');
  });
});

describe('countBlocks / starsFor', () => {
  it('ネストしたブロックも数える', () => {
    expect(countBlocks([b('repeat', { times: 2, body: [b('move'), b('turnLeft')] })])).toBe(3);
  });

  it('しきい値で星を決める', () => {
    const s = stage(['####', '#.G#', '####'], 1, 1, 'right');
    expect(starsFor(s, 3)).toBe(3);
    expect(starsFor(s, 4)).toBe(2);
    expect(starsFor(s, 6)).toBe(2);
    expect(starsFor(s, 7)).toBe(1);
  });
});
