import type { EpssResult } from "../types.js";

const EPSS_API_URL = "https://api.first.org/data/v1/epss";

interface EpssApiResponse {
  data: Array<{
    cve: string;
    epss: string;
  }>;
}

export async function fetchEpssScores(
  cveIds: string[]
): Promise<EpssResult[]> {
  if (cveIds.length === 0) return [];

  const url = `${EPSS_API_URL}?cve=${cveIds.join(",")}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(
        `Warning: EPSS API returned HTTP ${response.status}. EPSS scores will be unavailable.`
      );
      return cveIds.map((cveId) => ({ cveId, score: null }));
    }

    const data = (await response.json()) as EpssApiResponse;
    const scoreMap = new Map(
      data.data.map((entry) => [entry.cve, parseFloat(entry.epss)])
    );

    return cveIds.map((cveId) => ({
      cveId,
      score: scoreMap.get(cveId) ?? null,
    }));
  } catch (error) {
    console.warn(`Warning: Failed to fetch EPSS scores: ${error}`);
    return cveIds.map((cveId) => ({ cveId, score: null }));
  }
}
