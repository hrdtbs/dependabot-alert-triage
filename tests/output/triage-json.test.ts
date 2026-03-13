import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderTriageJson } from "../../src/output/triage-json.js";
import type {
  RepoTriageResult,
  ScopeSelection,
  AlertReport,
} from "../../src/types.js";

function makeAlertReport(overrides?: Partial<AlertReport>): AlertReport {
  return {
    alert: {
      number: 1,
      cveId: "CVE-2021-23337",
      packageName: "lodash",
      vulnerableVersion: "< 4.17.21",
      manifestPath: "package.json",
      description: "Command Injection via template function",
    },
    kev: false,
    epss: 0.032,
    codeSearch: {
      packageName: "lodash",
      snippets: [
        {
          filePath: "src/utils.ts",
          startLine: 10,
          endLine: 20,
          content: 'import { template } from "lodash";',
        },
      ],
    },
    ...overrides,
  };
}

function makeRepo(
  repo: string,
  alerts: AlertReport[] = [makeAlertReport()]
): RepoTriageResult {
  return { repo, alerts };
}

describe("renderTriageJson", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-13T00:00:00Z"));
  });

  const orgScope: ScopeSelection = { type: "org", org: "my-company" };
  const userScope: ScopeSelection = { type: "user", login: "octocat" };

  it("should return valid JSON", () => {
    const output = renderTriageJson([makeRepo("my-company/app")], orgScope, 0.05);
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it("should include meta info for org scope", () => {
    const repos = [makeRepo("my-company/app"), makeRepo("my-company/api")];
    const output = JSON.parse(renderTriageJson(repos, orgScope, 0.05));

    expect(output.meta.scope).toBe("org:my-company");
    expect(output.meta.repositoryCount).toBe(2);
    expect(output.meta.totalAlertCount).toBe(2);
    expect(output.meta.epssThreshold).toBe(0.05);
    expect(output.meta.generatedAt).toBe("2026-03-13T00:00:00.000Z");
  });

  it("should include meta info for user scope", () => {
    const output = JSON.parse(
      renderTriageJson([makeRepo("octocat/repo")], userScope, 0.1)
    );

    expect(output.meta.scope).toBe("user:octocat");
  });

  it("should include scoring matrix", () => {
    const output = JSON.parse(
      renderTriageJson([makeRepo("my-company/app")], orgScope, 0.05)
    );

    expect(output.scoringMatrix).toBeDefined();
    expect(output.scoringMatrix.rules).toHaveLength(5);
    expect(output.scoringMatrix.rules[0].finalRisk).toBe("CRITICAL");
  });

  it("should include analysis prompt", () => {
    const output = JSON.parse(
      renderTriageJson([makeRepo("my-company/app")], orgScope, 0.05)
    );

    expect(output.analysisPrompt).toContain("セキュリティエンジニア");
    expect(output.analysisPrompt).toContain("repositories");
  });

  it("should include repositories with alerts", () => {
    const repos = [
      makeRepo("my-company/app", [makeAlertReport()]),
      makeRepo("my-company/api", [
        makeAlertReport({
          alert: {
            number: 2,
            cveId: "CVE-2022-99999",
            packageName: "axios",
            vulnerableVersion: "< 1.0.0",
            manifestPath: "package.json",
            description: "SSRF vulnerability",
          },
          kev: true,
          epss: 0.85,
        }),
      ]),
    ];

    const output = JSON.parse(renderTriageJson(repos, orgScope, 0.05));

    expect(output.repositories).toHaveLength(2);
    expect(output.repositories[0].repository).toBe("my-company/app");
    expect(output.repositories[0].alertCount).toBe(1);
    expect(output.repositories[1].repository).toBe("my-company/api");
    expect(output.repositories[1].alerts[0].kev).toBe(true);
  });

  it("should include code snippets", () => {
    const output = JSON.parse(
      renderTriageJson([makeRepo("my-company/app")], orgScope, 0.05)
    );

    const snippets = output.repositories[0].alerts[0].codeSnippets;
    expect(snippets).toHaveLength(1);
    expect(snippets[0].filePath).toBe("src/utils.ts");
  });

  it("should handle empty snippets", () => {
    const report = makeAlertReport({
      codeSearch: { packageName: "lodash", snippets: [] },
    });
    const output = JSON.parse(
      renderTriageJson([makeRepo("my-company/app", [report])], orgScope, 0.05)
    );

    expect(output.repositories[0].alerts[0].codeSnippets).toEqual([]);
  });

  it("should calculate totalAlertCount across repos", () => {
    const repos = [
      makeRepo("a/b", [makeAlertReport(), makeAlertReport()]),
      makeRepo("c/d", [makeAlertReport()]),
    ];
    const output = JSON.parse(renderTriageJson(repos, orgScope, 0.05));

    expect(output.meta.totalAlertCount).toBe(3);
  });
});
