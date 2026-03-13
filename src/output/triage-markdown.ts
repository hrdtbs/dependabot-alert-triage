import type {
  AlertReport,
  RepoTriageResult,
  ScopeSelection,
} from "../types.js";

function buildAnalysisPrompt(epssThreshold: number): string {
  const thresholdPercent = (epssThreshold * 100).toFixed(0);
  return `あなたはセキュリティエンジニアです。以下の各リポジトリのDependabotアラートを分析し、各アラートについてトリアージを実施してください。

各アラートについて、コードスニペットを確認し以下を判定してください:
- **Reachability**: High（対象パッケージの関数・クラスが直接呼び出されている）/ Medium（インポートされているが呼び出しが不明確）/ Low（インポートのみ、または使用箇所なし）
- **Context**: Production（本番コード）/ Development（ビルドスクリプト等）/ Test（テストコード）

判定後、以下のスコアリングマトリクスを上から順に適用し、最初に合致した条件のFinal Riskを割り当ててください:

| 優先順位 | KEV | Context | Reachability | EPSS | Final Risk |
| --- | --- | --- | --- | --- | --- |
| 1 | True | - | - | - | CRITICAL |
| 2 | False | Test / Dev | - | - | IGNORE |
| 3 | False | Production | Low | - | LOW |
| 4 | False | Production | High / Medium | >= ${thresholdPercent}% | HIGH |
| 5 | False | Production | High / Medium | < ${thresholdPercent}% | MEDIUM |

結果をリポジトリごとにテーブル形式で出力し、各アラートに判定理由を簡潔に付記してください:

| # | Package | CVE | KEV | EPSS | Reachability | Context | Final Risk | 理由 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |`;
}

function formatScope(scope: ScopeSelection): string {
  return scope.type === "org" ? `org:${scope.org}` : `user:${scope.login}`;
}

function formatAlert(r: AlertReport): string {
  const lines: string[] = [];

  lines.push(
    `#### Alert #${r.alert.number}: ${r.alert.packageName} (${r.alert.cveId ?? "CVE なし"})`
  );
  lines.push("");
  lines.push(`- **脆弱バージョン**: ${r.alert.vulnerableVersion}`);
  lines.push(`- **マニフェスト**: ${r.alert.manifestPath}`);
  lines.push(`- **説明**: ${r.alert.description}`);
  lines.push(`- **KEV**: ${r.kev ? "Yes" : "No"}`);
  lines.push(
    `- **EPSS**: ${r.epss !== null ? `${(r.epss * 100).toFixed(1)}%` : "N/A"}`
  );

  if (r.codeSearch.snippets.length > 0) {
    lines.push("");
    lines.push("##### コード使用箇所");
    for (const s of r.codeSearch.snippets) {
      lines.push("");
      lines.push(`\`${s.filePath}\` (L${s.startLine}-L${s.endLine}):`);
      lines.push("```");
      lines.push(s.content);
      lines.push("```");
    }
  } else {
    lines.push("");
    lines.push(
      "*対象パッケージのコード使用箇所が見つかりませんでした。*"
    );
  }

  return lines.join("\n");
}

export function renderTriageMarkdown(
  repos: RepoTriageResult[],
  scope: ScopeSelection,
  epssThreshold: number
): string {
  const totalAlertCount = repos.reduce(
    (sum, r) => sum + r.alerts.length,
    0
  );

  const lines: string[] = [];

  lines.push("# Dependabot Triage Report");
  lines.push("");
  lines.push(`- **Scope**: ${formatScope(scope)}`);
  lines.push(`- **Generated**: ${new Date().toISOString()}`);
  lines.push(`- **Repositories**: ${repos.length}`);
  lines.push(`- **Total Alerts**: ${totalAlertCount}`);
  lines.push(
    `- **EPSS Threshold**: ${(epssThreshold * 100).toFixed(0)}%`
  );

  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## 分析指示");
  lines.push("");
  lines.push(buildAnalysisPrompt(epssThreshold));

  lines.push("");
  lines.push("---");
  lines.push("");

  for (const repoResult of repos) {
    lines.push(
      `## Repository: ${repoResult.repo} (${repoResult.alerts.length} alerts)`
    );
    lines.push("");

    for (const alert of repoResult.alerts) {
      lines.push(formatAlert(alert));
      lines.push("");
    }

    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}
