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

  const perPage = Math.min(limit, 100);

  // Dependabot alerts API uses cursor-based pagination, not page-based.
  // Use Octokit's paginate to handle this automatically.
  const allAlerts = await octokit.paginate(
    octokit.rest.dependabot.listAlertsForRepo,
    {
      owner,
      repo: repoName,
      state: "open",
      per_page: perPage,
    },
    (response, done) => {
      if (response.data.length >= limit) {
        done();
      }
      return response.data;
    }
  );

  const alerts: AlertInfo[] = [];

  for (const alert of allAlerts) {
    if (alerts.length >= limit) break;

    const cveId =
      alert.security_advisory.cve_id ??
      alert.security_advisory.identifiers?.find(
        (id: { type: string }) => id.type === "CVE"
      )?.value ??
      null;

    const advisory = alert.security_advisory as unknown as {
      epss?: { percentage: number; percentile: number } | null;
      cvss_severities?: {
        cvss_v3?: { score: number; vector_string: string | null } | null;
        cvss_v4?: { score: number; vector_string: string | null } | null;
      };
      cwes?: Array<{ cwe_id: string; name: string }>;
    };

    const epss = advisory.epss?.percentage ?? null;
    const cvssV3Raw = advisory.cvss_severities?.cvss_v3;
    const cvssV4Raw = advisory.cvss_severities?.cvss_v4;

    alerts.push({
      number: alert.number,
      cveId,
      epss,
      packageName: alert.security_vulnerability.package.name,
      vulnerableVersion:
        alert.security_vulnerability.vulnerable_version_range,
      manifestPath: alert.dependency.manifest_path ?? "unknown",
      description: alert.security_advisory.description ?? "",
      severity: alert.security_advisory.severity ?? "unknown",
      cvssV3:
        cvssV3Raw && cvssV3Raw.score > 0
          ? { score: cvssV3Raw.score, vectorString: cvssV3Raw.vector_string }
          : null,
      cvssV4:
        cvssV4Raw && cvssV4Raw.score > 0
          ? { score: cvssV4Raw.score, vectorString: cvssV4Raw.vector_string }
          : null,
      cwes: (advisory.cwes ?? []).map((c) => ({
        cweId: c.cwe_id,
        name: c.name,
      })),
      firstPatchedVersion:
        alert.security_vulnerability.first_patched_version?.identifier ?? null,
      dependencyScope: (alert.dependency as unknown as { scope?: string }).scope ?? null,
      htmlUrl: (alert as unknown as { html_url: string }).html_url,
    });
  }

  return alerts;
}
