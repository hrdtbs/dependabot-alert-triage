import { describe, it, expect, vi, beforeEach } from "vitest";

const paginateMock = vi.fn();
const getAuthenticatedMock = vi.fn();

vi.mock("@octokit/rest", () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    rest: {
      users: { getAuthenticated: getAuthenticatedMock },
      orgs: { listForAuthenticatedUser: "orgs.listForAuthenticatedUser" },
      dependabot: { listAlertsForOrg: "dependabot.listAlertsForOrg" },
      repos: { listForAuthenticatedUser: "repos.listForAuthenticatedUser" },
    },
    paginate: paginateMock,
  })),
}));

import {
  fetchAuthenticatedUser,
  fetchUserOrgs,
  fetchAlertsForOrg,
} from "../../src/services/github-user.js";

describe("fetchAuthenticatedUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user info", async () => {
    getAuthenticatedMock.mockResolvedValue({
      data: { login: "octocat", name: "The Octocat" },
    });

    const user = await fetchAuthenticatedUser("token");

    expect(user.login).toBe("octocat");
    expect(user.name).toBe("The Octocat");
  });

  it("handles null name", async () => {
    getAuthenticatedMock.mockResolvedValue({
      data: { login: "octocat", name: null },
    });

    const user = await fetchAuthenticatedUser("token");

    expect(user.name).toBeNull();
  });
});

describe("fetchUserOrgs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns organization list", async () => {
    paginateMock.mockResolvedValue([
      { login: "my-org", description: "My Organization" },
      { login: "other-org", description: null },
    ]);

    const orgs = await fetchUserOrgs("token");

    expect(orgs).toHaveLength(2);
    expect(orgs[0].login).toBe("my-org");
    expect(orgs[0].description).toBe("My Organization");
    expect(orgs[1].description).toBeNull();
  });

  it("returns empty array when no orgs", async () => {
    paginateMock.mockResolvedValue([]);

    const orgs = await fetchUserOrgs("token");

    expect(orgs).toHaveLength(0);
  });
});

describe("fetchAlertsForOrg", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("groups alerts by repository", async () => {
    paginateMock.mockResolvedValue([
      {
        number: 1,
        repository: { full_name: "my-org/app" },
        security_advisory: {
          cve_id: "CVE-2021-12345",
          identifiers: [],
          description: "desc1",
        },
        security_vulnerability: {
          package: { name: "lodash" },
          vulnerable_version_range: "< 4.17.21",
        },
        dependency: { manifest_path: "package.json" },
      },
      {
        number: 2,
        repository: { full_name: "my-org/api" },
        security_advisory: {
          cve_id: "CVE-2022-99999",
          identifiers: [],
          description: "desc2",
        },
        security_vulnerability: {
          package: { name: "axios" },
          vulnerable_version_range: "< 1.0.0",
        },
        dependency: { manifest_path: "package.json" },
      },
      {
        number: 3,
        repository: { full_name: "my-org/app" },
        security_advisory: {
          cve_id: null,
          identifiers: [{ type: "CVE", value: "CVE-2023-11111" }],
          description: "desc3",
        },
        security_vulnerability: {
          package: { name: "express" },
          vulnerable_version_range: "< 5.0.0",
        },
        dependency: { manifest_path: "package.json" },
      },
    ]);

    const result = await fetchAlertsForOrg("token", "my-org", 50);

    expect(result).toHaveLength(2);

    const appAlerts = result.find((r) => r.repo === "my-org/app");
    expect(appAlerts?.alerts).toHaveLength(2);
    expect(appAlerts?.alerts[0].packageName).toBe("lodash");
    expect(appAlerts?.alerts[1].cveId).toBe("CVE-2023-11111");

    const apiAlerts = result.find((r) => r.repo === "my-org/api");
    expect(apiAlerts?.alerts).toHaveLength(1);
  });

  it("respects limit per repository", async () => {
    paginateMock.mockResolvedValue([
      {
        number: 1,
        repository: { full_name: "my-org/app" },
        security_advisory: {
          cve_id: "CVE-1",
          identifiers: [],
          description: "",
        },
        security_vulnerability: {
          package: { name: "a" },
          vulnerable_version_range: ">= 0",
        },
        dependency: { manifest_path: "package.json" },
      },
      {
        number: 2,
        repository: { full_name: "my-org/app" },
        security_advisory: {
          cve_id: "CVE-2",
          identifiers: [],
          description: "",
        },
        security_vulnerability: {
          package: { name: "b" },
          vulnerable_version_range: ">= 0",
        },
        dependency: { manifest_path: "package.json" },
      },
    ]);

    const result = await fetchAlertsForOrg("token", "my-org", 1);

    const appAlerts = result.find((r) => r.repo === "my-org/app");
    expect(appAlerts?.alerts).toHaveLength(1);
  });
});
