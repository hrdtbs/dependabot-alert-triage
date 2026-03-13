import type { RepoTriageResult, ScopeSelection } from "../types.js";

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
  return `あなたはセキュリティエンジニアです。repositoriesの各リポジトリ・各アラートについて、codeSnippetsを確認し、Reachability（High/Medium/Low）とContext（Production/Development/Test）を判定してください。その後scoringMatrixを適用し、Final Riskを決定してください。EPSS閾値は${thresholdPercent}%です。`;
}

function formatScope(scope: ScopeSelection): string {
  return scope.type === "org" ? `org:${scope.org}` : `user:${scope.login}`;
}

export function renderTriageJson(
  repos: RepoTriageResult[],
  scope: ScopeSelection,
  epssThreshold: number
): string {
  const totalAlertCount = repos.reduce(
    (sum, r) => sum + r.alerts.length,
    0
  );

  const output = {
    meta: {
      scope: formatScope(scope),
      generatedAt: new Date().toISOString(),
      repositoryCount: repos.length,
      totalAlertCount,
      epssThreshold,
    },
    scoringMatrix: SCORING_MATRIX,
    analysisPrompt: buildAnalysisPrompt(epssThreshold),
    repositories: repos.map((r) => ({
      repository: r.repo,
      alertCount: r.alerts.length,
      alerts: r.alerts.map((a) => ({
        number: a.alert.number,
        packageName: a.alert.packageName,
        cveId: a.alert.cveId,
        vulnerableVersion: a.alert.vulnerableVersion,
        manifestPath: a.alert.manifestPath,
        description: a.alert.description,
        kev: a.kev,
        epss: a.epss,
        codeSnippets: a.codeSearch.snippets.map((s) => ({
          filePath: s.filePath,
          startLine: s.startLine,
          endLine: s.endLine,
          content: s.content,
        })),
      })),
    })),
  };

  return JSON.stringify(output, null, 2);
}
