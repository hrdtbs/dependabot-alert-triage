import type { RepoTriageResult, ScopeSelection } from "../types.js";
import { SCORING_MATRIX } from "./shared.js";

function buildAnalysisPrompt(epssThreshold: number): string {
  const thresholdPercent = (epssThreshold * 100).toFixed(0);
  return `あなたはセキュリティエンジニアです。repositoriesの各リポジトリ・各アラートについて、codeSnippetsを確認し、Reachability（High/Medium/Low）とContext（Production/Development/Test）を判定してください。その後scoringMatrixを適用し、Final Riskを決定してください。EPSS閾値は${thresholdPercent}%です。`;
}

function formatScope(scope: ScopeSelection): string {
  if (scope.type === "org") return `org:${scope.org}`;
  if (scope.type === "repo") return `repo:${scope.repo}`;
  return `user:${scope.login}`;
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
        htmlUrl: a.alert.htmlUrl,
        packageName: a.alert.packageName,
        cveId: a.alert.cveId,
        severity: a.alert.severity,
        cvssV3: a.alert.cvssV3,
        cvssV4: a.alert.cvssV4,
        vulnerableVersion: a.alert.vulnerableVersion,
        firstPatchedVersion: a.alert.firstPatchedVersion,
        manifestPath: a.alert.manifestPath,
        dependencyScope: a.alert.dependencyScope,
        description: a.alert.description,
        cwes: a.alert.cwes,
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
