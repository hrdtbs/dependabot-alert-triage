import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderJson } from "../../src/output/json.js";
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

describe("renderJson", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-13T00:00:00Z"));
  });

  it("should return valid JSON", () => {
    const output = renderJson([makeReport()], "my-org/my-app", 0.05);
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it("should include meta info", () => {
    const output = JSON.parse(
      renderJson([makeReport()], "my-org/my-app", 0.05)
    );

    expect(output.meta.repository).toBe("my-org/my-app");
    expect(output.meta.alertCount).toBe(1);
    expect(output.meta.epssThreshold).toBe(0.05);
    expect(output.meta.generatedAt).toBe("2026-03-13T00:00:00.000Z");
  });

  it("should include scoring matrix", () => {
    const output = JSON.parse(
      renderJson([makeReport()], "my-org/my-app", 0.05)
    );

    expect(output.scoringMatrix).toBeDefined();
    expect(output.scoringMatrix.rules).toHaveLength(5);
    expect(output.scoringMatrix.rules[0].finalRisk).toBe("CRITICAL");
  });

  it("should include analysis prompt", () => {
    const output = JSON.parse(
      renderJson([makeReport()], "my-org/my-app", 0.05)
    );

    expect(output.analysisPrompt).toContain("セキュリティエンジニア");
  });

  it("should include alert data", () => {
    const output = JSON.parse(
      renderJson([makeReport()], "my-org/my-app", 0.05)
    );

    expect(output.alerts).toHaveLength(1);
    const alert = output.alerts[0];
    expect(alert.number).toBe(1);
    expect(alert.packageName).toBe("lodash");
    expect(alert.cveId).toBe("CVE-2021-23337");
    expect(alert.kev).toBe(false);
    expect(alert.epss).toBe(0.032);
  });

  it("should include code snippets in alerts", () => {
    const output = JSON.parse(
      renderJson([makeReport()], "my-org/my-app", 0.05)
    );

    const snippets = output.alerts[0].codeSnippets;
    expect(snippets).toHaveLength(1);
    expect(snippets[0].filePath).toBe("src/utils.ts");
    expect(snippets[0].startLine).toBe(10);
    expect(snippets[0].endLine).toBe(20);
  });

  it("should handle empty snippets", () => {
    const report = makeReport({
      codeSearch: { packageName: "lodash", snippets: [] },
    });
    const output = JSON.parse(
      renderJson([report], "my-org/my-app", 0.05)
    );

    expect(output.alerts[0].codeSnippets).toEqual([]);
  });

  it("should handle multiple alerts", () => {
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
        },
        kev: true,
        epss: 0.85,
      }),
    ];
    const output = JSON.parse(
      renderJson(reports, "my-org/my-app", 0.05)
    );

    expect(output.meta.alertCount).toBe(2);
    expect(output.alerts).toHaveLength(2);
    expect(output.alerts[1].packageName).toBe("axios");
    expect(output.alerts[1].kev).toBe(true);
  });
});
