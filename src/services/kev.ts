import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { KevResult } from "../types.js";

const KEV_URL =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
const CACHE_DIR = join(tmpdir(), "deptriage-cache");
const CACHE_FILE = join(CACHE_DIR, "kev.json");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface KevCatalog {
  vulnerabilities: Array<{ cveID: string }>;
}

async function fetchKevCatalog(): Promise<Set<string>> {
  // Check cache
  try {
    const stat = await import("node:fs").then((fs) =>
      fs.promises.stat(CACHE_FILE)
    );
    const age = Date.now() - stat.mtimeMs;
    if (age < CACHE_TTL_MS) {
      const cached = JSON.parse(
        await readFile(CACHE_FILE, "utf-8")
      ) as KevCatalog;
      return new Set(cached.vulnerabilities.map((v) => v.cveID));
    }
  } catch {
    // Cache miss or error, fetch fresh
  }

  const response = await fetch(KEV_URL);
  if (!response.ok) {
    console.warn(
      `Warning: Failed to fetch KEV catalog (HTTP ${response.status}). KEV data will be unavailable.`
    );
    return new Set();
  }

  const data = (await response.json()) as KevCatalog;

  // Write cache
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(CACHE_FILE, JSON.stringify(data), "utf-8");
  } catch {
    // Cache write failure is non-fatal
  }

  return new Set(data.vulnerabilities.map((v) => v.cveID));
}

export async function checkKev(cveIds: string[]): Promise<KevResult[]> {
  const kevSet = await fetchKevCatalog();

  return cveIds.map((cveId) => ({
    cveId,
    inKev: kevSet.has(cveId),
  }));
}
