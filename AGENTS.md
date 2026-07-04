# AGENTS.md — AI エージェント向けガイド

このリポジトリで作業する AI エージェント（Claude Code 等）向けの指針。

## プロジェクト概要

アルゴリズム学習ゲーム。初級は Scratch 風ブロックプログラミング、上級は C 言語でグリッド上のキャラクターをゴールへ導く。
詳細は [SPEC.md](SPEC.md)（仕様）、[DESIGN.md](DESIGN.md)（設計）、[TASKS.md](TASKS.md)（タスク）を必ず先に読むこと。

## リポジトリ構成

- `front/` — フロントエンド。TypeScript + React + Vite。
- `back/` — バックエンド。Rust（axum）。ステージ配信・進捗保存・Cコード実行サンドボックス。
- `data/stages.json` — ステージデータの正。`front/scripts/gen-stages.ts` の生成物。

## 開発コマンド

```bash
# フロント
cd front
npm install
npm run dev         # 開発サーバー (http://localhost:5173、/api は :8080 へプロキシ)
npm run build       # 型チェック込みビルド
npm test            # vitest(インタプリタ単体・全ステージ検証・画面フロー)
npm run gen:stages  # ステージ300問を再生成+検証(data/ と src/game/ の2ファイル同期)

# バックエンド(C コンパイルに gcc が必要)
cd back
cargo run           # http://localhost:8080

# 全体(デプロイ構成)
docker compose up --build   # http://localhost:8000
```

## コーディング規約

- TypeScript は strict モード。`any` を避ける。
- ゲームロジック（`front/src/game/`）は UI に依存しない純粋関数として書く。React から import してよいが逆は不可。
- 実行結果は必ず `TraceEvent[]`（DESIGN.md 参照）で表現する。初級・上級で再生コードを共有するための共通フォーマットであり、勝手に形式を変えないこと。
- UI 文言は日本語（初級はひらがな中心、対象は小学生）。
- 状態管理ライブラリ・UI フレームワークは追加しない（React 標準機能で足りる規模）。依存追加が必要な場合は理由を明記する。現在の実行時依存は React と CodeMirror（コードエディタ用）のみ。
- Rust 側は TraceEvent の JSON 表現をフロント（types.ts）と一致させること（back/src/trace.rs）。

## 作業の進め方

- 作業前に TASKS.md を確認し、完了したタスクにはチェックを付けて更新する。
- 仕様変更を伴う場合は SPEC.md / DESIGN.md も同時に更新する。
- ステージデータは `data/stages.json` / `front/src/game/stages.data.json` を手で編集しない。
  `front/scripts/gen-stages.ts` を修正して `npm run gen:stages` で再生成する
  （ジェネレータが全問のクリア可能性を検証する）。`npm test` でも全ステージが常時検証される。
- サンドボックス（back/src/sandbox.rs）の制限値を緩める変更は理由を明記すること。
