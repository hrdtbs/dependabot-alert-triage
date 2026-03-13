import type { AlertReport } from "../types.js";

function buildAnalysisPrompt(epssThreshold: number): string {
  const thresholdPercent = (epssThreshold * 100).toFixed(0);
  return `あなたはセキュリティエンジニアです。以下のDependabotアラート一覧を分析し、各アラートについてトリアージを実施してください。

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

結果を以下のテーブル形式で出力し、各アラートに判定理由を簡潔に付記してください:

| # | Package | CVE | KEV | EPSS | Reachability | Context | Final Risk | 理由 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |`;
}

function formatAlert(r: AlertReport): string {
  const lines: string[] = [];

  lines.push(
    `### Alert #${r.alert.number}: ${r.alert.packageName} (${r.alert.cveId ?? "CVE なし"})`
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
    lines.push("#### コード使用箇所");
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

export function renderMarkdown(
  results: AlertReport[],
  repo: string,
  epssThreshold: number
): string {
  const lines: string[] = [];

  lines.push("# Dependabot Alert Triage Report");
  lines.push("");
  lines.push(`- **Repository**: ${repo}`);
  lines.push(`- **Generated**: ${new Date().toISOString()}`);
  lines.push(`- **Alerts**: ${results.length}`);
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

  for (const r of results) {
    lines.push(formatAlert(r));
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}
