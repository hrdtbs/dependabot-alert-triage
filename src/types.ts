/** Dependabotアラートから抽出した情報 */
export interface AlertInfo {
  number: number;
  cveId: string | null;
  packageName: string;
  vulnerableVersion: string;
  manifestPath: string;
  description: string;
}

/** KEV照合結果 */
export interface KevResult {
  cveId: string;
  inKev: boolean;
}

/** EPSSスコア結果 */
export interface EpssResult {
  cveId: string;
  score: number | null;
}

/** コード検索で抽出したスニペット */
export interface CodeSnippet {
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
}

/** コード検索結果 */
export interface CodeSearchResult {
  packageName: string;
  snippets: CodeSnippet[];
}

/** LLMによる解析結果 */
export type Reachability = "High" | "Medium" | "Low";
export type CodeContext = "Production" | "Development" | "Test";

export interface LlmEvaluation {
  reachability: Reachability;
  context: CodeContext;
  reasoning: string;
}

/** 最終リスク評価 */
export type FinalRisk = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "IGNORE";

/** 1アラート分の統合結果 */
export interface TriageResult {
  alert: AlertInfo;
  kev: boolean;
  epss: number | null;
  codeSearch: CodeSearchResult;
  llmEvaluation: LlmEvaluation;
  finalRisk: FinalRisk;
}

/** CLI設定 */
export interface ScanOptions {
  repo: string;
  format: "table" | "json";
  limit: number;
  epssThreshold: number;
}
