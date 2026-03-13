import { Octokit } from "@octokit/rest";
import type { AlertInfo } from "../types.js";

export async function fetchDependabotAlerts(
  token: string,
  repo: string,
  limit: number
): Promise<AlertInfo[]> {
  const [owner, repoName] = repo.split("/");
  if (!owner || !repoName) {
    throw new Error(`Invalid repo format: "${repo}". Expected "owner/repo".`);
  }

  const octokit = new Octokit({ auth: token });

  const alerts: AlertInfo[] = [];
  let page = 1;
  const perPage = Math.min(limit, 100);

  while (alerts.length < limit) {
    const { data } = await octokit.rest.dependabot.listAlertsForRepo({
      owner,
      repo: repoName,
      state: "open",
      per_page: perPage,
      page,
    });

    if (data.length === 0) break;

    for (const alert of data) {
      if (alerts.length >= limit) break;

      const cveId =
        alert.security_advisory.cve_id ??
        alert.security_advisory.identifiers?.find(
          (id: { type: string }) => id.type === "CVE"
        )?.value ??
        null;

      alerts.push({
        number: alert.number,
        cveId,
        packageName: alert.security_vulnerability.package.name,
        vulnerableVersion:
          alert.security_vulnerability.vulnerable_version_range,
        manifestPath: alert.dependency.manifest_path ?? "unknown",
        description: alert.security_advisory.description ?? "",
      });
    }

    page++;
  }

  return alerts;
}
