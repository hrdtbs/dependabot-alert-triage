# TODO: LLMフレンドリーレポート出力への移行

## ドキュメント
- [x] `SPEC.md`: v2.0に更新
- [x] `TODO.md`: 作成

## 型定義・データ構造
- [x] `src/types.ts`: LLM関連型の削除、`AlertReport`/`ScanOptions`の更新

## データ収集
- [x] `src/services/code-search.ts`: スニペット圧縮 (CONTEXT_LINES: 20→5, MAX_TOTAL_LINES: 1000→200, MAX_FILES: 5→3)

## 出力
- [x] `src/output/markdown.ts`: 新規作成（分析指示＋スコアリングマトリクス＋アラート詳細）
- [x] `src/output/json.ts`: 新データ構造に更新（meta/scoringMatrix/analysisPrompt/alerts）

## コマンド・CLI
- [x] `src/commands/scan.ts`: LLM/Scoringフェーズ除去、パイプライン簡素化
- [x] `src/index.ts`: `--model`削除、`--format`を`markdown|json`に変更

## 削除
- [x] `src/services/llm.ts`: 削除
- [x] `src/scoring/matrix.ts`: 削除
- [x] `src/output/table.ts`: 削除
- [x] `tests/services/llm.test.ts`: 削除
- [x] `tests/scoring/matrix.test.ts`: 削除
- [x] `package.json`: AI SDK依存 (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`, `zod`, `cli-table3`) 削除

## テスト
- [x] `tests/output/markdown.test.ts`: 新規作成
- [x] `tests/output/json.test.ts`: 新規作成
