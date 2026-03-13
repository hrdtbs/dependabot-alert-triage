import { generateText, Output } from "ai";
import { createProviderRegistry } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { z } from "zod/v4";
import type { AlertInfo, CodeSearchResult, LlmEvaluation } from "../types.js";

const FALLBACK_EVALUATION: LlmEvaluation = {
  reachability: "Medium",
  context: "Production",
  reasoning: "LLM解析に失敗したため、安全側に倒してデフォルト値を使用",
};

const registry = createProviderRegistry({
  anthropic,
  openai,
  google,
});

const evaluationSchema = z.object({
  reachability: z.enum(["High", "Medium", "Low"]),
  context: z.enum(["Production", "Development", "Test"]),
  reasoning: z.string(),
});

function buildPrompt(alert: AlertInfo, codeSearch: CodeSearchResult): string {
  const snippetsText =
    codeSearch.snippets.length > 0
      ? codeSearch.snippets
          .map(
            (s) =>
              `--- ${s.filePath} (L${s.startLine}-L${s.endLine}) ---\n${s.content}`
          )
          .join("\n\n")
      : "(対象パッケージのコード使用箇所が見つかりませんでした)";

  return `あなたはセキュリティエンジニアです。以下の脆弱性情報とソースコードを確認し、脆弱なパッケージがどのように利用されているかをJSON形式で評価してください。

【脆弱性情報】
- 対象パッケージ: ${alert.packageName}
- CVE: ${alert.cveId ?? "N/A"}
- 詳細: ${alert.description}

【ソースコード】
${snippetsText}

【出力要件（JSONのみ出力）】
{
  "reachability": "High | Medium | Low",
  "context": "Production | Development | Test",
  "reasoning": "判定の根拠を日本語で簡潔に記載"
}`;
}

export async function evaluateWithLlm(
  modelId: string,
  alert: AlertInfo,
  codeSearch: CodeSearchResult
): Promise<LlmEvaluation> {
  const prompt = buildPrompt(alert, codeSearch);

  try {
    const model = registry.languageModel(modelId);

    const { output } = await generateText({
      model,
      output: Output.object({ schema: evaluationSchema }),
      prompt,
    });

    if (!output) {
      console.warn(
        `Warning: Failed to parse LLM response for ${alert.packageName}. Using fallback.`
      );
      return FALLBACK_EVALUATION;
    }

    return output;
  } catch (error) {
    console.warn(
      `Warning: LLM evaluation failed for ${alert.packageName}: ${error}`
    );
    return FALLBACK_EVALUATION;
  }
}
