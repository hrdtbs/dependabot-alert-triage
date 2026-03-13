import type { CodeContext, FinalRisk, Reachability } from "../types.js";

export function calculateRisk(
  kev: boolean,
  context: CodeContext,
  reachability: Reachability,
  epss: number,
  threshold: number
): FinalRisk {
  // Priority 1: KEV = True → CRITICAL
  if (kev) return "CRITICAL";

  // Priority 2: Test/Development → IGNORE
  if (context === "Test" || context === "Development") return "IGNORE";

  // Priority 3: Production + Low reachability → LOW
  if (reachability === "Low") return "LOW";

  // Priority 4: Production + High/Medium reachability + EPSS >= threshold → HIGH
  if (epss >= threshold) return "HIGH";

  // Priority 5: Production + High/Medium reachability + EPSS < threshold → MEDIUM
  return "MEDIUM";
}
