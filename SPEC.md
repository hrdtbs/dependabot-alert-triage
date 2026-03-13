# Dependabot Triage 仕様書 (v4.0)

## 1. システム概要

GitHub Dependabotのアラートに対して、脅威インテリジェンス（KEV, EPSS）とリポジトリ内の実際のコード利用状況を収集・可視化するツール。

v4.0ではCLIに加え、Electronベースの**Desktop App**を提供する。Desktop Appでは、アラートの一覧表示・フィルタリング、暫定リスクスコアリング、キャッシュによるオフライン閲覧、内蔵ターミナルによるAI Agent連携が可能。

CLIは引き続き並行して維持し、CI/スクリプト環境での利用に対応する。

### 1.1. 技術スタック

| レイヤー | 技術 |
|---------|------|
| Desktop フレームワーク | Electron |
| フロントエンド | React + Vite |
| 状態管理 | Zustand |
| テーブル | @tanstack/react-table |
| ターミナル | xterm.js + node-pty |
| キャッシュ DB | better-sqlite3 |
| CSS | Tailwind CSS + shadcn/ui |
| ビルド（Electron） | electron-forge (Vite plugin) |
| ビルド（CLI） | tsup（既存） |
| テスト | Vitest + React Testing Library |

### 1.2. アーキテクチャ

```
┌──────────────────────────────────────┐
│  Main Process (Node.js)              │
│                                      │
│  src/services/*        ← 既存再利用   │
│  src/utils/*           ← 既存再利用   │
│  src/output/*          ← 既存再利用   │
│  src/core/*            ← 共有ロジック  │
│                                      │
│  src/main/ipc-handlers.ts            │
│  src/main/cache-manager.ts           │
│  src/main/pty-manager.ts             │
└────────────┬─────────────────────────┘
             │ IPC (contextBridge)
┌────────────┴─────────────────────────┐
│  Renderer Process (React)            │
│                                      │
│  Dashboard / Alerts / Terminal /     │
│  Settings                            │
└──────────────────────────────────────┘
```

既存サービスコードはMain Processで実行。RendererはIPC経由でのみデータにアクセスする。

### 1.3. ディレクトリ構成

```
src/
  core/                        # 共有オーケストレーター
    scan-orchestrator.ts       #   scan の I/O 非依存ロジック
    triage-orchestrator.ts     #   triage の I/O 非依存ロジック
    scoring.ts                 #   暫定リスクスコアリング
  services/                    # 外部API連携（既存）
  output/                      # レポートレンダラー（既存）
  types.ts                     # 型定義（共有）
  utils/                       # ユーティリティ（既存）
  cli/                         # CLI エントリポイント
    index.ts                   #   Commander.js 登録
    scan.ts                    #   scan CLI アダプター
    triage.ts                  #   triage CLI アダプター
  main/                        # Electron メインプロセス
    index.ts                   #   BrowserWindow 作成
    ipc-handlers.ts            #   IPC ハンドラー
    cache-manager.ts           #   SQLite CRUD
    pty-manager.ts             #   ターミナル管理
  preload/
    preload.ts                 #   contextBridge API
  renderer/                    # React アプリ
    src/
      App.tsx
      pages/                   #   Dashboard, Alerts, Terminal, Settings
      components/              #   Sidebar, AlertTable, AlertDetail 等
      stores/                  #   Zustand ストア
      hooks/                   #   カスタムフック
```

---

## 2. CLI コマンド体系（既存）

### 2.1. `scan` コマンド（単一リポジトリ）

```bash
$ deptriage scan --repo <owner/repo> [options]
```

* `--repo`, `-r` (必須): 対象のGitHubリポジトリ（例: `my-org/my-app`）
* `--format`, `-f` (任意): 出力形式。`markdown` (デフォルト) または `json`
* `--limit`, `-l` (任意): 評価するアラートの最大件数（デフォルト: 50）
* `--epss-threshold` (任意): スコアリング閾値としてレポートに記載するEPSSスコア（デフォルト: `0.05` = 5%）

### 2.2. `triage` コマンド（ユーザー/Organization全体）

```bash
$ deptriage triage [options]
```

* `--format`, `-f` (任意): 出力形式。`markdown` または `json`（デフォルト: `json`）
* `--limit`, `-l` (任意): リポジトリあたりの最大アラート数（デフォルト: 50）
* `--epss-threshold` (任意): EPSSスコア閾値（デフォルト: `0.05`）
* `--scope` (任意): 非対話モードでのスコープ指定。`user` または `org:<name>`
* `--concurrency` (任意): 並列リポジトリ処理数（デフォルト: 5）
* `--skip-code-search` (任意): コード検索をスキップ（高速モード）

### 2.3. 環境変数

* `GITHUB_TOKEN`: Dependabot APIおよびソースコード取得用

---

## 3. 共通処理フロー

CLI・Desktop App共通のコアロジック。`src/core/` に実装する。

### 3.1. scan オーケストレーター

```typescript
runScan(options, token, onProgress) → { reports: AlertReport[], meta: ScanMeta }
```

1. GitHub APIでDependabotアラート取得（カーソルベースページネーション）
2. CVE IDを集約し、KEV照合 + EPSS取得を並列実行
3. 各アラートについてコード検索実行
4. 暫定リスクスコアを算出（Desktop App用）
5. 結果を返却

### 3.2. triage オーケストレーター

```typescript
runTriage(options, token, scope, onProgress) → { results: RepoTriageResult[], meta: TriageMeta }
```

1. スコープに応じてアラート収集（Org一括 or ユーザーリポ並列）
2. 全CVE IDを集約し、KEV + EPSS並列取得
3. リポジトリ単位でコード検索（concurrency制御）
4. 暫定リスクスコアを算出
5. 結果を返却

### 3.3. 進捗コールバック

両オーケストレーターは `onProgress: (message: string) => void` を受け取り、処理の進捗を通知する。

* CLI: `console.error` に出力
* Desktop App: IPC経由でRendererに送信し、UIに表示

---

## 4. 暫定リスクスコアリング

LLMを使わずにアプリ内でリスクレベルを即時算出するヒューリスティック。`src/core/scoring.ts` に実装。

### 4.1. スコアリングルール

上から順に評価し、最初に合致した条件のリスクを採用する。

| 優先順位 | 条件 | Final Risk | Confidence |
|---------|------|-----------|------------|
| 1 | KEV = true | CRITICAL | high |
| 2 | manifestPathがtest/dev系 | IGNORE | medium |
| 3 | コードスニペットなし | LOW | low |
| 4 | EPSS >= 閾値 | HIGH | medium |
| 5 | それ以外 | MEDIUM | medium |

### 4.2. Context推定

`manifestPath` から依存コンテキストを推定する:

* `test`, `spec`, `__tests__` を含む → Test
* `dev`, `tool`, `script` を含む → Dev
* それ以外 → Production

### 4.3. 出力型

```typescript
interface PreliminaryRisk {
  risk: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "IGNORE";
  confidence: "high" | "medium" | "low";
  reason: string;
}
```

UIでは `confidence` が low の場合「暫定 - LLM分析推奨」と表示する。

---

## 5. 総合評価スコアリングマトリクス（LLM用）

レポート内に埋め込むスコアリングロジック。LLM側で上から順に評価し、最初に合致した条件のスコアを最終スコアとする。CLIの出力およびDesktop AppからのAI Agent連携時に使用。

| 優先順位 | KEV | Context | Reachability | EPSS | Final Risk |
| --- | --- | --- | --- | --- | --- |
| 1 | True | - | - | - | CRITICAL |
| 2 | False | Test / Dev | - | - | IGNORE |
| 3 | False | Production | Low | - | LOW |
| 4 | False | Production | High / Medium | >= 閾値 | HIGH |
| 5 | False | Production | High / Medium | < 閾値 | MEDIUM |

---

## 6. Desktop App UI仕様

### 6.1. レイアウト

```
┌──────────┬──────────────────────────────────┐
│ Sidebar  │  メインコンテンツ                  │
│          │                                    │
│ Dashboard│  [各ページの内容]                  │
│ Alerts   │                                    │
│ Terminal  │                                    │
│ Settings │                                    │
│          │                                    │
│ ──────── │                                    │
│ Scope:   │                                    │
│ [org ▾]  │                                    │
│          │                                    │
│ 最終取得:│                                    │
│ 03/14    │                                    │
│ 13:42    │                                    │
│          │                                    │
│ [取得]   │                                    │
└──────────┴──────────────────────────────────┘
```

### 6.2. Dashboard

* サマリーカード: 総アラート数、CRITICAL数、HIGH数、影響リポジトリ数
* リスク分布チャート（CRITICAL/HIGH/MEDIUM/LOW/IGNORE）
* リポジトリ別アラート数棒グラフ
* KEVアラート一覧（即時対応リスト）

### 6.3. Alerts ページ

**テーブル列**:

| 列 | デフォルト表示 | 説明 |
|---|---|---|
| # | Yes | Dependabotアラート番号 |
| Repository | Yes | `owner/repo` |
| Package | Yes | パッケージ名 |
| CVE ID | Yes | CVE識別子（NVDリンク） |
| Manifest | Yes | マニフェストファイルパス |
| KEV | Yes | KEVステータスアイコン |
| EPSS | Yes | EPSSスコア（%表示、色分け） |
| Snippets | Yes | コードスニペット数 |
| Risk | Yes | 暫定リスクバッジ（色分け） |

**フィルタ**:
* Riskレベル（マルチセレクト）
* Repository（マルチセレクト）
* KEVのみ（トグル）
* コード使用あり（トグル）
* EPSS範囲（スライダー）
* テキスト検索（パッケージ名、CVE ID、説明）

**ソート**: 列ヘッダークリック。デフォルト: Risk降順 → EPSS降順。

**グルーピング**: なし / Repository / Risk Level / Package

**詳細ペイン**: 行選択で右側スプリットペイン表示。

* 脆弱性情報（パッケージ、バージョン範囲、説明）
* KEV/EPSSステータス
* シンタックスハイライト付きコードスニペット
* アクション: GitHub で開く、ターミナルに送信、JSONコピー

### 6.4. Terminal ページ

* xterm.js + node-ptyによる内蔵ターミナル
* 複数タブ対応
* クイックアクション:
  - 「全CRITICALを送信」
  - 「現在のアラートを送信」
  - 「レポート全体を送信」
* データ受け渡し方式:
  1. **ファイルパイプ**（推奨）: 一時ファイルに書き出し、コマンドテンプレートで挿入
  2. **クリップボード**: プロンプトとしてコピー
* コマンドテンプレート設定可能（例: `cat {file} | claude`）

### 6.5. Settings ページ

* **認証**: GitHub Token管理（環境変数 / 手動入力 / `gh auth token`）
* **スキャン設定**: EPSS閾値、アラート上限、並列数、コード検索スキップ
* **ターミナル**: コマンドテンプレート、シェル選択
* **キャッシュ**: サイズ表示、クリア
* **表示**: テーマ（ライト/ダーク/システム）

---

## 7. IPC設計

Electron Main/Renderer間の通信チャネル。`contextBridge` で型安全なAPIを公開する。

| チャネル | 方向 | 用途 |
|---------|------|------|
| `auth:validate` | renderer → main | トークン検証、UserInfo返却 |
| `auth:getOrgs` | renderer → main | Organization一覧取得 |
| `scan:run` | renderer → main | スキャン実行、結果返却 |
| `scan:progress` | main → renderer | スキャン進捗通知 |
| `triage:run` | renderer → main | トリアージ実行、結果返却 |
| `triage:progress` | main → renderer | トリアージ進捗通知 |
| `cache:getReport` | renderer → main | キャッシュからレポート取得 |
| `cache:listReports` | renderer → main | レポート履歴一覧 |
| `cache:clear` | renderer → main | キャッシュクリア |
| `terminal:create` | renderer → main | ターミナルセッション作成 |
| `terminal:write` | renderer → main | ターミナルへデータ送信 |
| `terminal:data` | main → renderer | ターミナル出力ストリーム |
| `terminal:close` | renderer → main | ターミナル終了 |
| `settings:get` | renderer → main | 設定値取得 |
| `settings:set` | renderer → main | 設定値保存 |

---

## 8. キャッシュ設計

**保存先**: `~/.deptriage/cache.db` (better-sqlite3)

### 8.1. スキーマ

```sql
CREATE TABLE scans (
  id TEXT PRIMARY KEY,
  scope_type TEXT NOT NULL,
  scope_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  epss_threshold REAL NOT NULL,
  total_alerts INTEGER NOT NULL,
  repo_count INTEGER NOT NULL,
  report_json TEXT NOT NULL
);

CREATE TABLE alert_index (
  scan_id TEXT REFERENCES scans(id) ON DELETE CASCADE,
  repo TEXT NOT NULL,
  alert_number INTEGER NOT NULL,
  package_name TEXT NOT NULL,
  cve_id TEXT,
  kev INTEGER NOT NULL,
  epss REAL,
  preliminary_risk TEXT,
  PRIMARY KEY (scan_id, repo, alert_number)
);

CREATE TABLE kev_cache (
  fetched_at TEXT NOT NULL,
  cve_ids TEXT NOT NULL
);

CREATE TABLE epss_cache (
  cve_id TEXT PRIMARY KEY,
  score REAL,
  fetched_at TEXT NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### 8.2. TTL

* **KEV**: 24時間
* **EPSS**: 24時間
* **スキャン結果**: 無期限（手動削除）

---

## 9. CLI出力仕様（既存）

### 9.1. `scan` コマンドの出力

#### Markdown出力

```
# Dependabot Alert Triage Report
- メタ情報（リポジトリ名、生成日時、アラート件数、EPSS閾値）

## 分析指示
- セキュリティエンジニアとしてのロール指定
- スコアリングマトリクス
- 出力フォーマット要求

## Alert #N: {package} ({CVE})
- 脆弱性情報、KEV/EPSSステータス、コードスニペット
```

#### JSON出力

```json
{
  "meta": { "repository": "...", "generatedAt": "...", "alertCount": 0, "epssThreshold": 0.05 },
  "scoringMatrix": { ... },
  "analysisPrompt": "...",
  "alerts": [{ "number": 1, "packageName": "...", ... }]
}
```

### 9.2. `triage` コマンドの出力

#### JSON出力

```json
{
  "meta": {
    "scope": "org:my-company",
    "generatedAt": "2026-03-13T...",
    "repositoryCount": 3,
    "totalAlertCount": 42,
    "epssThreshold": 0.05
  },
  "scoringMatrix": { ... },
  "analysisPrompt": "...",
  "repositories": [
    {
      "repository": "my-company/frontend",
      "alertCount": 15,
      "alerts": [
        {
          "number": 1,
          "packageName": "lodash",
          "cveId": "CVE-2021-23337",
          "vulnerableVersion": "< 4.17.21",
          "manifestPath": "package.json",
          "description": "...",
          "kev": false,
          "epss": 0.032,
          "codeSnippets": [{ "filePath": "...", "startLine": 1, "endLine": 11, "content": "..." }]
        }
      ]
    }
  ]
}
```

#### Markdown出力

```
# Dependabot Triage Report
- メタ情報（スコープ、生成日時、リポジトリ数、総アラート件数、EPSS閾値）

## 分析指示
- スコアリングマトリクス

## Repository: owner/repo (N alerts)

### Alert #N: {package} ({CVE})
- 脆弱性情報、KEV/EPSSステータス、コードスニペット
```

---

## 10. 非機能要件・制約事項

* **実行環境**: TypeScript (Node.js)。CLIはnpxでの実行を想定。Desktop AppはElectronパッケージとして配布。
* **依存ツール**: ホスト環境に `git` および `ripgrep (rg)` または `grep` がインストールされていること。
* **スニペット上限**: 1アラートにつき最大3ファイル、合計200行。
* **LLM非依存**: ツール自体はLLM APIを呼び出さない。暫定スコアリングはヒューリスティックで算出。
* **並列制御**: リポジトリ処理はconcurrency制限付きで並列実行。
* **非対話環境対応**: CLIは`--scope`フラグによりCI/スクリプトでの利用が可能。
* **セキュリティ**: Electronの`contextIsolation: true`、`nodeIntegration: false`を徹底。GitHub Tokenは安全に管理。
