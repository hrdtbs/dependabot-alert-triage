# TODO: triage コマンド追加（User/Org全体トリアージ）

## ドキュメント
- [x] `SPEC.md`: v3.0に更新
- [x] `TODO.md`: 作成

## 型定義・ユーティリティ
- [x] `src/types.ts`: 新型定義追加（UserInfo, OrgInfo, ScopeSelection, RepoAlerts, TriageOptions, TriageReport等）
- [x] `src/utils/concurrency.ts`: pLimit並列制御ユーティリティ作成

## サービス層
- [x] `src/services/github-user.ts`: fetchAuthenticatedUser, fetchUserOrgs, fetchAlertsForOrg, fetchAlertsForUser
- [x] `src/services/prompt.ts`: selectScope（@inquirer/prompts使用）、parseScope
- [x] `src/services/code-search.ts`: searchCodeMultiPackage()追加

## 出力
- [x] `src/output/triage-json.ts`: マルチリポJSON出力レンダラー
- [x] `src/output/triage-markdown.ts`: マルチリポMarkdown出力レンダラー

## コマンド・CLI
- [x] `src/commands/triage.ts`: triageコマンド実装
- [x] `src/index.ts`: triageコマンド登録

## 依存関係
- [x] `package.json`: `@inquirer/prompts`追加、バージョン0.3.0

## テスト
- [x] `tests/services/github-user.test.ts`
- [x] `tests/services/prompt.test.ts`
- [x] `tests/output/triage-json.test.ts`
- [x] `tests/output/triage-markdown.test.ts`

## 検証
- [x] typecheck通過
- [x] 既存テスト通過（27テスト）
- [x] 新規テスト通過（28テスト）
- [x] ビルド成功
