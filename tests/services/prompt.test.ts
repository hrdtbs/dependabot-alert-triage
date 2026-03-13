import { describe, it, expect } from "vitest";
import { parseScope } from "../../src/services/prompt.js";

describe("parseScope", () => {
  it('parses "user" scope', () => {
    const scope = parseScope("user");
    expect(scope).toEqual({ type: "user", login: "" });
  });

  it('parses "org:<name>" scope', () => {
    const scope = parseScope("org:my-company");
    expect(scope).toEqual({ type: "org", org: "my-company" });
  });

  it("throws on empty org name", () => {
    expect(() => parseScope("org:")).toThrow("Invalid --scope format");
  });

  it("throws on invalid format", () => {
    expect(() => parseScope("invalid")).toThrow("Invalid --scope format");
  });

  it("throws on empty string", () => {
    expect(() => parseScope("")).toThrow("Invalid --scope format");
  });
});
