export const SCORING_MATRIX = {
  description:
    "上から順に評価し、最初に合致した条件のFinal Riskを割り当てる",
  rules: [
    {
      priority: 1,
      kev: true,
      context: null,
      reachability: null,
      epss: null,
      finalRisk: "CRITICAL",
    },
    {
      priority: 2,
      kev: false,
      context: "Test / Development",
      reachability: null,
      epss: null,
      finalRisk: "IGNORE",
    },
    {
      priority: 3,
      kev: false,
      context: "Production",
      reachability: "Low",
      epss: null,
      finalRisk: "LOW",
    },
    {
      priority: 4,
      kev: false,
      context: "Production",
      reachability: "High / Medium",
      epss: ">= threshold",
      finalRisk: "HIGH",
    },
    {
      priority: 5,
      kev: false,
      context: "Production",
      reachability: "High / Medium",
      epss: "< threshold",
      finalRisk: "MEDIUM",
    },
  ],
};

export function buildMarkdownAnalysisPrompt(
  epssThreshold: number,
  intro: string,
  finalInstruction: string
): string {
  const thresholdPercent = (epssThreshold * 100).toFixed(0);
  return `あなたはセキュリティエンジニアです。${intro}

各アラートについて、コードスニペットを確認し以下を判定してください:
- **Reachability**: High（対象パッケージの関数・クラスが直接呼び出されている）/ Medium（インポートされているが呼び出しが不明確）/ Low（インポートのみ、または使用箇所なし）
- **Context**: Production（本番コード）/ Development（ビルドスクリプト等）/ Test（テストコード）

判定後、以下のスコアリングマトリクスを上から順に適用し、最初に合致した条件のFinal Riskを割り当ててください:

| 優先順位 | KEV | Context | Reachability | EPSS | Final Risk |
| --- | --- | --- | --- | --- | --- |
| 1 | True | - | - | - | CRITICAL |
| 2 | False | Test / Dev | - | - | IGNORE |
| 3 | False | Production | Low | - | LOW |
| 4 | False | Production | High / Medium | >= ${thresholdPercent}% | HIGH |
| 5 | False | Production | High / Medium | < ${thresholdPercent}% | MEDIUM |

${finalInstruction}

| # | Package | CVE | KEV | EPSS | Reachability | Context | Final Risk | 理由 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |`;
}
