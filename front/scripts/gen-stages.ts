/**
 * ステージ自動生成スクリプト。
 *   npm run gen:stages  (node --experimental-strip-types scripts/gen-stages.ts)
 * 初級(ブロック)200問 + 上級(Cコード)100問を生成し、
 * 全ステージについて「クリア可能であること」を検証してから
 *   ../data/stages.json          (バックエンド配信用・正)
 *   src/game/stages.data.json    (フロント同梱フォールバック用コピー)
 * に書き出す。
 *
 * 設計方針:
 * - 形状は8種類(まっすぐ/まがりかど/ジグザグ/かいだん/うずまき/へびみち/じゆうなみち/おおべや)
 *   + 迷路2種(めいろ/センサーめいろ)。同一盤面は除去する。
 * - 出題順はチュートリアル3問のあと、最短手数ベースの難易度順に並べ、
 *   同じ形状が続かないようジッタを加えて混ぜる。
 * - センサー問題と上級問題の maxSteps は右手法・左手法の両方で
 *   解けるだけの余裕を持たせる(どちらも正しいアルゴリズムのため)。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

type Dir = 'up' | 'down' | 'left' | 'right';
type BlockType = 'move' | 'turnLeft' | 'turnRight' | 'repeat' | 'repeatForever' | 'ifWall';

type PuzzleKind = 'sort' | 'sortDesc' | 'reverse' | 'maxLast' | 'minFirst';

interface StageJson {
  id: string;
  name: string;
  mode: 'block' | 'code';
  rows: string[]; // '#'=壁 '.'=床 'G'=ゴール。配列パズルでは空
  start: { x: number; y: number; dir: Dir };
  allowedBlocks: BlockType[];
  starThresholds: [number, number];
  maxSteps: number;
  hint: string;
  puzzle?: { kind: PuzzleKind; values: number[] };
  template?: string;
}

// ---------- 乱数(再現可能) ----------

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260704);
const randInt = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

// ---------- 盤面ユーティリティ ----------

const DELTA: Record<Dir, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};
const DIRS: Dir[] = ['up', 'right', 'down', 'left'];
const LEFT: Record<Dir, Dir> = { up: 'left', left: 'down', down: 'right', right: 'up' };
const RIGHT: Record<Dir, Dir> = { up: 'right', right: 'down', down: 'left', left: 'up' };

class Grid {
  cells: string[][];
  w: number;
  h: number;
  constructor(w: number, h: number, fill = '#') {
    this.w = w;
    this.h = h;
    this.cells = Array.from({ length: h }, () => Array.from({ length: w }, () => fill));
  }
  set(x: number, y: number, c: string) {
    this.cells[y][x] = c;
  }
  get(x: number, y: number): string {
    return this.cells[y]?.[x] ?? '#';
  }
  rows(): string[] {
    return this.cells.map((r) => r.join(''));
  }
}

interface Shape {
  rows: string[];
  start: { x: number; y: number; dir: Dir };
}

/** パスのマス列から盤面を作る(パス以外は壁、最後のマスがゴール) */
function gridFromPath(path: [number, number][], startDir: Dir): Shape {
  const xs = path.map((p) => p[0]);
  const ys = path.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(...xs) - minX + 3;
  const h = Math.max(...ys) - minY + 3;
  const grid = new Grid(w, h);
  for (const [x, y] of path) grid.set(x - minX + 1, y - minY + 1, '.');
  const [gx, gy] = path[path.length - 1];
  grid.set(gx - minX + 1, gy - minY + 1, 'G');
  const [sx, sy] = path[0];
  return {
    rows: grid.rows(),
    start: { x: sx - minX + 1, y: sy - minY + 1, dir: startDir },
  };
}

/** 方向列からパスを作る */
function walk(segs: [Dir, number][]): [number, number][] {
  const path: [number, number][] = [[0, 0]];
  let [x, y] = [0, 0];
  for (const [dir, len] of segs) {
    const [dx, dy] = DELTA[dir];
    for (let i = 0; i < len; i++) {
      x += dx;
      y += dy;
      path.push([x, y]);
    }
  }
  return path;
}

// ---------- 最短手数計算(BFS: 状態=(x,y,dir), 行動=move/turnL/turnR) ----------

function solveLength(rows: string[], start: { x: number; y: number; dir: Dir }): number | null {
  const h = rows.length;
  const w = rows[0].length;
  const at = (x: number, y: number) => (y < 0 || y >= h || x < 0 || x >= w ? '#' : rows[y][x]);
  if (at(start.x, start.y) === 'G') return 0;
  const key = (x: number, y: number, d: Dir) => `${x},${y},${d}`;
  const seen = new Set([key(start.x, start.y, start.dir)]);
  let queue: [number, number, Dir][] = [[start.x, start.y, start.dir]];
  let depth = 0;
  while (queue.length > 0) {
    depth++;
    const next: [number, number, Dir][] = [];
    for (const [x, y, d] of queue) {
      const cands: [number, number, Dir][] = [
        [x, y, LEFT[d]],
        [x, y, RIGHT[d]],
      ];
      const [dx, dy] = DELTA[d];
      if (at(x + dx, y + dy) !== '#') cands.push([x + dx, y + dy, d]);
      for (const c of cands) {
        const k = key(c[0], c[1], c[2]);
        if (seen.has(k)) continue;
        seen.add(k);
        if (at(c[0], c[1]) === 'G') return depth;
        next.push(c);
      }
    }
    queue = next;
  }
  return null;
}

/** 最短の行動列(ブロック数見積り用) */
function solveActions(rows: string[], start: { x: number; y: number; dir: Dir }): string[] | null {
  const h = rows.length;
  const w = rows[0].length;
  const at = (x: number, y: number) => (y < 0 || y >= h || x < 0 || x >= w ? '#' : rows[y][x]);
  if (at(start.x, start.y) === 'G') return [];
  const key = (x: number, y: number, d: Dir) => `${x},${y},${d}`;
  const startKey = key(start.x, start.y, start.dir);
  const prev = new Map<string, { from: string; action: string }>();
  const seen = new Set([startKey]);
  let queue: [number, number, Dir][] = [[start.x, start.y, start.dir]];
  while (queue.length > 0) {
    const next: [number, number, Dir][] = [];
    for (const [x, y, d] of queue) {
      const cands: { x: number; y: number; d: Dir; a: string }[] = [
        { x, y, d: LEFT[d], a: 'L' },
        { x, y, d: RIGHT[d], a: 'R' },
      ];
      const [dx, dy] = DELTA[d];
      if (at(x + dx, y + dy) !== '#') cands.push({ x: x + dx, y: y + dy, d, a: 'M' });
      for (const c of cands) {
        const k = key(c.x, c.y, c.d);
        if (seen.has(k)) continue;
        seen.add(k);
        prev.set(k, { from: key(x, y, d), action: c.a });
        if (at(c.x, c.y) === 'G') {
          const actions: string[] = [];
          let cur = k;
          while (cur !== startKey) {
            const p = prev.get(cur)!;
            actions.unshift(p.action);
            cur = p.from;
          }
          return actions;
        }
        next.push([c.x, c.y, c.d]);
      }
    }
    queue = next;
  }
  return null;
}

/** repeat を使った場合の最小ブロック数の見積り(連続する同一行動を repeat 化) */
function estimateBlocks(actions: string[], repeatAllowed: boolean): number {
  if (!repeatAllowed) return actions.length;
  let n = 0;
  let i = 0;
  while (i < actions.length) {
    let j = i;
    while (j < actions.length && actions[j] === actions[i]) j++;
    const run = j - i;
    n += run >= 3 ? 2 : run; // repeat+中身1個=2ブロック
    i = j;
  }
  return n;
}

// ---------- 壁伝いプログラム(右手法/左手法)のシミュレーション ----------

interface FollowResult {
  /** API 呼び出し数(gamelib のステップ数に相当。is_goal 相当も数える) */
  apiSteps: number;
  /** 移動+回転の数(フロントの星評価に使うトレースステップ数) */
  moveTurns: number;
}

/**
 * ずっとくりかえす[利き手をむく, もしかべ[反対]×3, まえへ] の実行量を返す。
 * ゴール不能なら null。
 */
function simulateWallFollow(
  rows: string[],
  start: { x: number; y: number; dir: Dir },
  hand: 'right' | 'left',
): FollowResult | null {
  const h = rows.length;
  const w = rows[0].length;
  const at = (x: number, y: number) => (y < 0 || y >= h || x < 0 || x >= w ? '#' : rows[y][x]);
  const FIRST = hand === 'right' ? RIGHT : LEFT;
  const BACK = hand === 'right' ? LEFT : RIGHT;
  let { x, y } = start;
  let d = start.dir;
  let apiSteps = 0;
  let moveTurns = 0;
  const LIMIT = 200000;
  const blocked = () => {
    const [dx, dy] = DELTA[d];
    return at(x + dx, y + dy) === '#';
  };
  while (apiSteps < LIMIT) {
    apiSteps++; // is_goal 相当
    if (at(x, y) === 'G') return { apiSteps, moveTurns };
    d = FIRST[d];
    apiSteps++;
    moveTurns++;
    for (let k = 0; k < 3; k++) {
      apiSteps++;
      if (blocked()) {
        d = BACK[d];
        apiSteps++;
        moveTurns++;
      }
    }
    if (blocked()) return null; // 4方向すべて壁(起こらない)
    const [dx, dy] = DELTA[d];
    x += dx;
    y += dy;
    apiSteps++;
    moveTurns++;
  }
  return null;
}

// ---------- 形状ジェネレータ ----------

function corridor(len: number): Shape {
  return gridFromPath(walk([['right', len]]), 'right');
}

function lShape(a: number, b: number, turn: 'down' | 'up'): Shape {
  return gridFromPath(walk([['right', a], [turn, b]]), 'right');
}

function zigzag(segments: number, segLen: number): Shape {
  const segs: [Dir, number][] = [];
  for (let s = 0; s < segments; s++) segs.push([s % 2 === 0 ? 'right' : 'down', segLen]);
  return gridFromPath(walk(segs), 'right');
}

function staircase(steps: number, stepLen: number): Shape {
  const segs: [Dir, number][] = [];
  for (let s = 0; s < steps; s++) {
    segs.push(['right', stepLen]);
    segs.push(['up', stepLen]);
  }
  segs.push(['right', stepLen]);
  return gridFromPath(walk(segs), 'right');
}

/** うずまき: 一定方向に回りながら内側へ。腕の間に壁1枚を残す */
function spiral(size: number, clockwise: boolean): Shape {
  const segs: [Dir, number][] = [];
  const dirs: Dir[] = clockwise ? ['right', 'down', 'left', 'up'] : ['right', 'up', 'left', 'down'];
  let len = size;
  let i = 0;
  segs.push([dirs[0], len]);
  segs.push([dirs[1], len]);
  while (len > 2) {
    len -= 2;
    segs.push([dirs[(i + 2) % 4], len]);
    segs.push([dirs[(i + 3) % 4], len]);
    i += 2;
  }
  return gridFromPath(walk(segs), 'right');
}

/** へびみち: 往復しながら下りていく(蛇行) */
function serpentine(lanes: number, width: number): Shape {
  const segs: [Dir, number][] = [];
  for (let i = 0; i < lanes; i++) {
    segs.push([i % 2 === 0 ? 'right' : 'left', width]);
    if (i < lanes - 1) segs.push(['down', 2]);
  }
  return gridFromPath(walk(segs), 'right');
}

/** じゆうなみち: 自己交差しないランダムな一本道 */
function randomPath(len: number): Shape {
  for (let attempt = 0; attempt < 200; attempt++) {
    const path: [number, number][] = [[0, 0]];
    const seen = new Set(['0,0']);
    let [x, y] = [0, 0];
    let ok = true;
    for (let i = 0; i < len; i++) {
      const cands = DIRS.map((d) => {
        const [dx, dy] = DELTA[d];
        return [x + dx, y + dy] as [number, number];
      }).filter(([nx, ny]) => !seen.has(`${nx},${ny}`));
      if (cands.length === 0) {
        ok = false;
        break;
      }
      [x, y] = pick(cands);
      seen.add(`${x},${y}`);
      path.push([x, y]);
    }
    if (!ok) continue;
    // スタートの向き: 最初の一歩の方向
    const [dx, dy] = [path[1][0] - path[0][0], path[1][1] - path[0][1]];
    const dir = DIRS.find((d) => DELTA[d][0] === dx && DELTA[d][1] === dy)!;
    return gridFromPath(path, dir);
  }
  throw new Error('randomPath: failed to generate');
}

/** わかれみち: 一本道にいきどまりの枝を生やして迷わせる */
function decoyPath(len: number, stubs: number): Shape {
  const base = randomPath(len);
  // rows を可変にして枝を彫る
  const cells = base.rows.map((r) => [...r]);
  const isOpen = (x: number, y: number) => cells[y]?.[x] !== undefined && cells[y][x] !== '#';
  const floors: [number, number][] = [];
  for (let y = 0; y < cells.length; y++) {
    for (let x = 0; x < cells[y].length; x++) {
      if (cells[y][x] === '.') floors.push([x, y]);
    }
  }
  for (let s = 0; s < stubs; s++) {
    const [bx, by] = pick(floors);
    const d = pick(DIRS);
    const stubLen = randInt(1, 3);
    let [x, y] = [bx, by];
    for (let i = 0; i < stubLen; i++) {
      const [dx, dy] = DELTA[d];
      const [nx, ny] = [x + dx, y + dy];
      // 外周の壁1マスは残す
      if (nx <= 0 || ny <= 0 || ny >= cells.length - 1 || nx >= cells[0].length - 1) break;
      if (isOpen(nx, ny)) break;
      cells[ny][nx] = '.';
      [x, y] = [nx, ny];
    }
  }
  return { rows: cells.map((r) => r.join('')), start: base.start };
}

/** どうくつ: セルオートマトンで自然な洞窟を作る。ゴールは最遠の床 */
function cave(w: number, h: number): Shape {
  for (let attempt = 0; attempt < 100; attempt++) {
    let cells: boolean[][] = Array.from({ length: h }, (_, y) =>
      Array.from({ length: w }, (_, x) =>
        x === 0 || y === 0 || x === w - 1 || y === h - 1 ? true : rand() < 0.42,
      ),
    );
    for (let iter = 0; iter < 4; iter++) {
      const next = cells.map((row, y) =>
        row.map((_, x) => {
          if (x === 0 || y === 0 || x === w - 1 || y === h - 1) return true;
          let walls = 0;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              if (cells[y + dy]?.[x + dx] ?? true) walls++;
            }
          return walls >= 5;
        }),
      );
      cells = next;
    }
    // スタート: 左下寄りの床
    let start: [number, number] | null = null;
    outer: for (let y = h - 2; y >= 1; y--) {
      for (let x = 1; x < w - 1; x++) {
        if (!cells[y][x]) {
          start = [x, y];
          break outer;
        }
      }
    }
    if (!start) continue;
    // BFS で最遠の床をゴールに
    const dist = Array.from({ length: h }, () => Array.from({ length: w }, () => -1));
    dist[start[1]][start[0]] = 0;
    let queue: [number, number][] = [start];
    let far: [number, number] = start;
    let reach = 1;
    while (queue.length > 0) {
      const next: [number, number][] = [];
      for (const [x, y] of queue) {
        for (const d of DIRS) {
          const [dx, dy] = DELTA[d];
          const [nx, ny] = [x + dx, y + dy];
          if (cells[ny]?.[nx] !== false || dist[ny][nx] !== -1) continue;
          dist[ny][nx] = dist[y][x] + 1;
          far = [nx, ny];
          reach++;
          next.push([nx, ny]);
        }
      }
      queue = next;
    }
    if (reach < w * h * 0.2 || dist[far[1]][far[0]] < Math.max(w, h)) continue; // 狭すぎ/近すぎは作り直し
    const grid = new Grid(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!cells[y][x]) grid.set(x, y, '.');
    grid.set(far[0], far[1], 'G');
    let dir: Dir = 'right';
    for (const d of DIRS) {
      const [dx, dy] = DELTA[d];
      if (grid.get(start[0] + dx, start[1] + dy) !== '#') {
        dir = d;
        break;
      }
    }
    return { rows: grid.rows(), start: { x: start[0], y: start[1], dir } };
  }
  throw new Error('cave: failed to generate');
}

/** おおべや: 障害物が散らばった広い部屋。ゴールまでの道は BFS で保証 */
function openRoom(w: number, h: number, density: number): Shape {
  for (let attempt = 0; attempt < 200; attempt++) {
    const grid = new Grid(w + 2, h + 2);
    for (let y = 1; y <= h; y++) for (let x = 1; x <= w; x++) grid.set(x, y, '.');
    for (let y = 1; y <= h; y++) {
      for (let x = 1; x <= w; x++) {
        if (rand() < density) grid.set(x, y, '#');
      }
    }
    grid.set(1, h, '.'); // スタート(左下)
    const gx = randInt(Math.ceil(w / 2), w);
    const gy = randInt(1, Math.ceil(h / 2));
    grid.set(gx, gy, 'G'); // ゴールは右上側
    const shape: Shape = { rows: grid.rows(), start: { x: 1, y: h, dir: 'right' } };
    if (solveLength(shape.rows, shape.start) !== null) return shape;
  }
  throw new Error('openRoom: failed to generate');
}

/** DFS で完全迷路を生成(通路幅1、単連結)。ゴールは最遠セル */
function maze(cw: number, ch: number): Shape {
  const grid = new Grid(cw * 2 + 1, ch * 2 + 1);
  const visited = Array.from({ length: ch }, () => Array.from({ length: cw }, () => false));
  const stack: [number, number][] = [[0, 0]];
  visited[0][0] = true;
  grid.set(1, 1, '.');
  while (stack.length > 0) {
    const [cx, cy] = stack[stack.length - 1];
    const neighbors = ([[0, -1], [0, 1], [-1, 0], [1, 0]] as const)
      .map(([dx, dy]) => [cx + dx, cy + dy, dx, dy] as const)
      .filter(([nx, ny]) => nx >= 0 && nx < cw && ny >= 0 && ny < ch && !visited[ny][nx]);
    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }
    const [nx, ny, dx, dy] = pick([...neighbors]);
    visited[ny][nx] = true;
    grid.set(cx * 2 + 1 + dx, cy * 2 + 1 + dy, '.');
    grid.set(nx * 2 + 1, ny * 2 + 1, '.');
    stack.push([nx, ny]);
  }
  // ゴール: スタートから最も遠いセル(セル単位BFS)
  const dist = Array.from({ length: ch }, () => Array.from({ length: cw }, () => -1));
  dist[0][0] = 0;
  let queue: [number, number][] = [[0, 0]];
  let far: [number, number] = [0, 0];
  while (queue.length > 0) {
    const next: [number, number][] = [];
    for (const [cx, cy] of queue) {
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || nx >= cw || ny < 0 || ny >= ch) continue;
        if (dist[ny][nx] !== -1) continue;
        if (grid.get(cx * 2 + 1 + dx, cy * 2 + 1 + dy) === '#') continue;
        dist[ny][nx] = dist[cy][cx] + 1;
        far = [nx, ny];
        next.push([nx, ny]);
      }
    }
    queue = next;
  }
  grid.set(far[0] * 2 + 1, far[1] * 2 + 1, 'G');
  let dir: Dir = 'right';
  for (const d of DIRS) {
    const [dx, dy] = DELTA[d];
    if (grid.get(1 + dx, 1 + dy) !== '#') {
      dir = d;
      break;
    }
  }
  return { rows: grid.rows(), start: { x: 1, y: 1, dir } };
}

// ---------- ステージ組み立て ----------

type ShapeType =
  | 'corridor'
  | 'l'
  | 'zigzag'
  | 'stair'
  | 'spiral'
  | 'serpentine'
  | 'random'
  | 'room'
  | 'decoy'
  | 'cave'
  | 'maze'
  | 'sensor';

const TYPE_NAME: Record<ShapeType, string> = {
  corridor: 'まっすぐのみち',
  l: 'まがりかど',
  zigzag: 'ジグザグ',
  stair: 'かいだん',
  spiral: 'うずまき',
  serpentine: 'へびみち',
  random: 'じゆうなみち',
  room: 'おおべや',
  decoy: 'わかれみち',
  cave: 'どうくつ',
  maze: 'めいろ',
  sensor: 'センサーめいろ',
};

const HINT: Record<ShapeType, string> = {
  corridor: 'まっすぐ すすもう! 「くりかえす」が つかえるなら かつやくするよ。',
  l: 'かどで むきを かえよう!',
  zigzag: 'みぎ、した、みぎ、した… おなじ うごきの くりかえしだ!',
  stair: 'かいだんは おなじ うごきの くりかえしで のぼれるよ!',
  spiral: 'ぐるぐる まわりながら まんなかへ! だんだん みじかくなるよ。',
  serpentine: 'いったりきたり…。おなじ かたちの くりかえしを さがそう!',
  random: 'みちは 1ぽんだけ。じゅんばんに たどっていこう!',
  room: 'ひろい へやだ! とおりみちは じぶんで きめよう。',
  decoy: 'いきどまりに だまされないで! ゴールへの みちは どれかな?',
  cave: 'どうくつを たんけん! とおれる ところを よく みてね。',
  maze: 'ゴールまでの みちを よく みて じゅんばんに すすもう!',
  sensor: '「もし まえがかべなら」と 「ずっとくりかえす」で どんなめいろも とけるよ!',
};

interface Pending {
  type: ShapeType;
  shape: Shape;
  difficulty: number; // 最短手数
  actions: string[];
  sortKey: number;
}

const seenBoards = new Set<string>();

/** 生成関数を、盤面が重複せず解けるものが出るまで呼ぶ */
function makeUnique(type: ShapeType, gen: () => Shape, requireWallFollow = false): Pending {
  for (let attempt = 0; attempt < 2000; attempt++) {
    const shape = gen();
    const sig = shape.rows.join('|') + `@${shape.start.x},${shape.start.y},${shape.start.dir}`;
    if (seenBoards.has(sig)) continue;
    const actions = solveActions(shape.rows, shape.start);
    if (!actions || actions.length === 0) continue;
    if (requireWallFollow) {
      // 上級ナビ用: ループ地形だと壁伝いがゴールに届かないことがあるため生成時に保証する
      if (
        !simulateWallFollow(shape.rows, shape.start, 'right') ||
        !simulateWallFollow(shape.rows, shape.start, 'left')
      ) {
        continue;
      }
    }
    seenBoards.add(sig);
    // ジッタを加えて同難易度の別タイプと混ざるようにする
    return { type, shape, difficulty: actions.length, actions, sortKey: actions.length + rand() * 4 };
  }
  throw new Error(`makeUnique(${type}): failed`);
}

const stages: StageJson[] = [];

function pushBlockStage(id: string, name: string, p: Pending, allowed: BlockType[]) {
  const repeatAllowed = allowed.includes('repeat');
  let star3: number;
  let star2: number;
  let maxSteps: number;
  if (allowed.includes('ifWall')) {
    // センサー問題: 右手法・左手法のどちらでも解けることを保証する
    const r = simulateWallFollow(p.shape.rows, p.shape.start, 'right');
    const l = simulateWallFollow(p.shape.rows, p.shape.start, 'left');
    if (!r || !l) throw new Error(`wall-follow cannot solve: ${id}`);
    star3 = 9; // ずっと+利き手+もしかべ[反対]×3+まえへ = 9ブロック
    star2 = Math.max(p.actions.length, 15);
    maxSteps = Math.max(r.apiSteps, l.apiSteps) * 2 + 100;
  } else {
    star3 = estimateBlocks(p.actions, repeatAllowed);
    star2 = Math.max(p.actions.length, star3 + 1);
    maxSteps = p.actions.length * 3 + 30;
  }
  stages.push({
    id,
    name,
    mode: 'block',
    rows: p.shape.rows,
    start: p.shape.start,
    allowedBlocks: allowed,
    starThresholds: [star3, star2],
    maxSteps,
    hint: HINT[p.type],
  });
}

function pushCodeStage(id: string, name: string, shape: Shape, hint: string) {
  const actions = solveActions(shape.rows, shape.start);
  const r = simulateWallFollow(shape.rows, shape.start, 'right');
  const l = simulateWallFollow(shape.rows, shape.start, 'left');
  if (!actions || !r || !l) {
    console.error(`${id}: actions=${actions?.length} right=${!!r} left=${!!l}`);
    console.error(shape.rows.join('\n'), shape.start);
    throw new Error(`unsolvable code stage: ${id}`);
  }
  // 星は実行ステップ数(move/turn)で評価: ★3=最短の1.5倍, ★2=壁伝い(遅い方)まで
  const star3 = Math.ceil(actions.length * 1.5) + 2;
  const star2 = Math.max(star3 + 1, Math.max(r.moveTurns, l.moveTurns));
  // どちらの利き手の壁伝いでも余裕を持って解ける上限にする
  const maxSteps = Math.max(r.apiSteps, l.apiSteps) * 2 + 100;
  stages.push({
    id,
    name,
    mode: 'code',
    rows: shape.rows,
    start: shape.start,
    allowedBlocks: [],
    starThresholds: [star3, star2],
    maxSteps,
    hint,
  });
}

// --- 初級: チュートリアル3問(固定) ---

const TUTORIALS: { name: string; shape: Shape; allowed: BlockType[]; hint: string }[] = [
  {
    name: 'はじめのいっぽ',
    shape: { rows: ['#####', '#..G#', '#####'], start: { x: 1, y: 1, dir: 'right' } },
    allowed: ['move'],
    hint: '「まえにすすむ」をならべて ゴールまで あるこう!',
  },
  {
    name: 'まがりかど',
    shape: {
      rows: ['######', '#...##', '###.##', '###.G#', '######'],
      start: { x: 1, y: 1, dir: 'right' },
    },
    allowed: ['move', 'turnLeft', 'turnRight'],
    hint: 'かどで 「みぎをむく」「ひだりをむく」を つかおう!',
  },
  {
    name: 'ながいろうか',
    shape: { rows: ['##########', '#.......G#', '##########'], start: { x: 1, y: 1, dir: 'right' } },
    allowed: ['move', 'repeat'],
    hint: 'おなじことの くりかえしは 「くりかえす」ブロックが べんり!',
  },
];

// --- チュートリアルを先に登録(生成問題との盤面重複を防ぐ) ---

{
  let n = 1;
  for (const t of TUTORIALS) {
    const sig =
      t.shape.rows.join('|') + `@${t.shape.start.x},${t.shape.start.y},${t.shape.start.dir}`;
    seenBoards.add(sig);
    const actions = solveActions(t.shape.rows, t.shape.start);
    if (!actions || actions.length === 0) throw new Error(`tutorial unsolvable: ${t.name}`);
    const star3 = estimateBlocks(actions, t.allowed.includes('repeat'));
    stages.push({
      id: `b${String(n).padStart(3, '0')}`,
      name: t.name,
      mode: 'block',
      rows: t.shape.rows,
      start: t.shape.start,
      allowedBlocks: t.allowed,
      starThresholds: [star3, Math.max(actions.length, star3 + 1)],
      maxSteps: actions.length * 3 + 30,
      hint: t.hint,
    });
    n++;
  }
}

// --- 初級: 生成(197問)。量産の単純形は絞り、変化のある形状を厚めに ---

const pendings: Pending[] = [];

for (const len of [3, 4, 5, 6, 9, 12]) {
  pendings.push(makeUnique('corridor', () => corridor(len)));
}
for (let i = 0; i < 8; i++) {
  pendings.push(makeUnique('l', () => lShape(randInt(2, 7), randInt(2, 7), pick(['down', 'up']))));
}
for (let i = 0; i < 10; i++) {
  pendings.push(makeUnique('zigzag', () => zigzag(randInt(2, 6), randInt(1, 4))));
}
for (let i = 0; i < 10; i++) {
  pendings.push(makeUnique('stair', () => staircase(randInt(2, 6), randInt(1, 3))));
}
for (let i = 0; i < 12; i++) {
  pendings.push(makeUnique('spiral', () => spiral(randInt(4, 12), rand() < 0.5)));
}
for (let i = 0; i < 12; i++) {
  pendings.push(makeUnique('serpentine', () => serpentine(randInt(2, 5), randInt(3, 8))));
}
for (let i = 0; i < 14; i++) {
  pendings.push(makeUnique('random', () => randomPath(randInt(6, 26))));
}
for (let i = 0; i < 18; i++) {
  pendings.push(
    makeUnique('room', () => openRoom(randInt(4, 9), randInt(3, 7), 0.12 + rand() * 0.16)),
  );
}
for (let i = 0; i < 15; i++) {
  pendings.push(makeUnique('decoy', () => decoyPath(randInt(8, 22), randInt(2, 5))));
}
for (let i = 0; i < 12; i++) {
  pendings.push(makeUnique('cave', () => cave(randInt(11, 19), randInt(9, 13))));
}
for (let i = 0; i < 38; i++) {
  const size = 3 + Math.floor(i / 7);
  pendings.push(makeUnique('maze', () => maze(randInt(2, size + 1), randInt(2, size))));
}
const sensorPendings: Pending[] = [];
for (let i = 0; i < 42; i++) {
  const size = 3 + Math.floor(i / 7);
  sensorPendings.push(makeUnique('sensor', () => maze(randInt(3, size + 1), randInt(2, size))));
}

// --- 並び順: 難易度(最短手数+ジッタ)順。センサー問題は後半に難易度順で挿入 ---

pendings.sort((a, b) => a.sortKey - b.sortKey);
sensorPendings.sort((a, b) => a.sortKey - b.sortKey);
// センサー問題は 78問目以降(通常問題2問につき1問)に混ぜる
const ordered: Pending[] = [];
{
  let si = 0;
  let normalSince = 0;
  for (const p of pendings) {
    ordered.push(p);
    normalSince++;
    if (ordered.length + TUTORIALS.length > 80 && normalSince >= 2 && si < sensorPendings.length) {
      ordered.push(sensorPendings[si++]);
      normalSince = 0;
    }
  }
  while (si < sensorPendings.length) ordered.push(sensorPendings[si++]);
}

// --- id/名前を振ってステージ化(チュートリアル3問の続きから) ---

{
  let n = TUTORIALS.length + 1;
  const typeCount = new Map<ShapeType, number>();
  for (const p of ordered) {
    const idx = (typeCount.get(p.type) ?? 0) + 1;
    typeCount.set(p.type, idx);
    // 使えるブロック: 難易度と形状で決める
    let allowed: BlockType[];
    if (p.type === 'sensor') {
      allowed = ['move', 'turnLeft', 'turnRight', 'repeat', 'repeatForever', 'ifWall'];
    } else if (p.type === 'corridor') {
      allowed = p.difficulty <= 4 ? ['move'] : ['move', 'repeat'];
    } else if (p.difficulty <= 7) {
      allowed = ['move', 'turnLeft', 'turnRight'];
    } else {
      allowed = ['move', 'turnLeft', 'turnRight', 'repeat'];
    }
    pushBlockStage(
      `b${String(n).padStart(3, '0')}`,
      `${TYPE_NAME[p.type]} ${idx}`,
      p,
      allowed,
    );
    n++;
  }
}

// --- 上級(Cコード)100問: ナビ60問(形状いろいろ) + 配列パズル40問(ソート等) ---
// 迷路だけだと壁伝いの同じプログラムが全問に通ってしまうため、
// 地形バリエーションと、まったく別のアルゴリズムが必要な配列問題を混ぜる。

// 配列パズルのユーティリティ

function shuffledValues(n: number): number[] {
  const pool = Array.from({ length: 99 }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

function targetOf(kind: PuzzleKind, values: number[]): number[] {
  switch (kind) {
    case 'sort':
      return [...values].sort((a, b) => a - b);
    case 'sortDesc':
      return [...values].sort((a, b) => b - a);
    case 'reverse':
      return [...values].reverse();
    case 'maxLast':
    case 'minFirst':
      return values; // 完全な目標順はない(述語で判定)
  }
}

/** 目標順にするための最小 swap 回数(置換のサイクル分解: n - サイクル数) */
function minSwaps(values: number[], target: number[]): number {
  const pos = new Map(target.map((v, i) => [v, i]));
  const perm = values.map((v) => pos.get(v)!);
  const seen = new Array(perm.length).fill(false);
  let cycles = 0;
  for (let i = 0; i < perm.length; i++) {
    if (seen[i]) continue;
    cycles++;
    let j = i;
    while (!seen[j]) {
      seen[j] = true;
      j = perm[j];
    }
  }
  return perm.length - cycles;
}

/** 目標順に対する転倒数(バブルソートの swap 回数) */
function inversions(values: number[], target: number[]): number {
  const pos = new Map(target.map((v, i) => [v, i]));
  const perm = values.map((v) => pos.get(v)!);
  let inv = 0;
  for (let i = 0; i < perm.length; i++)
    for (let j = i + 1; j < perm.length; j++) if (perm[i] > perm[j]) inv++;
  return inv;
}

function puzzleSolved(kind: PuzzleKind, values: number[], initial: number[]): boolean {
  switch (kind) {
    case 'sort':
      return values.every((v, i) => i === 0 || values[i - 1] <= v);
    case 'sortDesc':
      return values.every((v, i) => i === 0 || values[i - 1] >= v);
    case 'reverse':
      return values.every((v, i) => v === initial[values.length - 1 - i]);
    case 'maxLast':
      return values[values.length - 1] === Math.max(...values);
    case 'minFirst':
      return values[0] === Math.min(...values);
  }
}

const PUZZLE_TASK: Record<PuzzleKind, string> = {
  sort: '配列を小さい順(昇順)に並べ替える',
  sortDesc: '配列を大きい順(降順)に並べ替える',
  reverse: '配列をいまと逆の順番に並べ替える',
  maxLast: '一番大きい値を最後(length-1 番目)に移動する',
  minFirst: '一番小さい値を先頭(0 番目)に移動する',
};

const PUZZLE_NAME: Record<PuzzleKind, string> = {
  sort: '小さい順にならべよう',
  sortDesc: '大きい順にならべよう',
  reverse: 'ぎゃくじゅんにしよう',
  maxLast: '一番大きい数を最後へ',
  minFirst: '一番小さい数を先頭へ',
};

const PUZZLE_HINT: Record<PuzzleKind, string> = {
  sort: 'swap_values で交換をくり返して昇順にしよう。バブルソートや選択ソートを調べてみよう。少ない交換回数だと星が増える。',
  sortDesc: '昇順ソートの比較の向きを変えるだけでできる。',
  reverse: '両端から順に swap していくと、何回の交換で終わるかな?',
  maxLast: 'まず全部の値を見て一番大きい値の場所を探し、最後の位置と交換しよう。',
  minFirst: '一番小さい値の場所を探して、先頭と交換しよう。',
};

function arrayTemplate(kind: PuzzleKind): string {
  return `#include "game.h"

// つかえる関数:
//   array_length();     // 配列の長さ
//   get_value(i);       // i 番目(0はじまり)の値
//   swap_values(i, j);  // i 番目と j 番目を入れかえる
//
// 課題: ${PUZZLE_TASK[kind]}。
// 条件を満たした瞬間にクリアになる。

int main(void) {
    int n = array_length();

    // ここにアルゴリズムを書こう

    (void)n;
    return 0;
}
`;
}

interface ArraySpec {
  kind: PuzzleKind;
  values: number[];
  sortKey: number;
}

function makeArraySpec(kind: PuzzleKind, n: number): ArraySpec {
  for (let attempt = 0; attempt < 100; attempt++) {
    const values = shuffledValues(n);
    if (puzzleSolved(kind, values, values)) continue; // 最初から達成済みは作り直し
    const sig = `arr:${kind}:${values.join(',')}`;
    if (seenBoards.has(sig)) continue;
    seenBoards.add(sig);
    return { kind, values, sortKey: n + rand() };
  }
  throw new Error(`makeArraySpec(${kind}): failed`);
}

function pushArrayStage(id: string, name: string, spec: ArraySpec) {
  const n = spec.values.length;
  const target = targetOf(spec.kind, spec.values);
  let star3: number;
  let star2: number;
  if (spec.kind === 'maxLast' || spec.kind === 'minFirst') {
    star3 = 1; // 最適は1回の交換
    star2 = n; // 総当たりで押していっても届く範囲
  } else {
    star3 = minSwaps(spec.values, target) + (spec.kind === 'sort' || spec.kind === 'sortDesc' ? 2 : 0);
    star2 = Math.max(star3 + 1, inversions(spec.values, target));
  }
  stages.push({
    id,
    name,
    mode: 'code',
    rows: [],
    start: { x: 0, y: 0, dir: 'right' },
    allowedBlocks: [],
    starThresholds: [star3, star2],
    // バブルソート(約 3n^2 回の API 呼び出し)でも余裕を持って収まる上限
    maxSteps: 6 * n * n + 200,
    hint: PUZZLE_HINT[spec.kind],
    puzzle: { kind: spec.kind, values: spec.values },
    template: arrayTemplate(spec.kind),
  });
}

// チュートリアル2問

pushCodeStage(
  'c001',
  'まっすぐすすめ',
  { rows: ['########', '#.....G#', '########'], start: { x: 1, y: 1, dir: 'right' } },
  'move_forward() でキャラクターが1マス進む。ループを使ってみよう。',
);
pushCodeStage(
  'c002',
  'はじめての迷路',
  {
    rows: ['#########', '#...#...#', '#.#.#.#.#', '#.#...#G#', '#########'],
    start: { x: 1, y: 1, dir: 'right' },
  },
  'is_wall_ahead() で前方の壁を調べながら進むアルゴリズムを書こう。',
);

// ナビ58問: 迷路30 + 形状いろいろ28

const NAV_HINT_GENERIC =
  '地形に合わせた専用プログラムを書くと少ないステップでクリアできて星が増える。壁センサーで汎用に解いてもよい。';
const navPendings: Pending[] = [];
for (let i = 0; i < 4; i++) {
  navPendings.push(makeUnique('corridor', () => corridor(randInt(4, 20)), true));
}
for (let i = 0; i < 5; i++) {
  navPendings.push(makeUnique('zigzag', () => zigzag(randInt(3, 8), randInt(2, 4)), true));
}
for (let i = 0; i < 5; i++) {
  navPendings.push(makeUnique('spiral', () => spiral(randInt(6, 13), rand() < 0.5), true));
}
for (let i = 0; i < 5; i++) {
  navPendings.push(makeUnique('serpentine', () => serpentine(randInt(3, 6), randInt(4, 9)), true));
}
for (let i = 0; i < 9; i++) {
  navPendings.push(makeUnique('random', () => randomPath(randInt(12, 32)), true));
}
for (let i = 0; i < 30; i++) {
  const size = 4 + Math.floor(i / 6);
  navPendings.push(makeUnique('maze', () => maze(randInt(3, size + 2), randInt(3, size + 1)), true));
}
navPendings.sort((a, b) => a.sortKey - b.sortKey);

// 配列40問: sort14 / sortDesc8 / reverse8 / maxLast5 / minFirst5

const arraySpecs: ArraySpec[] = [];
for (let i = 0; i < 5; i++) arraySpecs.push(makeArraySpec('minFirst', randInt(4, 12)));
for (let i = 0; i < 5; i++) arraySpecs.push(makeArraySpec('maxLast', randInt(4, 12)));
for (let i = 0; i < 8; i++) arraySpecs.push(makeArraySpec('reverse', 3 + i));
for (let i = 0; i < 14; i++) arraySpecs.push(makeArraySpec('sort', 4 + i));
for (let i = 0; i < 8; i++) arraySpecs.push(makeArraySpec('sortDesc', 5 + i));
arraySpecs.sort((a, b) => a.sortKey - b.sortKey);

// ナビと配列を難易度順のまま交互に混ぜる(比率マージ)

{
  let n = 3;
  let ni = 0;
  let ai = 0;
  const navTypeCount = new Map<ShapeType, number>();
  const puzzleTypeCount = new Map<PuzzleKind, number>();
  while (ni < navPendings.length || ai < arraySpecs.length) {
    const navFrac = ni / navPendings.length;
    const arrFrac = ai / arraySpecs.length;
    const id = `c${String(n).padStart(3, '0')}`;
    if (ni < navPendings.length && (ai >= arraySpecs.length || navFrac <= arrFrac)) {
      const p = navPendings[ni++];
      const idx = (navTypeCount.get(p.type) ?? 0) + 1;
      navTypeCount.set(p.type, idx);
      pushCodeStage(
        id,
        `${TYPE_NAME[p.type]} ${idx}`,
        p.shape,
        p.type === 'maze'
          ? '壁センサーを使った探索アルゴリズム(右手法・左手法など)を実装しよう。'
          : NAV_HINT_GENERIC,
      );
    } else {
      const spec = arraySpecs[ai++];
      const idx = (puzzleTypeCount.get(spec.kind) ?? 0) + 1;
      puzzleTypeCount.set(spec.kind, idx);
      pushArrayStage(id, `${PUZZLE_NAME[spec.kind]} ${idx}`, spec);
    }
    n++;
  }
}

// ---------- 検証と書き出し ----------

const blockCount = stages.filter((s) => s.mode === 'block').length;
const codeCount = stages.filter((s) => s.mode === 'code').length;
if (blockCount !== 200 || codeCount !== 100) {
  throw new Error(`stage count mismatch: block=${blockCount} code=${codeCount}`);
}
const ids = new Set(stages.map((s) => s.id));
if (ids.size !== stages.length) throw new Error('duplicate stage id');
// 上級ナビ + センサー問題は左右どちらの壁伝いでも maxSteps 内に解けることを最終確認
for (const s of stages) {
  if ((s.mode === 'code' && !s.puzzle) || s.allowedBlocks.includes('ifWall')) {
    for (const hand of ['right', 'left'] as const) {
      const f = simulateWallFollow(s.rows, s.start, hand);
      if (!f || f.apiSteps > s.maxSteps) {
        throw new Error(`${s.id}: ${hand}-hand wall follow exceeds maxSteps`);
      }
    }
  }
  // 配列問題: バブルソート(約 3n^2+n 回の API 呼び出し)が上限に収まり、初期状態が未達成であること
  if (s.puzzle) {
    const n = s.puzzle.values.length;
    if (3 * n * n + 2 * n + 10 > s.maxSteps) throw new Error(`${s.id}: maxSteps too tight for bubble sort`);
    if (puzzleSolved(s.puzzle.kind, s.puzzle.values, s.puzzle.values)) {
      throw new Error(`${s.id}: puzzle already solved at start`);
    }
    if (new Set(s.puzzle.values).size !== n) throw new Error(`${s.id}: duplicate values`);
  }
}

const here = dirname(fileURLToPath(import.meta.url));
const json = JSON.stringify(stages);
mkdirSync(join(here, '../../data'), { recursive: true });
writeFileSync(join(here, '../../data/stages.json'), json);
writeFileSync(join(here, '../src/game/stages.data.json'), json);
const typeSummary = new Map<string, number>();
for (const s of stages.filter((x) => x.mode === 'block')) {
  const t = s.name.replace(/ \d+$/, '');
  typeSummary.set(t, (typeSummary.get(t) ?? 0) + 1);
}
console.log(`OK: ${blockCount} block + ${codeCount} code stages generated & verified`);
console.log('block types:', Object.fromEntries(typeSummary));
