import type {
  AlertReport,
  RepoTriageResult,
  ScopeSelection,
} from "../types.js";
import { buildMarkdownAnalysisPrompt } from "./shared.js";

function formatScope(scope: ScopeSelection): string {
  if (scope.type === "org") return `org:${scope.org}`;
  if (scope.type === "repo") return `repo:${scope.repo}`;
  return `user:${scope.login}`;
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
  lines.push(buildMarkdownAnalysisPrompt(
    epssThreshold,
    "以下の各リポジトリのDependabotアラートを分析し、各アラートについてトリアージを実施してください。",
    "結果をリポジトリごとにテーブル形式で出力し、各アラートに判定理由を簡潔に付記してください:"
  ));

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
