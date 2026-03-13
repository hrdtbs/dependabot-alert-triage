import type { TriageResult } from "../types.js";

export function renderJson(results: TriageResult[]): void {
  const output = results.map((r) => ({
    alertNumber: r.alert.number,
    packageName: r.alert.packageName,
    cveId: r.alert.cveId,
    vulnerableVersion: r.alert.vulnerableVersion,
    manifestPath: r.alert.manifestPath,
    kev: r.kev,
    epss: r.epss,
    reachability: r.llmEvaluation.reachability,
    context: r.llmEvaluation.context,
    reasoning: r.llmEvaluation.reasoning,
    finalRisk: r.finalRisk,
  }));

  console.log(JSON.stringify(output, null, 2));
}
