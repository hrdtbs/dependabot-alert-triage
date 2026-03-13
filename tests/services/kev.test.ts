import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fs modules to prevent cache interference
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn().mockRejectedValue(new Error("no cache")),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("node:fs", () => ({
  promises: {
    stat: vi.fn().mockRejectedValue(new Error("no cache")),
  },
}));

import { checkKev } from "../../src/services/kev.js";

describe("checkKev", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns correct KEV status for CVE IDs", async () => {
    const mockKevCatalog = {
      vulnerabilities: [
        { cveID: "CVE-2023-0001" },
        { cveID: "CVE-2023-0003" },
      ],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockKevCatalog,
    } as Response);

    const results = await checkKev([
      "CVE-2023-0001",
      "CVE-2023-0002",
      "CVE-2023-0003",
    ]);

    expect(results).toEqual([
      { cveId: "CVE-2023-0001", inKev: true },
      { cveId: "CVE-2023-0002", inKev: false },
      { cveId: "CVE-2023-0003", inKev: true },
    ]);
  });

  it("returns all false when fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);

    const results = await checkKev(["CVE-2023-0001"]);

    expect(results).toEqual([{ cveId: "CVE-2023-0001", inKev: false }]);
  });
});
