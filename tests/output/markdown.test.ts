import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderMarkdown } from "../../src/output/markdown.js";
import type { AlertReport } from "../../src/types.js";

function makeReport(overrides?: Partial<AlertReport>): AlertReport {
  return {
    alert: {
      number: 1,
      cveId: "CVE-2021-23337",
      packageName: "lodash",
      vulnerableVersion: "< 4.17.21",
      manifestPath: "package.json",
      description: "Command Injection via template function",
      severity: "high",
      cvssV3: { score: 7.2, vectorString: "CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:U/C:H/I:H/A:H" },
      cvssV4: null,
      epss: 0.032,
      cwes: [{ cweId: "CWE-94", name: "Code Injection" }],
      firstPatchedVersion: "4.17.21",
      dependencyScope: "runtime",
      htmlUrl: "https://github.com/my-org/my-app/security/dependabot/1",
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

describe("renderMarkdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-13T00:00:00Z"));
  });

  it("should include report header with meta info", () => {
    const output = renderMarkdown([makeReport()], "my-org/my-app", 0.05);

    expect(output).toContain("# Dependabot Alert Triage Report");
    expect(output).toContain("**Repository**: my-org/my-app");
    expect(output).toContain("**Alerts**: 1");
    expect(output).toContain("**EPSS Threshold**: 5%");
  });

  it("should include analysis prompt with scoring matrix", () => {
    const output = renderMarkdown([makeReport()], "my-org/my-app", 0.05);

    expect(output).toContain("## 分析指示");
    expect(output).toContain("セキュリティエンジニア");
    expect(output).toContain("CRITICAL");
    expect(output).toContain("IGNORE");
    expect(output).toContain(">= 5%");
  });

  it("should include alert details", () => {
    const output = renderMarkdown([makeReport()], "my-org/my-app", 0.05);

    expect(output).toContain("### Alert #1: lodash (CVE-2021-23337)");
    expect(output).toContain("**脆弱バージョン**: < 4.17.21");
    expect(output).toContain("**マニフェスト**: package.json");
    expect(output).toContain("**KEV**: No");
    expect(output).toContain("**EPSS**: 3.2%");
  });

  it("should include code snippets", () => {
    const output = renderMarkdown([makeReport()], "my-org/my-app", 0.05);

    expect(output).toContain("#### コード使用箇所");
    expect(output).toContain("`src/utils.ts` (L10-L20):");
    expect(output).toContain('import { template } from "lodash"');
  });

  it("should show message when no code snippets found", () => {
    const report = makeReport({
      codeSearch: { packageName: "lodash", snippets: [] },
    });
    const output = renderMarkdown([report], "my-org/my-app", 0.05);

    expect(output).toContain("コード使用箇所が見つかりませんでした");
  });

  it("should handle KEV=true", () => {
    const report = makeReport({ kev: true });
    const output = renderMarkdown([report], "my-org/my-app", 0.05);

    expect(output).toContain("**KEV**: Yes");
  });

  it("should handle null EPSS", () => {
    const report = makeReport({ epss: null });
    const output = renderMarkdown([report], "my-org/my-app", 0.05);

    expect(output).toContain("**EPSS**: N/A");
  });

  it("should handle null CVE", () => {
    const report = makeReport({
      alert: {
        number: 2,
        cveId: null,
        packageName: "foo",
        vulnerableVersion: ">= 1.0",
        manifestPath: "package.json",
        description: "some issue",
        severity: "low",
        cvssV3: null,
        cvssV4: null,
        epss: null,
        cwes: [],
        firstPatchedVersion: null,
        dependencyScope: null,
        htmlUrl: "https://github.com/my-org/my-app/security/dependabot/2",
      },
    });
    const output = renderMarkdown([report], "my-org/my-app", 0.05);

    expect(output).toContain("### Alert #2: foo (CVE なし)");
  });

  it("should render multiple alerts", () => {
    const reports = [
      makeReport(),
      makeReport({
        alert: {
          number: 2,
          cveId: "CVE-2022-99999",
          packageName: "axios",
          vulnerableVersion: "< 1.0.0",
          manifestPath: "package.json",
          description: "SSRF vulnerability",
          severity: "critical",
          cvssV3: null,
          cvssV4: { score: 9.2, vectorString: "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N" },
          epss: 0.85,
          cwes: [],
          firstPatchedVersion: "1.0.0",
          dependencyScope: "runtime",
          htmlUrl: "https://github.com/my-org/my-app/security/dependabot/2",
        },
      }),
    ];
    const output = renderMarkdown(reports, "my-org/my-app", 0.05);

    expect(output).toContain("### Alert #1: lodash");
    expect(output).toContain("### Alert #2: axios");
    expect(output).toContain("**Alerts**: 2");
  });
});
