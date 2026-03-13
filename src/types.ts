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

/** 認証ユーザー情報 */
export interface UserInfo {
  login: string;
  name: string | null;
}

/** Organization情報 */
export interface OrgInfo {
  login: string;
  description: string | null;
}

/** スコープ選択 */
export type ScopeSelection =
  | { type: "user"; login: string }
  | { type: "org"; org: string };

/** リポジトリ別アラート */
export interface RepoAlerts {
  repo: string;
  alerts: AlertInfo[];
}

/** リポジトリ別トリアージ結果 */
export interface RepoTriageResult {
  repo: string;
  alerts: AlertReport[];
}

/** triageコマンドのCLIオプション */
export interface TriageOptions {
  format: "markdown" | "json";
  limit: number;
  epssThreshold: number;
  scope?: string;
  concurrency: number;
  skipCodeSearch: boolean;
}

/** マルチリポトリアージレポート */
export interface TriageReport {
  scope: ScopeSelection;
  repos: RepoTriageResult[];
}
