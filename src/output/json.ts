import type { AlertReport } from "../types.js";
import { SCORING_MATRIX } from "./shared.js";

function buildAnalysisPrompt(epssThreshold: number): string {
  const thresholdPercent = (epssThreshold * 100).toFixed(0);
  return `あなたはセキュリティエンジニアです。alertsの各アラートについて、codeSnippetsを確認し、Reachability（High/Medium/Low）とContext（Production/Development/Test）を判定してください。その後scoringMatrixを適用し、Final Riskを決定してください。EPSS閾値は${thresholdPercent}%です。`;
}

export function renderJson(
  results: AlertReport[],
  repo: string,
  epssThreshold: number
): string {
  const output = {
    meta: {
      repository: repo,
      generatedAt: new Date().toISOString(),
      alertCount: results.length,
      epssThreshold,
    },
    scoringMatrix: SCORING_MATRIX,
    analysisPrompt: buildAnalysisPrompt(epssThreshold),
    alerts: results.map((r) => ({
      number: r.alert.number,
      packageName: r.alert.packageName,
      cveId: r.alert.cveId,
      vulnerableVersion: r.alert.vulnerableVersion,
      manifestPath: r.alert.manifestPath,
      description: r.alert.description,
      kev: r.kev,
      epss: r.epss,
      codeSnippets: r.codeSearch.snippets.map((s) => ({
        filePath: s.filePath,
        startLine: s.startLine,
        endLine: s.endLine,
        content: s.content,
      })),
    })),
  };

  return JSON.stringify(output, null, 2);
}
