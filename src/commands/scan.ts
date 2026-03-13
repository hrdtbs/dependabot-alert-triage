import { loadConfig } from "../config.js";
import { fetchDependabotAlerts } from "../services/github.js";
import { checkKev } from "../services/kev.js";
import { fetchEpssScores } from "../services/epss.js";
import { searchCode } from "../services/code-search.js";
import { evaluateWithLlm } from "../services/llm.js";
import { calculateRisk } from "../scoring/matrix.js";
import { renderTable } from "../output/table.js";
import { renderJson } from "../output/json.js";
import type { ScanOptions, TriageResult } from "../types.js";

export async function scanCommand(options: ScanOptions): Promise<void> {
  const config = loadConfig();

  console.log(`Scanning ${options.repo} (limit: ${options.limit})...\n`);

  // Phase 1: Data Collection
  const alerts = await fetchDependabotAlerts(
    config.githubToken,
    options.repo,
    options.limit
  );

  if (alerts.length === 0) {
    console.log("No open Dependabot alerts found.");
    return;
  }

  console.log(`Found ${alerts.length} open alert(s). Enriching data...\n`);

  // KEV + EPSS を並列取得
  const cveIds = alerts
    .map((a) => a.cveId)
    .filter((id): id is string => id !== null);

  const [kevResults, epssResults] = await Promise.all([
    checkKev(cveIds),
    fetchEpssScores(cveIds),
  ]);

  const kevMap = new Map(kevResults.map((r) => [r.cveId, r.inKev]));
  const epssMap = new Map(epssResults.map((r) => [r.cveId, r.score]));

  // Phase 2-4: アラートごとに解析
  const results: TriageResult[] = [];

  for (const alert of alerts) {
    const kev = alert.cveId ? (kevMap.get(alert.cveId) ?? false) : false;
    const epss = alert.cveId ? (epssMap.get(alert.cveId) ?? null) : null;

    // Phase 2: Context Discovery
    const codeSearch = await searchCode(
      config.githubToken,
      options.repo,
      alert.packageName
    );

    // Phase 3: LLM Evaluation
    const llmEvaluation = await evaluateWithLlm(
      config.llmApiKey,
      alert,
      codeSearch
    );

    // Phase 4: Scoring
    const finalRisk = calculateRisk(
      kev,
      llmEvaluation.context,
      llmEvaluation.reachability,
      epss ?? 0,
      options.epssThreshold
    );

    results.push({
      alert,
      kev,
      epss,
      codeSearch,
      llmEvaluation,
      finalRisk,
    });
  }

  // Output
  if (options.format === "json") {
    renderJson(results);
  } else {
    renderTable(results);
  }
}
