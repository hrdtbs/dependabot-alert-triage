# Dependabot Triage CLI 仕様書 (v3.0)

## 1. システム概要

GitHub Dependabotのアラートに対して、脅威インテリジェンス（KEV, EPSS）とリポジトリ内の実際のコード利用状況を収集し、LLMフレンドリーなレポートとして出力するCLIツール。

ツール自体はLLM APIを呼び出さない。収集したデータとスコアリングロジックを含むレポートを出力し、ユーザーが任意のLLMに渡して分析・最終判定を行う方式を採る。

## 2. コマンド体系

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

## 3. `triage` コマンドの処理フロー

### ステップ1: 認証・スコープ解決

1. `GITHUB_TOKEN`から認証ユーザー情報（login, name）を取得。
2. ユーザーが所属するOrganization一覧を取得。
3. `--scope`指定がある場合はそれを使用。ない場合は対話的に選択肢を表示:
   - 個人アカウント（ユーザー名）
   - 各Organization

### ステップ2: アラート収集

* **Organization選択時**: `listAlertsForOrg` APIで一括取得し、リポジトリ別にグループ化。
* **ユーザー選択時**: 認証ユーザーのリポジトリ一覧を取得し、各リポジトリのアラートを並列取得。アラート0件のリポジトリは除外。

### ステップ3: 脅威情報エンリッチメント

全リポジトリのCVE IDを集約し、KEV照合とEPSSスコア取得を並列実行。

### ステップ4: コンテキスト抽出

各リポジトリをshallow cloneし、アラート対象パッケージの利用箇所を検索。
* リポジトリ単位で並列処理（`--concurrency`で制御）
* 1リポジトリにつき1回のcloneで複数パッケージを検索
* `--skip-code-search`指定時はスキップ

### ステップ5: レポート生成

収集した全データを統合し、指定フォーマットで標準出力に出力。

## 4. `scan` コマンドの処理フロー（既存）

### フェーズ1: アラート・脅威情報の収集 (Data Collection)

1. **GitHub API連携**:
   * 指定リポジトリのOpen状態のDependabotアラートを取得。
   * 取得項目: `CVE ID`, `Package Name`, `Vulnerable Version`, `Manifest Path`, `Description`。

2. **CISA KEV連携**:
   * CISAが提供するKEVカタログ（JSON）を取得（ローカルキャッシュ推奨）。
   * 対象CVEがKEVに存在するか照合し、真偽値を取得。

3. **EPSS連携**:
   * FIRST EPSS API に対象CVEをクエリ。
   * 今後30日間の悪用確率スコア（0.0〜1.0）を取得。

### フェーズ2: コンテキストの抽出 (Context Discovery)

1. **ソースコード検索**:
   * 対象リポジトリをshallow cloneし、`ripgrep (rg)` で対象パッケージ名を検索。
   * 除外: `node_modules`, `vendor`, `.git`, lockファイル。

2. **スニペット抽出**:
   * ヒットした行を中心に、前後5行（計11行）のコードスニペットを抽出。
   * 最大3ファイル、合計200行を上限とする（LLMコンテキストウィンドウを考慮）。

### フェーズ3: レポート生成 (Report Generation)

収集した全データを統合し、指定フォーマット（Markdown or JSON）で標準出力に書き出す。

## 5. 総合評価スコアリングマトリクス

レポート内に埋め込むスコアリングロジック。LLM側で上から順に評価し、最初に合致した条件のスコアを最終スコアとする。

| 優先順位 | KEV | Context | Reachability | EPSS | Final Risk |
| --- | --- | --- | --- | --- | --- |
| 1 | True | - | - | - | CRITICAL |
| 2 | False | Test / Dev | - | - | IGNORE |
| 3 | False | Production | Low | - | LOW |
| 4 | False | Production | High / Medium | >= 閾値 | HIGH |
| 5 | False | Production | High / Medium | < 閾値 | MEDIUM |

## 6. 出力仕様

### 6.1. `scan` コマンドの出力（既存）

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

### 6.2. `triage` コマンドの出力（新規）

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

## 7. 非機能要件・制約事項

* **実行環境**: TypeScript (Node.js) で実装。npxでの実行を想定。
* **依存ツール**: ホスト環境に `git` および `ripgrep (rg)` または `grep` がインストールされていること。
* **スニペット上限**: 1アラートにつき最大3ファイル、合計200行。LLMのコンテキストウィンドウを圧迫しないよう制限する。
* **LLM非依存**: ツール自体はLLM APIを呼び出さない。API keyは`GITHUB_TOKEN`のみ必要。
* **並列制御**: `triage`コマンドのリポジトリ処理はconcurrency制限付きで並列実行。
* **非対話環境対応**: `--scope`フラグによりCI/スクリプトでの利用が可能。
