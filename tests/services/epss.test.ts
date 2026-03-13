import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchEpssScores } from "../../src/services/epss.js";

describe("fetchEpssScores", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns scores for given CVE IDs", async () => {
    const mockResponse = {
      data: [
        { cve: "CVE-2023-0001", epss: "0.05" },
        { cve: "CVE-2023-0002", epss: "0.90" },
      ],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const results = await fetchEpssScores([
      "CVE-2023-0001",
      "CVE-2023-0002",
    ]);

    expect(results).toEqual([
      { cveId: "CVE-2023-0001", score: 0.05 },
      { cveId: "CVE-2023-0002", score: 0.9 },
    ]);
  });

  it("returns empty array for empty input", async () => {
    const results = await fetchEpssScores([]);
    expect(results).toEqual([]);
  });

  it("returns null scores when API fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    const results = await fetchEpssScores(["CVE-2023-0001"]);
    expect(results).toEqual([{ cveId: "CVE-2023-0001", score: null }]);
  });

  it("returns null scores for CVEs not in response", async () => {
    const mockResponse = {
      data: [{ cve: "CVE-2023-0001", epss: "0.05" }],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const results = await fetchEpssScores([
      "CVE-2023-0001",
      "CVE-2023-9999",
    ]);

    expect(results).toEqual([
      { cveId: "CVE-2023-0001", score: 0.05 },
      { cveId: "CVE-2023-9999", score: null },
    ]);
  });
});
