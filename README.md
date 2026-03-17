# deptriage

Dependabot アラートを脅威インテリジェンス（KEV, EPSS）とコード利用状況で収集・可視化し、LLM によるトリアージを支援する CLI ツール。

## 必要環境

- Node.js >= 18
- Git
- [ripgrep](https://github.com/BurntSushi/ripgrep)（推奨。未インストール時は grep にフォールバック）

## インストール

```bash
npm install
npm run build
```

## 環境変数

### GITHUB_TOKEN

[GitHub CLI](https://cli.github.com/) がインストール済みであれば、以下のように取得できます。

```bash
export GITHUB_TOKEN=$(gh auth token)
```

必要なスコープ: `repo` または `security_events`

## 使い方

### `scan` コマンド（単一リポジトリ）

```bash
deptriage scan --repo <owner/repo> [options]
```

| オプション | 短縮 | デフォルト | 説明 |
|---|---|---|---|
| `--repo` | `-r` | (必須) | 対象の GitHub リポジトリ |
| `--format` | `-f` | `markdown` | 出力形式 (`markdown` / `json`) |
| `--limit` | `-l` | `50` | 評価するアラートの最大件数 |
| `--epss-threshold` | | `0.05` | HIGH 判定の EPSS 閾値 (0.0〜1.0) |

#### 例

```bash
# Markdown 形式で出力（デフォルト）
deptriage scan --repo my-org/my-app

# JSON 形式で出力、上限 10 件
deptriage scan --repo my-org/my-app --format json --limit 10

# ビルドせずに直接実行
node dist/index.js scan --repo my-org/my-app
```

### `triage` コマンド（ユーザー / Organization 全体）

```bash
deptriage triage [options]
```

| オプション | 短縮 | デフォルト | 説明 |
|---|---|---|---|
| `--format` | `-f` | `json` | 出力形式 (`markdown` / `json`) |
| `--limit` | `-l` | `50` | リポジトリあたりの最大アラート数 |
| `--epss-threshold` | | `0.05` | HIGH 判定の EPSS 閾値 (0.0〜1.0) |
| `--scope` | | (対話) | 非対話モード用スコープ (`user` / `org:<name>`) |
| `--concurrency` | | `5` | 並列リポジトリ処理数 |
| `--skip-code-search` | | `false` | コード検索をスキップ（高速モード） |

#### 例

```bash
# 対話形式でスコープを選択
deptriage triage

# Organization 全体を非対話で実行
deptriage triage --scope org:my-company

# ユーザーリポジトリを Markdown 形式で出力
deptriage triage --scope user --format markdown

# コード検索をスキップして高速実行
deptriage triage --scope org:my-company --skip-code-search
```

## 出力の使い方

出力レポートは LLM（Claude, GPT-4 等）に貼り付けて分析させることを想定しています。レポート内にスコアリングマトリクスと分析指示が含まれています。

## リスク評価マトリクス（LLM 用）

LLM は以下の優先順位で評価し、最初に合致した条件のリスクを採用します。

| 優先度 | KEV | コンテキスト | 到達可能性 | EPSS | リスク |
|---|---|---|---|---|---|
| 1 | Yes | - | - | - | **CRITICAL** |
| 2 | No | Test / Dev | - | - | **IGNORE** |
| 3 | No | Production | Low | - | **LOW** |
| 4 | No | Production | High / Medium | >= 閾値 | **HIGH** |
| 5 | No | Production | High / Medium | < 閾値 | **MEDIUM** |

- **KEV**: CISA Known Exploited Vulnerabilities カタログに含まれるか
- **EPSS**: FIRST EPSS API による今後 30 日間の悪用確率
- **到達可能性 / コンテキスト**: LLM がソースコードスニペットを解析して判定
