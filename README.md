# アルゴリズムクエスト

プログラムを書いてキャラクターをゴールへ導く、アルゴリズム学習ゲーム。

- **しょきゅう**: Scratch 風ブロックプログラミング（200問）
- **上級**: C言語で本格プログラミング（100問、バックエンドのサンドボックスで実行）

ドキュメント: [SPEC.md](SPEC.md) / [DESIGN.md](DESIGN.md) / [TASKS.md](TASKS.md) / [AGENTS.md](AGENTS.md)

## 起動方法

```bash
# バックエンド(上級モードの C 実行に必要。gcc 必須)
cd back && cargo run          # http://localhost:8080

# フロント(別ターミナル)
cd front && npm install && npm run dev   # http://localhost:5173
```

バックエンドを起動しなくても、初級モードは同梱ステージデータで完全に遊べる。

### Docker でまとめて起動

```bash
docker compose up --build    # http://localhost:8000
```

## 構成

- `front/` — TypeScript + React + Vite
- `back/` — Rust + axum（ステージ配信 / 進捗保存(SQLite) / C コード実行サンドボックス）
- `data/stages.json` — ステージデータ（`front/scripts/gen-stages.ts` が生成・検証）
