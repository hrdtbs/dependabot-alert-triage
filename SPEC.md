# Dependabot Triage CLI 仕様書 (v1.0 Draft)

## 1. システム概要

GitHub Dependabotのアラートに対して、脅威インテリジェンス（KEV, EPSS）とリポジトリ内の実際のコード利用状況（LLMによる到達可能性解析）を統合し、実質的なリスクスコアを算出して出力するCLIツール。

## 2. インターフェース設計

### 2.1. コマンドライン引数

```bash
$ deptriage scan --repo <owner/repo> [options]
```

* `--repo`, `-r` (必須): 対象のGitHubリポジトリ（例: `my-org/my-app`）
* `--format`, `-f` (任意): 出力形式。`table` (デフォルト) または `json`
* `--limit`, `-l` (任意): 評価するアラートの最大件数（デフォルト: 50）
* `--epss-threshold` (任意): `High`と判定するためのEPSSスコアの閾値（デフォルト: `0.05` = 5%）

### 2.2. 環境変数

* `GITHUB_TOKEN`: Dependabot APIおよびソースコード取得用
* `LLM_API_KEY`: LLM（Gemini/Claude/OpenAI等）呼び出し用

## 3. 処理フローと機能要件

### フェーズ1: アラート・脅威情報の収集 (Data Collection)

1. **GitHub API連携**:
   * 指定リポジトリのOpen状態のDependabotアラートを取得。
   * 取得項目: `CVE ID`, `Package Name`, `Vulnerable Version`, `Manifest Path` (例: `package.json`)。

2. **CISA KEV連携**:
   * CISAが提供するKEVカタログ（JSON）を取得（ローカルキャッシュ推奨）。
   * 対象CVEがKEVに存在するか照合し、真偽値（`True`/`False`）を取得。

3. **EPSS連携**:
   * FIRST EPSS API (`https://api.first.org/data/v1/epss`) に対象CVEをクエリ。
   * 今後30日間の悪用確率（`epss` スコア: 0.0〜1.0）を取得。

### フェーズ2: コンテキストの抽出 (Context Discovery)

1. **ソースコード検索**:
   * 対象リポジトリをローカルにクローン（または既にクローン済みのディレクトリで実行）。
   * `ripgrep (rg)` などの高速検索ツールを使用し、対象の `Package Name` を含むファイルを検索。
   * *除外設定*: `.gitignore` を尊重し、`node_modules`, `vendor`, `.git` 等のディレクトリは検索から除外。

2. **スニペット抽出**:
   * ヒットした行を中心に、前後20行（合計41行）のコードスニペットを抽出。
   * 抽出ファイル数が5ファイルを超える場合は、最初の5ファイルのみに制限（LLMトークン節約のため）。

### フェーズ3: LLMによる解析 (LLM Evaluation)

1. 抽出したスニペット、CVEの詳細説明、パッケージ名をLLMに送信し、以下のJSONスキーマで構造化出力を要求する。
   * **`reachability`**: `High` (対象パッケージの関数・クラスが直接呼び出されている), `Medium` (インポートされているが呼び出しが不明確、または間接的), `Low` (インポートのみ、または全く関係ない)
   * **`context`**: `Production` (本番稼働するコード), `Development` (ビルドスクリプト等), `Test` (テストコード)
   * **`reasoning`**: 判定理由（100文字程度のテキスト）

### フェーズ4: 総合評価 (Scoring)

各指標を用いて、以下の「4. 総合評価スコアリングマトリクス」に従い、最終的な `Final Risk` を算出する。結果を標準出力（TableまたはJSON）に書き出す。

## 4. 総合評価スコアリングマトリクス

上から順に評価し、最初に合致した条件のスコアを最終スコアとします。

| 優先順位 | 条件1 (KEV) | 条件2 (LLM: Context) | 条件3 (LLM: Reachability) | 条件4 (EPSS) | Final Risk |
| --- | --- | --- | --- | --- | --- |
| 1 | **True** | - | - | - | **CRITICAL** |
| 2 | False | `Test` または `Dev` | - | - | **IGNORE** |
| 3 | False | `Production` | `Low` | - | **LOW** |
| 4 | False | `Production` | `High` または `Medium` | `>= 閾値 (例: 5%)` | **HIGH** |
| 5 | False | `Production` | `High` または `Medium` | `< 閾値` | **MEDIUM** |

*※補足: 開発・テスト環境（Dev/Test）での脆弱性は原則悪用が困難なため `IGNORE` または `LOW` とし、ノイズを削減します。*

## 5. LLMプロンプト仕様（システムプロンプト案）

```text
あなたはセキュリティエンジニアです。以下の脆弱性情報とソースコードを確認し、脆弱なパッケージがどのように利用されているかをJSON形式で評価してください。

【脆弱性情報】
- 対象パッケージ: {package_name}
- CVE: {cve_id}
- 詳細: {cve_description}

【ソースコード】
{code_snippets}

【出力要件（JSONのみ出力）】
{
  "reachability": "High | Medium | Low",
  "context": "Production | Development | Test",
  "reasoning": "判定の根拠を日本語で簡潔に記載"
}
```

## 6. 非機能要件・制約事項

* **実行環境**: TypeScript (Node.js) で実装。npxでの実行を想定。
* **依存ツール**: ホスト環境に `git` および `ripgrep (rg)` または `grep` がインストールされていること。
* **LLMのトークン制限**: 1回のアラート解析につき、ソースコードの入力は最大1000行（約1万トークン）程度を上限とし、超過分は切り捨てる安全装置（サーキットブレーカー）を実装する。
