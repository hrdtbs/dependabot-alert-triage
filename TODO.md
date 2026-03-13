# TODO

## Step 0: ドキュメント整備
- [x] SPEC.md 作成
- [x] TODO.md 作成

## Step 1: プロジェクト初期化
- [x] package.json 作成 (name: deptriage, bin設定)
- [x] tsconfig.json 設定
- [x] tsup.config.ts 設定
- [x] vitest.config.ts 設定
- [x] src/types.ts — 型定義
- [x] src/config.ts — 環境変数読み込み+バリデーション
- [x] src/index.ts — CLIエントリポイント (Commander.js)

## Step 2: データ収集サービス (Phase 1)
- [x] src/services/github.ts — Dependabotアラート取得
- [x] src/services/kev.ts — CISA KEVカタログ照合 (キャッシュ付き)
- [x] src/services/epss.ts — FIRST EPSS APIクエリ
- [x] tests/services/kev.test.ts
- [x] tests/services/epss.test.ts

## Step 3: コンテキスト抽出 (Phase 2)
- [x] src/services/code-search.ts — ripgrep実行+スニペット抽出
- [x] tests/services/code-search.test.ts

## Step 4: LLM解析 (Phase 3)
- [x] src/services/llm.ts — Anthropic SDK連携+構造化出力
- [x] tests/services/llm.test.ts

## Step 5: スコアリング + 出力 (Phase 4)
- [x] src/scoring/matrix.ts — スコアリングマトリクス
- [x] src/output/table.ts — テーブル出力
- [x] src/output/json.ts — JSON出力
- [x] tests/scoring/matrix.test.ts

## Step 6: オーケストレーション
- [x] src/commands/scan.ts — 全フェーズ統合
