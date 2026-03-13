import Table from "cli-table3";
import type { TriageResult, FinalRisk } from "../types.js";

const RISK_COLORS: Record<FinalRisk, string> = {
  CRITICAL: "\x1b[41m\x1b[37m", // White on red
  HIGH: "\x1b[31m", // Red
  MEDIUM: "\x1b[33m", // Yellow
  LOW: "\x1b[32m", // Green
  IGNORE: "\x1b[90m", // Gray
};
const RESET = "\x1b[0m";

function colorize(risk: FinalRisk): string {
  return `${RISK_COLORS[risk]}${risk}${RESET}`;
}

export function renderTable(results: TriageResult[]): void {
  const table = new Table({
    head: [
      "#",
      "Package",
      "CVE",
      "KEV",
      "EPSS",
      "Reachability",
      "Context",
      "Risk",
    ],
    colWidths: [6, 25, 18, 6, 8, 14, 14, 12],
    wordWrap: true,
  });

  for (const r of results) {
    table.push([
      r.alert.number,
      r.alert.packageName,
      r.alert.cveId ?? "N/A",
      r.kev ? "Yes" : "No",
      r.epss !== null ? `${(r.epss * 100).toFixed(1)}%` : "N/A",
      r.llmEvaluation.reachability,
      r.llmEvaluation.context,
      colorize(r.finalRisk),
    ]);
  }

  console.log(table.toString());

  // Summary
  const counts: Record<FinalRisk, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    IGNORE: 0,
  };
  for (const r of results) {
    counts[r.finalRisk]++;
  }

  console.log(
    `\nSummary: ${colorize("CRITICAL")} ${counts.CRITICAL} | ${colorize("HIGH")} ${counts.HIGH} | ${colorize("MEDIUM")} ${counts.MEDIUM} | ${colorize("LOW")} ${counts.LOW} | ${colorize("IGNORE")} ${counts.IGNORE}`
  );
}
