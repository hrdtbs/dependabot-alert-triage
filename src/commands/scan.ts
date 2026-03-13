import { loadConfig } from "../config.js";
import { fetchDependabotAlerts } from "../services/github.js";
import { checkKev } from "../services/kev.js";
import { fetchEpssScores } from "../services/epss.js";
import { searchCode } from "../services/code-search.js";
import { renderMarkdown } from "../output/markdown.js";
import { renderJson } from "../output/json.js";
import type { ScanOptions, AlertReport } from "../types.js";

export async function scanCommand(options: ScanOptions): Promise<void> {
  const config = loadConfig();

  console.error(`Scanning ${options.repo} (limit: ${options.limit})...\n`);

  // Phase 1: Data Collection
  const alerts = await fetchDependabotAlerts(
    config.githubToken,
    options.repo,
    options.limit
  );

  if (alerts.length === 0) {
    console.error("No open Dependabot alerts found.");
    return;
  }

  console.error(`Found ${alerts.length} open alert(s). Enriching data...\n`);

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

  // Phase 2: Context Discovery + Report Assembly
  const results: AlertReport[] = [];

  for (const alert of alerts) {
    const kev = alert.cveId ? (kevMap.get(alert.cveId) ?? false) : false;
    const epss = alert.cveId ? (epssMap.get(alert.cveId) ?? null) : null;

    const codeSearch = await searchCode(
      config.githubToken,
      options.repo,
      alert.packageName
    );

    results.push({ alert, kev, epss, codeSearch });
  }

  // Phase 3: Report Generation
  if (options.format === "json") {
    console.log(renderJson(results, options.repo, options.epssThreshold));
  } else {
    console.log(
      renderMarkdown(results, options.repo, options.epssThreshold)
    );
  }
}
