# Dependabot Triage CLI 仕様書 (v2.0)

## 1. システム概要

GitHub Dependabotのアラートに対して、脅威インテリジェンス（KEV, EPSS）とリポジトリ内の実際のコード利用状況を収集し、LLMフレンドリーなレポートとして出力するCLIツール。

ツール自体はLLM APIを呼び出さない。収集したデータとスコアリングロジックを含むレポートを出力し、ユーザーが任意のLLMに渡して分析・最終判定を行う方式を採る。

## 2. インターフェース設計

### 2.1. コマンドライン引数

```bash
$ deptriage scan --repo <owner/repo> [options]
```

* `--repo`, `-r` (必須): 対象のGitHubリポジトリ（例: `my-org/my-app`）
* `--format`, `-f` (任意): 出力形式。`markdown` (デフォルト) または `json`
* `--limit`, `-l` (任意): 評価するアラートの最大件数（デフォルト: 50）
* `--epss-threshold` (任意): スコアリング閾値としてレポートに記載するEPSSスコア（デフォルト: `0.05` = 5%）

### 2.2. 環境変数

* `GITHUB_TOKEN`: Dependabot APIおよびソースコード取得用

## 3. 処理フローと機能要件

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
レポートには以下を含める:
* メタ情報（リポジトリ名、生成日時、アラート件数、EPSS閾値）
* 分析指示（LLMに渡すためのプロンプトテンプレート）
* スコアリングマトリクス（判定ロジック）
* 各アラートの詳細情報（脆弱性情報、KEV/EPSSステータス、コードスニペット）

## 4. 総合評価スコアリングマトリクス

レポート内に埋め込むスコアリングロジック。LLM側で上から順に評価し、最初に合致した条件のスコアを最終スコアとする。

| 優先順位 | KEV | Context | Reachability | EPSS | Final Risk |
| --- | --- | --- | --- | --- | --- |
| 1 | True | - | - | - | CRITICAL |
| 2 | False | Test / Dev | - | - | IGNORE |
| 3 | False | Production | Low | - | LOW |
| 4 | False | Production | High / Medium | >= 閾値 | HIGH |
| 5 | False | Production | High / Medium | < 閾値 | MEDIUM |

## 5. 出力仕様

### 5.1. Markdown出力

```
# Dependabot Alert Triage Report
- メタ情報（リポジトリ名、生成日時、アラート件数、EPSS閾値）

## 分析指示
- セキュリティエンジニアとしてのロール指定
- 各アラートに対してreachability/contextを判定する指示
- スコアリングマトリクス
- 出力フォーマット（テーブル形式での最終結果を要求）

## Alert #N: {package} ({CVE})
- 脆弱性情報（バージョン、マニフェスト、説明）
- KEV/EPSSステータス
- コードスニペット
```

### 5.2. JSON出力

```json
{
  "meta": { "repository": "...", "generatedAt": "...", "alertCount": 0, "epssThreshold": 0.05 },
  "scoringMatrix": { "description": "...", "rules": [...] },
  "analysisPrompt": "...",
  "alerts": [
    {
      "number": 1,
      "packageName": "...",
      "cveId": "...",
      "vulnerableVersion": "...",
      "manifestPath": "...",
      "description": "...",
      "kev": false,
      "epss": 0.032,
      "codeSnippets": [{ "filePath": "...", "startLine": 1, "endLine": 11, "content": "..." }]
    }
  ]
}
```

## 6. 非機能要件・制約事項

* **実行環境**: TypeScript (Node.js) で実装。npxでの実行を想定。
* **依存ツール**: ホスト環境に `git` および `ripgrep (rg)` または `grep` がインストールされていること。
* **スニペット上限**: 1アラートにつき最大3ファイル、合計200行。LLMのコンテキストウィンドウを圧迫しないよう制限する。
* **LLM非依存**: ツール自体はLLM APIを呼び出さない。API keyは`GITHUB_TOKEN`のみ必要。
