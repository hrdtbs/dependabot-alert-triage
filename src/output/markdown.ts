import type { AlertReport } from "../types.js";
import { buildMarkdownAnalysisPrompt } from "./shared.js";

function formatAlert(r: AlertReport): string {
  const lines: string[] = [];

  const cvssLabel = r.alert.cvssV4
    ? `${r.alert.cvssV4.score} (v4)`
    : r.alert.cvssV3
      ? `${r.alert.cvssV3.score} (v3)`
      : "N/A";

  lines.push(
    `### Alert #${r.alert.number}: ${r.alert.packageName} (${r.alert.cveId ?? "CVE なし"})`
  );
  lines.push("");
  lines.push(`- **Severity**: ${r.alert.severity}`);
  lines.push(`- **CVSS**: ${cvssLabel}`);
  lines.push(`- **KEV**: ${r.kev ? "Yes" : "No"}`);
  lines.push(
    `- **EPSS**: ${r.epss !== null ? `${(r.epss * 100).toFixed(1)}%` : "N/A"}`
  );
  if (r.alert.cwes.length > 0) {
    lines.push(
      `- **CWE**: ${r.alert.cwes.map((c) => `${c.cweId} (${c.name})`).join(", ")}`
    );
  }
  lines.push(`- **脆弱バージョン**: ${r.alert.vulnerableVersion}`);
  if (r.alert.firstPatchedVersion) {
    lines.push(`- **修正バージョン**: ${r.alert.firstPatchedVersion}`);
  }
  lines.push(`- **マニフェスト**: ${r.alert.manifestPath}`);
  if (r.alert.dependencyScope) {
    lines.push(`- **スコープ**: ${r.alert.dependencyScope}`);
  }
  lines.push(`- **説明**: ${r.alert.description}`);
  lines.push(`- **URL**: ${r.alert.htmlUrl}`);

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
  lines.push(buildMarkdownAnalysisPrompt(
    epssThreshold,
    "以下のDependabotアラート一覧を分析し、各アラートについてトリアージを実施してください。",
    "結果を以下のテーブル形式で出力し、各アラートに判定理由を簡潔に付記してください:"
  ));

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
