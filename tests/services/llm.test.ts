import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the AI SDK modules
vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: {
    object: vi.fn((opts: unknown) => opts),
  },
  createProviderRegistry: vi.fn(() => ({
    languageModel: vi.fn(() => "mock-model"),
  })),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn(),
}));

vi.mock("@ai-sdk/google", () => ({
  google: vi.fn(),
}));

import { generateText } from "ai";
import { evaluateWithLlm } from "../../src/services/llm.js";
import type { AlertInfo, CodeSearchResult } from "../../src/types.js";

const mockAlert: AlertInfo = {
  number: 1,
  cveId: "CVE-2023-0001",
  packageName: "lodash",
  vulnerableVersion: "< 4.17.21",
  manifestPath: "package.json",
  description: "Prototype pollution vulnerability",
};

const mockCodeSearch: CodeSearchResult = {
  packageName: "lodash",
  snippets: [
    {
      filePath: "/tmp/repo/src/utils.ts",
      startLine: 1,
      endLine: 10,
      content: 'import _ from "lodash";\n_.merge(target, source);',
    },
  ],
};

describe("evaluateWithLlm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses valid LLM response", async () => {
    vi.mocked(generateText).mockResolvedValue({
      output: {
        reachability: "High",
        context: "Production",
        reasoning: "lodashのmergeが直接呼び出されている",
      },
    } as never);

    const result = await evaluateWithLlm(
      "anthropic:claude-sonnet-4-20250514",
      mockAlert,
      mockCodeSearch
    );

    expect(result).toEqual({
      reachability: "High",
      context: "Production",
      reasoning: "lodashのmergeが直接呼び出されている",
    });
  });

  it("returns fallback when output is null", async () => {
    vi.mocked(generateText).mockResolvedValue({
      output: null,
    } as never);

    const result = await evaluateWithLlm(
      "anthropic:claude-sonnet-4-20250514",
      mockAlert,
      mockCodeSearch
    );

    expect(result.reachability).toBe("Medium");
    expect(result.context).toBe("Production");
  });

  it("returns fallback when API call fails", async () => {
    vi.mocked(generateText).mockRejectedValue(new Error("API error"));

    const result = await evaluateWithLlm(
      "anthropic:claude-sonnet-4-20250514",
      mockAlert,
      mockCodeSearch
    );

    expect(result.reachability).toBe("Medium");
    expect(result.context).toBe("Production");
  });

  it("works with different model providers", async () => {
    vi.mocked(generateText).mockResolvedValue({
      output: {
        reachability: "Low",
        context: "Test",
        reasoning: "テストコードでのみ使用",
      },
    } as never);

    const result = await evaluateWithLlm(
      "openai:gpt-4o",
      mockAlert,
      mockCodeSearch
    );

    expect(result).toEqual({
      reachability: "Low",
      context: "Test",
      reasoning: "テストコードでのみ使用",
    });
  });
});
