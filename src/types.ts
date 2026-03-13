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

/** 1アラート分の収集結果 */
export interface AlertReport {
  alert: AlertInfo;
  kev: boolean;
  epss: number | null;
  codeSearch: CodeSearchResult;
}

/** CLI設定 */
export interface ScanOptions {
  repo: string;
  format: "markdown" | "json";
  limit: number;
  epssThreshold: number;
}
