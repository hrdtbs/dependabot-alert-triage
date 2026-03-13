# deptriage

Dependabot アラートを脅威インテリジェンス（KEV, EPSS）と LLM によるコード到達可能性解析でトリアージする CLI ツール。

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

### LLM API キー

使用する LLM プロバイダーに応じた環境変数を設定します。

| プロバイダー | 環境変数 | モデル例 |
|---|---|---|
| Anthropic | `ANTHROPIC_API_KEY` | `anthropic:claude-sonnet-4-20250514` |
| OpenAI | `OPENAI_API_KEY` | `openai:gpt-4o` |
| Google | `GOOGLE_GENERATIVE_AI_API_KEY` | `google:gemini-2.0-flash` |

```bash
# 例: Anthropic を使う場合
export ANTHROPIC_API_KEY=sk-ant-...
```

## 使い方

```bash
deptriage scan --repo <owner/repo> [options]
```

### オプション

| オプション | 短縮 | デフォルト | 説明 |
|---|---|---|---|
| `--repo` | `-r` | (必須) | 対象の GitHub リポジトリ |
| `--format` | `-f` | `table` | 出力形式 (`table` / `json`) |
| `--limit` | `-l` | `50` | 評価するアラートの最大件数 |
| `--epss-threshold` | | `0.05` | HIGH 判定の EPSS 閾値 (0.0〜1.0) |
| `--model` | `-m` | `anthropic:claude-sonnet-4-20250514` | LLM モデル (`provider:model` 形式) |

### 例

```bash
# テーブル形式で出力
deptriage scan --repo my-org/my-app

# JSON 形式で出力、上限 10 件
deptriage scan --repo my-org/my-app --format json --limit 10

# OpenAI のモデルを使用
deptriage scan --repo my-org/my-app --model openai:gpt-4o

# ビルドせずに直接実行
node dist/index.js scan --repo my-org/my-app
```

## リスク評価

各アラートに対して以下の情報を統合し、最終リスクを判定します。

| 優先度 | KEV | コンテキスト | 到達可能性 | EPSS | リスク |
|---|---|---|---|---|---|
| 1 | Yes | - | - | - | **CRITICAL** |
| 2 | No | Test / Dev | - | - | **IGNORE** |
| 3 | No | Production | Low | - | **LOW** |
| 4 | No | Production | High / Medium | >= 閾値 | **HIGH** |
| 5 | No | Production | High / Medium | < 閾値 | **MEDIUM** |

- **KEV**: CISA Known Exploited Vulnerabilities カタログに含まれるか
- **EPSS**: FIRST EPSS API による今後 30 日間の悪用確率
- **到達可能性 / コンテキスト**: LLM がソースコードを解析して判定
