import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderTriageMarkdown } from "../../src/output/triage-markdown.js";
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
      epss: 0.032,
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

describe("renderTriageMarkdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-13T00:00:00Z"));
  });

  const orgScope: ScopeSelection = { type: "org", org: "my-company" };
  const userScope: ScopeSelection = { type: "user", login: "octocat" };

  it("should include title and meta info", () => {
    const output = renderTriageMarkdown(
      [makeRepo("my-company/app")],
      orgScope,
      0.05
    );

    expect(output).toContain("# Dependabot Triage Report");
    expect(output).toContain("org:my-company");
    expect(output).toContain("Repositories**: 1");
    expect(output).toContain("Total Alerts**: 1");
    expect(output).toContain("EPSS Threshold**: 5%");
  });

  it("should include user scope", () => {
    const output = renderTriageMarkdown(
      [makeRepo("octocat/repo")],
      userScope,
      0.05
    );

    expect(output).toContain("user:octocat");
  });

  it("should include analysis prompt with scoring matrix", () => {
    const output = renderTriageMarkdown(
      [makeRepo("my-company/app")],
      orgScope,
      0.05
    );

    expect(output).toContain("分析指示");
    expect(output).toContain("セキュリティエンジニア");
    expect(output).toContain("CRITICAL");
  });

  it("should include repository sections", () => {
    const repos = [
      makeRepo("my-company/app"),
      makeRepo("my-company/api"),
    ];
    const output = renderTriageMarkdown(repos, orgScope, 0.05);

    expect(output).toContain("## Repository: my-company/app (1 alerts)");
    expect(output).toContain("## Repository: my-company/api (1 alerts)");
  });

  it("should include alert details", () => {
    const output = renderTriageMarkdown(
      [makeRepo("my-company/app")],
      orgScope,
      0.05
    );

    expect(output).toContain("Alert #1: lodash (CVE-2021-23337)");
    expect(output).toContain("< 4.17.21");
    expect(output).toContain("KEV**: No");
    expect(output).toContain("EPSS**: 3.2%");
  });

  it("should include code snippets", () => {
    const output = renderTriageMarkdown(
      [makeRepo("my-company/app")],
      orgScope,
      0.05
    );

    expect(output).toContain("コード使用箇所");
    expect(output).toContain("src/utils.ts");
    expect(output).toContain('import { template } from "lodash"');
  });

  it("should show message when no code snippets found", () => {
    const report = makeAlertReport({
      codeSearch: { packageName: "lodash", snippets: [] },
    });
    const output = renderTriageMarkdown(
      [makeRepo("my-company/app", [report])],
      orgScope,
      0.05
    );

    expect(output).toContain("コード使用箇所が見つかりませんでした");
  });

  it("should handle KEV and null EPSS", () => {
    const report = makeAlertReport({ kev: true, epss: null });
    const output = renderTriageMarkdown(
      [makeRepo("my-company/app", [report])],
      orgScope,
      0.05
    );

    expect(output).toContain("KEV**: Yes");
    expect(output).toContain("EPSS**: N/A");
  });
});
