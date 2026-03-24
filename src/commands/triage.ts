import { loadConfig } from "../config.js";
import {
  fetchAuthenticatedUser,
  fetchUserOrgs,
  fetchAlertsForOrg,
  fetchAlertsForUser,
} from "../services/github-user.js";
import { fetchDependabotAlerts } from "../services/github.js";
import { selectScope } from "../services/prompt.js";
import { checkKev } from "../services/kev.js";
import { searchCodeMultiPackage } from "../services/code-search.js";
import { renderTriageJson } from "../output/triage-json.js";
import { renderTriageMarkdown } from "../output/triage-markdown.js";
import { pLimit } from "../utils/concurrency.js";
import type {
  TriageOptions,
  ScopeSelection,
  RepoAlerts,
  RepoTriageResult,
  AlertReport,
} from "../types.js";

export async function triageCommand(options: TriageOptions): Promise<void> {
  const config = loadConfig();

  // Step 1 & 2: スコープ決定とアラート取得
  let scope: ScopeSelection;
  let repoAlerts: RepoAlerts[];

  if (options.repo) {
    scope = { type: "repo", repo: options.repo };
    console.error(`Scope: repo:${options.repo}`);
    console.error("Fetching Dependabot alerts...\n");
    const alerts = await fetchDependabotAlerts(
      config.githubToken,
      options.repo,
      options.limit
    );
    repoAlerts = [{ repo: options.repo, alerts }];
  } else if (options.org) {
    scope = { type: "org", org: options.org };
    console.error(`Scope: org:${options.org}`);
    console.error("Fetching Dependabot alerts...\n");
    repoAlerts = await fetchAlertsForOrg(
      config.githubToken,
      options.org,
      options.limit
    );
  } else if (options.user) {
    scope = { type: "user", login: options.user };
    console.error(`Scope: user:${options.user}`);
    console.error("Fetching Dependabot alerts...\n");
    repoAlerts = await fetchAlertsForUser(
      config.githubToken,
      options.user,
      options.limit,
      options.concurrency
    );
  } else {
    console.error("Fetching user info and organizations...\n");
    const [user, orgs] = await Promise.all([
      fetchAuthenticatedUser(config.githubToken),
      fetchUserOrgs(config.githubToken),
    ]);

    console.error(
      `Authenticated as: ${user.login}${user.name ? ` (${user.name})` : ""}`
    );
    if (orgs.length > 0) {
      console.error(
        `Organizations: ${orgs.map((o) => o.login).join(", ")}`
      );
    }
    console.error("");

    scope = await selectScope(user, orgs);

    const scopeLabel =
      scope.type === "org" ? `org:${scope.org}` : `user:${scope.login}`;
    console.error(`\nScope: ${scopeLabel}`);
    console.error("Fetching Dependabot alerts...\n");

    if (scope.type === "org") {
      repoAlerts = await fetchAlertsForOrg(
        config.githubToken,
        scope.org,
        options.limit
      );
    } else {
      repoAlerts = await fetchAlertsForUser(
        config.githubToken,
        scope.login,
        options.limit,
        options.concurrency
      );
    }
  }

  if (repoAlerts.length === 0) {
    console.error("No open Dependabot alerts found.");
    return;
  }

  const totalAlerts = repoAlerts.reduce(
    (sum, r) => sum + r.alerts.length,
    0
  );
  console.error(
    `Found ${totalAlerts} alert(s) across ${repoAlerts.length} repository(ies). Enriching data...\n`
  );

  // Step 4: KEV一括取得
  const allCveIds = repoAlerts
    .flatMap((r) => r.alerts.map((a) => a.cveId))
    .filter((id): id is string => id !== null);

  const uniqueCveIds = [...new Set(allCveIds)];

  const kevResults = await checkKev(uniqueCveIds);
  const kevMap = new Map(kevResults.map((r) => [r.cveId, r.inKev]));

  // Step 5: コード検索（repo単位で並列）
  const limiter = pLimit(options.concurrency);
  const triageResults: RepoTriageResult[] = [];

  const repoPromises = repoAlerts.map((repoAlert, index) =>
    limiter(async (): Promise<RepoTriageResult> => {
      console.error(
        `[${index + 1}/${repoAlerts.length}] Searching ${repoAlert.repo} (${repoAlert.alerts.length} alerts)...`
      );

      let codeSearchMap = new Map<string, { packageName: string; snippets: Array<{ filePath: string; startLine: number; endLine: number; content: string }> }>();

      if (!options.skipCodeSearch) {
        try {
          const packageNames = [
            ...new Set(repoAlert.alerts.map((a) => a.packageName)),
          ];
          const codeResults = await searchCodeMultiPackage(
            config.githubToken,
            repoAlert.repo,
            packageNames
          );
          codeSearchMap = new Map(
            codeResults.map((r) => [r.packageName, r])
          );
        } catch {
          console.error(
            `  Warning: Code search failed for ${repoAlert.repo}, skipping.`
          );
        }
      }

      const alerts: AlertReport[] = repoAlert.alerts.map((alert) => ({
        alert,
        kev: alert.cveId ? (kevMap.get(alert.cveId) ?? false) : false,
        epss: alert.epss,
        codeSearch: codeSearchMap.get(alert.packageName) ?? {
          packageName: alert.packageName,
          snippets: [],
        },
      }));

      return { repo: repoAlert.repo, alerts };
    })
  );

  triageResults.push(...(await Promise.all(repoPromises)));

  console.error("");

  // Step 6: レポート出力
  if (options.format === "json") {
    console.log(
      renderTriageJson(triageResults, scope, options.epssThreshold)
    );
  } else {
    console.log(
      renderTriageMarkdown(triageResults, scope, options.epssThreshold)
    );
  }
}
