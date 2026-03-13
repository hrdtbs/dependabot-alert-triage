import Anthropic from "@anthropic-ai/sdk";
import type {
  AlertInfo,
  CodeSearchResult,
  LlmEvaluation,
  Reachability,
  CodeContext,
} from "../types.js";

const FALLBACK_EVALUATION: LlmEvaluation = {
  reachability: "Medium",
  context: "Production",
  reasoning: "LLM解析に失敗したため、安全側に倒してデフォルト値を使用",
};

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

function isValidReachability(value: string): value is Reachability {
  return ["High", "Medium", "Low"].includes(value);
}

function isValidContext(value: string): value is CodeContext {
  return ["Production", "Development", "Test"].includes(value);
}

function parseResponse(text: string): LlmEvaluation | null {
  // Extract JSON from response (may contain markdown fences)
  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    const reachability = String(parsed.reachability ?? "");
    const context = String(parsed.context ?? "");
    const reasoning = String(parsed.reasoning ?? "");

    if (!isValidReachability(reachability) || !isValidContext(context)) {
      return null;
    }

    return { reachability, context, reasoning };
  } catch {
    return null;
  }
}

export async function evaluateWithLlm(
  apiKey: string,
  alert: AlertInfo,
  codeSearch: CodeSearchResult
): Promise<LlmEvaluation> {
  const prompt = buildPrompt(alert, codeSearch);

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    const evaluation = parseResponse(responseText);
    if (!evaluation) {
      console.warn(
        `Warning: Failed to parse LLM response for ${alert.packageName}. Using fallback.`
      );
      return FALLBACK_EVALUATION;
    }

    return evaluation;
  } catch (error) {
    console.warn(
      `Warning: LLM evaluation failed for ${alert.packageName}: ${error}`
    );
    return FALLBACK_EVALUATION;
  }
}
