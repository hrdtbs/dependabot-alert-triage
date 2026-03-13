import { describe, it, expect } from "vitest";
import { calculateRisk } from "../../src/scoring/matrix.js";

describe("calculateRisk", () => {
  const threshold = 0.05;

  it("returns CRITICAL when KEV is true regardless of other factors", () => {
    expect(calculateRisk(true, "Production", "Low", 0.01, threshold)).toBe(
      "CRITICAL"
    );
    expect(calculateRisk(true, "Test", "High", 0.9, threshold)).toBe(
      "CRITICAL"
    );
    expect(
      calculateRisk(true, "Development", "Medium", 0.0, threshold)
    ).toBe("CRITICAL");
  });

  it("returns IGNORE when context is Test", () => {
    expect(calculateRisk(false, "Test", "High", 0.9, threshold)).toBe(
      "IGNORE"
    );
    expect(calculateRisk(false, "Test", "Low", 0.0, threshold)).toBe(
      "IGNORE"
    );
  });

  it("returns IGNORE when context is Development", () => {
    expect(
      calculateRisk(false, "Development", "High", 0.9, threshold)
    ).toBe("IGNORE");
    expect(
      calculateRisk(false, "Development", "Medium", 0.03, threshold)
    ).toBe("IGNORE");
  });

  it("returns LOW when Production + Low reachability", () => {
    expect(calculateRisk(false, "Production", "Low", 0.9, threshold)).toBe(
      "LOW"
    );
    expect(calculateRisk(false, "Production", "Low", 0.0, threshold)).toBe(
      "LOW"
    );
  });

  it("returns HIGH when Production + High/Medium reachability + EPSS >= threshold", () => {
    expect(calculateRisk(false, "Production", "High", 0.05, threshold)).toBe(
      "HIGH"
    );
    expect(calculateRisk(false, "Production", "Medium", 0.1, threshold)).toBe(
      "HIGH"
    );
    expect(calculateRisk(false, "Production", "High", 0.9, threshold)).toBe(
      "HIGH"
    );
  });

  it("returns MEDIUM when Production + High/Medium reachability + EPSS < threshold", () => {
    expect(calculateRisk(false, "Production", "High", 0.04, threshold)).toBe(
      "MEDIUM"
    );
    expect(
      calculateRisk(false, "Production", "Medium", 0.0, threshold)
    ).toBe("MEDIUM");
    expect(
      calculateRisk(false, "Production", "High", 0.049, threshold)
    ).toBe("MEDIUM");
  });

  it("works with custom threshold", () => {
    const customThreshold = 0.1;
    expect(
      calculateRisk(false, "Production", "High", 0.05, customThreshold)
    ).toBe("MEDIUM");
    expect(
      calculateRisk(false, "Production", "High", 0.1, customThreshold)
    ).toBe("HIGH");
  });
});
