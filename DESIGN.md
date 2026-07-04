# DESIGN — 設計書

## 全体アーキテクチャ

```
┌──────────────────────────┐        ┌──────────────────────────┐
│ front/ (TypeScript)      │  REST  │ back/ (Rust)             │
│  React + Vite            │ ◄────► │  axum                    │
│  ・盤面レンダリング       │        │  ・ステージ配信 API       │
│  ・ブロックエディタ       │        │  ・Cコード実行サンドボックス│
│  ・ブロックインタプリタ   │        │  ・進捗保存               │
│  ・トレース再生           │        └──────────────────────────┘
└──────────────────────────┘
```

設計方針: 「プログラム → 実行トレース → 盤面アニメーション」というパイプラインを共通化する。
初級はフロント内インタプリタが、上級はバックエンドの C 実行がトレースを生成し、
再生部分（アニメーション）は同一コードを使う。

## コアデータモデル（front/src/game/types.ts）

```ts
type Direction = 'up' | 'down' | 'left' | 'right';

interface Stage {
  id: string;
  name: string;
  mode: 'block' | 'code';
  grid: Cell[][];            // 'floor' | 'wall' | 'goal'
  start: { x: number; y: number; dir: Direction };
  allowedBlocks: BlockType[];       // 初級: 使えるブロックの制限
  starThresholds: [number, number]; // 初級: [★3のブロック数以下, ★2の…] / 上級: 実行ステップ数
  maxSteps: number;
  hint?: string;
}

// ブロック(コンテナ系は body を持つ)
type BlockType = 'move' | 'turnLeft' | 'turnRight'
  | 'repeat'         // times 回くりかえす
  | 'repeatForever'  // ずっとくりかえす(maxSteps で必ず停止)
  | 'ifWall';        // もし まえがかべなら
interface Block { id: string; kind: BlockType; times?: number; body?: Block[] }

// 上級の配列パズル(ソート等)。ナビ問題は puzzle なし
interface Puzzle { kind: 'sort'|'sortDesc'|'reverse'|'maxLast'|'minFirst'; values: number[] }
// Stage には puzzle?: Puzzle と template?: string(問題別コード雛形)がある

// 実行トレース: 初級・上級で共通のフォーマット(バックエンドも同じ JSON を返す)
type TraceEvent =
  | { type: 'move'; from: Pos; to: Pos; dir: Direction }
  | { type: 'turn'; dir: Direction; at: Pos }
  | { type: 'crash'; at: Pos; dir: Direction }     // 壁衝突
  | { type: 'goal'; at: Pos; dir: Direction }
  | { type: 'stepLimit'; at: Pos; dir: Direction } // ステップ上限
  | { type: 'swap'; i: number; j: number }          // 配列: 交換
  | { type: 'solved' }                              // 配列: 条件達成(クリア)
  | { type: 'unsolved' };                           // 配列: 未達成のまま終了
```

## ステージデータのパイプライン

```
front/scripts/gen-stages.ts  (node --experimental-strip-types で実行)
  │  初級200問(チュートリアル3 + 生成197) + 上級100問を生成。
  │  初級の形状はまっすぐ/まがりかど/ジグザグ/かいだん/うずまき/へびみち/
  │  じゆうなみち/おおべや/わかれみち/どうくつ/めいろ/センサーめいろの12種。
  │  上級はナビ60問(迷路30 + 地形いろいろ30) + 配列パズル40問
  │  (昇順14/降順8/逆順8/最大値5/最小値5)。全問について
  │  ・ナビ: BFS でゴール到達可能 + 右手法・左手法の両方で maxSteps 内に解けること
  │  ・配列: 値が重複せず、最初から達成済みでなく、バブルソートが maxSteps 内なこと
  │  ・同一盤面/同一配列が存在しないこと
  │  を検証し、星しきい値・maxSteps を実測から算出する
  │  (配列の★3しきい値は最小交換回数=サイクル分解、★2は転倒数=バブルソート相当)。
  │  出題順は難易度順(ジッタ付きで形状・問題種別を混合)。
  ├─► data/stages.json                 … 正データ。back が include_str! で同梱・配信
  └─► front/src/game/stages.data.json  … コピー。API 停止時のフロント側フォールバック
```

ステージを追加・変更するときはジェネレータを直して `npm run gen:stages` で再生成する
(2ファイルが常に同期される)。手で JSON を編集しない。

## フロントエンド構成

```
front/
├── index.html
├── package.json
├── vite.config.ts               # /api を localhost:8080 へプロキシ
├── vitest.config.ts
├── nginx.conf / Dockerfile      # デプロイ用
├── scripts/
│   └── gen-stages.ts            # ステージ自動生成+検証(上記パイプライン)
└── src/
    ├── main.tsx
    ├── App.tsx                  # 画面遷移（title / select / play）+ ステージ/進捗ロード
    ├── App.test.tsx             # 画面フローの E2E 相当テスト
    ├── game/
    │   ├── types.ts             # 上記データモデル
    │   ├── stages.ts            # StageJson→Stage 変換、同梱データ、Cコードテンプレート
    │   ├── stages.data.json     # 生成済みステージ(フォールバック用、自動生成物)
    │   ├── api.ts               # バックエンド API クライアント
    │   ├── sound.ts             # 効果音・BGM(WebAudio 合成)
    │   ├── interpreter.ts       # ブロック列 → TraceEvent[] （純粋関数）
    │   ├── simulator.ts         # 盤面状態遷移ロジック（純粋関数）
    │   └── *.test.ts            # インタプリタ単体・全ステージ検証テスト
    ├── components/
    │   ├── TitleScreen.tsx
    │   ├── StageSelect.tsx      # ページング(20問/ページ)・クリア数表示
    │   ├── PlayScreen.tsx       # 盤面 + エディタ + 実行コントロール + トレース再生
    │   ├── Board.tsx            # グリッド描画・キャラアニメーション(セルサイズ自動調整)
    │   ├── ArrayBoard.tsx       # 配列パズルの棒グラフ表示・swap ハイライト
    │   ├── BlockEditor.tsx      # パレット + ワークスペース(クリック追加 & D&D、ネスト描画)
    │   └── CodeEditor.tsx       # CodeMirror + C シンタックスハイライト
    └── styles.css
```

### 設計上のポイント

- **インタプリタは純粋関数**: `run(stage, blocks): RunResult`。UI から分離し単体テスト可能。
  ステップ上限 `maxSteps` を超えたら打ち切り（無限ループ対策）。`repeatForever` は
  空 body でもループごとにステップを消費させて必ず停止させる。
- **再生は TraceEvent 駆動**: PlayScreen の `playTrace()` が setInterval でイベントを1つずつ
  適用する。初級（フロント内インタプリタ）も上級（バックエンドの C 実行）も同じ再生コードを通る。
  速度調整はインターバル変更のみ。
- **状態管理**: React の useState / useReducer で十分。状態管理ライブラリ不使用。
- **ブロック編集はクリックと D&D の両対応**（パレットをクリックで末尾追加 or ドラッグで任意位置へ、
  ブロックの×で削除、↑↓またはドラッグで並べ替え、コンテナへのネスト投入も D&D 可。
  コンテナ自身を自分の中に落とす操作は無効化）。
- **依存ライブラリ**: 実行時依存は React と CodeMirror（コードエディタ）のみ。
  テストは vitest + Testing Library。

## バックエンド構成

```
back/
├── Dockerfile           # rust ビルド + gcc 入りランタイムイメージ
├── runtime/
│   ├── game.h           # 上級モード API のヘッダ(ナビ+配列。ユーザーに見せる契約)
│   └── gamelib.c        # game.h の実装。ステージ読込(N=ナビ/A=配列)・達成判定・
│                        #   トレース書き出し・ステップ上限。他モードの API 呼び出しは失敗
└── src/
    ├── main.rs          # axum ルーティング(/api/stages, /api/progress, /api/run/c)
    ├── stages.rs        # data/stages.json を include_str! で同梱して配信
    ├── progress.rs      # 進捗の SQLite 永続化(ベスト星数のみ更新)
    └── sandbox.rs       # Cコードのコンパイル&実行(隔離)
        trace.rs         # gamelib のトレース行 → TraceEvent JSON(フロントと同一表現)
```

### Cコード実行サンドボックスの方式（決定済み）

検討した候補:
1. **WASM 化**（clang --target=wasm32 + wasmtime）: メモリ・命令数を確実に制限できる。
2. **ネイティブ実行 + リソース制限**: gcc でコンパイルし、OS のリソース制限で隔離。

→ 開発環境に wasm32 ツールチェーン（clang / wasmtime）が無いことを確認したため、
**方式2を採用**。本番をマルチテナントで公開する場合の強化パスとして WASM 化を残す。

方式2の多層防御:
- `setrlimit`: CPU 2秒 / メモリ 256MB / 書き込み 8MB / プロセス数 16
- gamelib 内のステップ上限（全 API 呼び出しをカウント。センサー呼び出しも数える）
- Rust 側の実行タイムアウト（3秒）とコンパイルタイムアウト（10秒）
- `env_clear()` + 一時ディレクトリ実行。コンテナでは read-only FS + no-new-privileges を併用

`game.h` の各 API は `GAME_TRACE` ファイルへの1行1イベントの書き込みとして実装し、
実行終了後に Rust 側でパースして TraceEvent JSON で返す。盤面判定（is_wall_ahead 等）は
gamelib 内に盤面状態を持って同期的に応答する。ユーザーの printf は stdout に出るだけで
トレースを汚染しない。

## デプロイ構成

`docker-compose.yml`: front（nginx が dist を静的配信し `/api/` を back へプロキシ）+
back（gcc 入りイメージ、進捗 DB はボリューム永続化）。

## 画面遷移

```
TitleScreen ──モード選択──► StageSelect ──ステージ選択──► PlayScreen
     ▲                          ▲                            │
     └──────── もどる ──────────┴────── クリア/もどる ───────┘
```
