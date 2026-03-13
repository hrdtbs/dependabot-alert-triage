import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock child_process and fs before imports
vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn().mockReturnValue(true),
}));

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { searchCode } from "../../src/services/code-search.js";

function mockExecFile(results: Record<string, { stdout: string }>) {
  vi.mocked(execFile).mockImplementation(
    ((
      cmd: string,
      args: string[],
      _opts: unknown,
      callback?: (err: Error | null, result: { stdout: string }) => void
    ) => {
      const cb =
        callback ??
        (_opts as (err: Error | null, result: { stdout: string }) => void);
      if (cmd === "git") {
        cb(null, { stdout: "" });
        return;
      }
      if (cmd === "rg") {
        if (results["rg"]) {
          cb(null, results["rg"]);
        } else {
          cb(new Error("no matches"), { stdout: "" });
        }
        return;
      }
      if (cmd === "grep") {
        if (results["grep"]) {
          cb(null, results["grep"]);
        } else {
          cb(new Error("no matches"), { stdout: "" });
        }
        return;
      }
      cb(new Error("unknown command"), { stdout: "" });
    }) as typeof execFile
  );
}

function generateLines(count: number): string {
  return Array.from({ length: count }, (_, i) => `line ${i + 1}`).join("\n");
}

describe("searchCode", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(existsSync).mockReturnValue(true);
  });

  it("returns snippets for matching files", async () => {
    const rgOutput = [
      JSON.stringify({
        type: "match",
        data: { path: { text: "/tmp/repo/src/app.ts" }, line_number: 5 },
      }),
    ].join("\n");

    mockExecFile({ rg: { stdout: rgOutput } });
    vi.mocked(readFile).mockResolvedValue(generateLines(50));

    const result = await searchCode("token", "owner/repo", "lodash");

    expect(result.packageName).toBe("lodash");
    expect(result.snippets).toHaveLength(1);
    expect(result.snippets[0].filePath).toBe("/tmp/repo/src/app.ts");
  });

  it("deduplicates matches in the same file", async () => {
    const rgOutput = [
      JSON.stringify({
        type: "match",
        data: { path: { text: "/tmp/repo/src/app.ts" }, line_number: 5 },
      }),
      JSON.stringify({
        type: "match",
        data: { path: { text: "/tmp/repo/src/app.ts" }, line_number: 10 },
      }),
    ].join("\n");

    mockExecFile({ rg: { stdout: rgOutput } });
    vi.mocked(readFile).mockResolvedValue(generateLines(50));

    const result = await searchCode("token", "owner/repo", "lodash");

    expect(result.snippets).toHaveLength(1);
  });

  it("limits to 5 files", async () => {
    const lines = Array.from({ length: 7 }, (_, i) =>
      JSON.stringify({
        type: "match",
        data: {
          path: { text: `/tmp/repo/src/file${i}.ts` },
          line_number: 5,
        },
      })
    );

    mockExecFile({ rg: { stdout: lines.join("\n") } });
    vi.mocked(readFile).mockResolvedValue(generateLines(30));

    const result = await searchCode("token", "owner/repo", "lodash");

    expect(result.snippets.length).toBeLessThanOrEqual(5);
  });

  it("returns empty snippets when no matches found", async () => {
    mockExecFile({});

    const result = await searchCode("token", "owner/repo", "nonexistent");

    expect(result.snippets).toHaveLength(0);
  });
});
