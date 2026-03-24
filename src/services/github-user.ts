import { Octokit } from "@octokit/rest";
import { fetchDependabotAlerts } from "./github.js";
import { pLimit } from "../utils/concurrency.js";
import type {
  UserInfo,
  OrgInfo,
  RepoAlerts,
  AlertInfo,
} from "../types.js";

export async function fetchAuthenticatedUser(
  token: string
): Promise<UserInfo> {
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.rest.users.getAuthenticated();
  return {
    login: data.login,
    name: data.name ?? null,
  };
}

export async function fetchUserOrgs(token: string): Promise<OrgInfo[]> {
  const octokit = new Octokit({ auth: token });
  const orgs = await octokit.paginate(
    octokit.rest.orgs.listForAuthenticatedUser,
    { per_page: 100 }
  );
  return orgs.map((org) => ({
    login: org.login,
    description: org.description ?? null,
  }));
}

export async function fetchAlertsForOrg(
  token: string,
  org: string,
  limit: number
): Promise<RepoAlerts[]> {
  const octokit = new Octokit({ auth: token });

  const allAlerts = await octokit.paginate(
    octokit.rest.dependabot.listAlertsForOrg,
    {
      org,
      state: "open",
      per_page: 100,
    }
  );

  // リポジトリ別にグループ化
  const repoMap = new Map<string, AlertInfo[]>();

  for (const alert of allAlerts) {
    const repoFullName = (alert as unknown as { repository?: { full_name?: string } })
      .repository?.full_name;
    if (!repoFullName) continue;

    if (!repoMap.has(repoFullName)) {
      repoMap.set(repoFullName, []);
    }

    const alerts = repoMap.get(repoFullName)!;
    if (alerts.length >= limit) continue;

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

  return Array.from(repoMap.entries()).map(([repo, alerts]) => ({
    repo,
    alerts,
  }));
}

export async function fetchAlertsForUser(
  token: string,
  login: string,
  limit: number,
  concurrency: number = 5
): Promise<RepoAlerts[]> {
  const octokit = new Octokit({ auth: token });

  const repos = await octokit.paginate(
    octokit.rest.repos.listForAuthenticatedUser,
    {
      per_page: 100,
      sort: "updated",
      direction: "desc",
    }
  );

  const limiter = pLimit(concurrency);
  const results = await Promise.all(
    repos.map((repo) =>
      limiter(async (): Promise<RepoAlerts | null> => {
        try {
          const alerts = await fetchDependabotAlerts(
            token,
            repo.full_name,
            limit
          );
          if (alerts.length === 0) return null;
          return { repo: repo.full_name, alerts };
        } catch {
          // Dependabot未有効のリポジトリなど
          return null;
        }
      })
    )
  );

  return results.filter((r): r is RepoAlerts => r !== null);
}
