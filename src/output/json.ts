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
      htmlUrl: r.alert.htmlUrl,
      packageName: r.alert.packageName,
      cveId: r.alert.cveId,
      severity: r.alert.severity,
      cvssV3: r.alert.cvssV3,
      cvssV4: r.alert.cvssV4,
      vulnerableVersion: r.alert.vulnerableVersion,
      firstPatchedVersion: r.alert.firstPatchedVersion,
      manifestPath: r.alert.manifestPath,
      dependencyScope: r.alert.dependencyScope,
      description: r.alert.description,
      cwes: r.alert.cwes,
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
