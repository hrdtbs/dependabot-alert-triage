import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Anthropic before importing the module
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: vi.fn(),
  };
});

import Anthropic from "@anthropic-ai/sdk";
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
    const mockCreate = vi.fn().mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            reachability: "High",
            context: "Production",
            reasoning: "lodashのmergeが直接呼び出されている",
          }),
        },
      ],
    });

    vi.mocked(Anthropic).mockImplementation(
      () =>
        ({
          messages: { create: mockCreate },
        }) as unknown as Anthropic
    );

    const result = await evaluateWithLlm("test-key", mockAlert, mockCodeSearch);

    expect(result).toEqual({
      reachability: "High",
      context: "Production",
      reasoning: "lodashのmergeが直接呼び出されている",
    });
  });

  it("returns fallback when LLM response is invalid JSON", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "This is not JSON" }],
    });

    vi.mocked(Anthropic).mockImplementation(
      () =>
        ({
          messages: { create: mockCreate },
        }) as unknown as Anthropic
    );

    const result = await evaluateWithLlm("test-key", mockAlert, mockCodeSearch);

    expect(result.reachability).toBe("Medium");
    expect(result.context).toBe("Production");
  });

  it("returns fallback when API call fails", async () => {
    const mockCreate = vi.fn().mockRejectedValue(new Error("API error"));

    vi.mocked(Anthropic).mockImplementation(
      () =>
        ({
          messages: { create: mockCreate },
        }) as unknown as Anthropic
    );

    const result = await evaluateWithLlm("test-key", mockAlert, mockCodeSearch);

    expect(result.reachability).toBe("Medium");
    expect(result.context).toBe("Production");
  });

  it("handles response wrapped in markdown code fence", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [
        {
          type: "text",
          text: '```json\n{"reachability": "Low", "context": "Test", "reasoning": "テストコードでのみ使用"}\n```',
        },
      ],
    });

    vi.mocked(Anthropic).mockImplementation(
      () =>
        ({
          messages: { create: mockCreate },
        }) as unknown as Anthropic
    );

    const result = await evaluateWithLlm("test-key", mockAlert, mockCodeSearch);

    expect(result).toEqual({
      reachability: "Low",
      context: "Test",
      reasoning: "テストコードでのみ使用",
    });
  });
});
