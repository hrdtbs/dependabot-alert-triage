import type { AlertReport } from "../types.js";

const SCORING_MATRIX = {
  description:
    "上から順に評価し、最初に合致した条件のFinal Riskを割り当てる",
  rules: [
    {
      priority: 1,
      kev: true,
      context: null,
      reachability: null,
      epss: null,
      finalRisk: "CRITICAL",
    },
    {
      priority: 2,
      kev: false,
      context: "Test / Development",
      reachability: null,
      epss: null,
      finalRisk: "IGNORE",
    },
    {
      priority: 3,
      kev: false,
      context: "Production",
      reachability: "Low",
      epss: null,
      finalRisk: "LOW",
    },
    {
      priority: 4,
      kev: false,
      context: "Production",
      reachability: "High / Medium",
      epss: ">= threshold",
      finalRisk: "HIGH",
    },
    {
      priority: 5,
      kev: false,
      context: "Production",
      reachability: "High / Medium",
      epss: "< threshold",
      finalRisk: "MEDIUM",
    },
  ],
};

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
