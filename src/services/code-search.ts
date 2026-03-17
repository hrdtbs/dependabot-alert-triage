import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import type { CodeSearchResult, CodeSnippet } from "../types.js";

const execFileAsync = promisify(execFile);

export const MAX_FILES = 3;
export const CONTEXT_LINES = 5;
export const MAX_TOTAL_LINES = 200;

async function cloneRepo(
  token: string,
  repo: string
): Promise<string> {
  const cloneDir = join(process.cwd(), ".deptriage-cache", repo.replace("/", "_"));

  if (existsSync(join(cloneDir, ".git"))) {
    return cloneDir;
  }

  await mkdir(cloneDir, { recursive: true });
  const cloneUrl = `https://x-access-token:${token}@github.com/${repo}.git`;
  await execFileAsync("git", ["clone", "--depth", "1", cloneUrl, cloneDir]);

  return cloneDir;
}

interface RgMatch {
  type: string;
  data: {
    path?: { text: string };
    line_number?: number;
  };
}

async function searchWithRipgrep(
  repoDir: string,
  packageName: string
): Promise<Array<{ filePath: string; lineNumber: number }>> {
  try {
    const { stdout } = await execFileAsync(
      "rg",
      [
        "--json",
        "--glob",
        "!node_modules",
        "--glob",
        "!vendor",
        "--glob",
        "!.git",
        "--glob",
        "!*.lock",
        "--glob",
        "!package-lock.json",
        packageName,
        repoDir,
      ],
      { maxBuffer: 10 * 1024 * 1024 }
    );

    const matches: Array<{ filePath: string; lineNumber: number }> = [];

    for (const line of stdout.split("\n").filter(Boolean)) {
      try {
        const parsed = JSON.parse(line) as RgMatch;
        if (
          parsed.type === "match" &&
          parsed.data.path?.text &&
          parsed.data.line_number
        ) {
          matches.push({
            filePath: parsed.data.path.text,
            lineNumber: parsed.data.line_number,
          });
        }
      } catch {
        // Skip malformed JSON lines
      }
    }

    return matches;
  } catch {
    // ripgrep not found or no matches, fallback to grep
    return searchWithGrep(repoDir, packageName);
  }
}

async function searchWithGrep(
  repoDir: string,
  packageName: string
): Promise<Array<{ filePath: string; lineNumber: number }>> {
  try {
    const { stdout } = await execFileAsync(
      "grep",
      [
        "-rn",
        "--exclude-dir=node_modules",
        "--exclude-dir=vendor",
        "--exclude-dir=.git",
        packageName,
        repoDir,
      ],
      { maxBuffer: 10 * 1024 * 1024 }
    );

    const matches: Array<{ filePath: string; lineNumber: number }> = [];

    for (const line of stdout.split("\n").filter(Boolean)) {
      const match = line.match(/^(.+?):(\d+):/);
      if (match) {
        matches.push({
          filePath: match[1],
          lineNumber: parseInt(match[2], 10),
        });
      }
    }

    return matches;
  } catch {
    return [];
  }
}

async function extractSnippet(
  filePath: string,
  lineNumber: number
): Promise<CodeSnippet | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    const lines = content.split("\n");

    const startLine = Math.max(0, lineNumber - 1 - CONTEXT_LINES);
    const endLine = Math.min(lines.length, lineNumber + CONTEXT_LINES);
    const snippetLines = lines.slice(startLine, endLine);

    return {
      filePath,
      startLine: startLine + 1,
      endLine,
      content: snippetLines.join("\n"),
    };
  } catch {
    return null;
  }
}

async function collectSnippets(
  matches: Array<{ filePath: string; lineNumber: number }>
): Promise<CodeSnippet[]> {
  const uniqueFiles = new Map<string, number>();
  for (const match of matches) {
    if (!uniqueFiles.has(match.filePath)) {
      uniqueFiles.set(match.filePath, match.lineNumber);
    }
  }

  const filesToProcess = Array.from(uniqueFiles.entries()).slice(0, MAX_FILES);
  const snippets: CodeSnippet[] = [];
  let totalLines = 0;

  for (const [filePath, lineNumber] of filesToProcess) {
    if (totalLines >= MAX_TOTAL_LINES) break;

    const snippet = await extractSnippet(filePath, lineNumber);
    if (snippet) {
      const snippetLineCount = snippet.endLine - snippet.startLine + 1;
      if (totalLines + snippetLineCount > MAX_TOTAL_LINES) {
        const allowedLines = MAX_TOTAL_LINES - totalLines;
        const truncatedContent = snippet.content
          .split("\n")
          .slice(0, allowedLines)
          .join("\n");
        snippets.push({
          ...snippet,
          endLine: snippet.startLine + allowedLines - 1,
          content: truncatedContent,
        });
        totalLines = MAX_TOTAL_LINES;
      } else {
        snippets.push(snippet);
        totalLines += snippetLineCount;
      }
    }
  }

  return snippets;
}

export async function searchCodeMultiPackage(
  token: string,
  repo: string,
  packageNames: string[]
): Promise<CodeSearchResult[]> {
  const repoDir = await cloneRepo(token, repo);
  const results: CodeSearchResult[] = [];

  for (const packageName of packageNames) {
    const matches = await searchWithRipgrep(repoDir, packageName);
    const snippets = await collectSnippets(matches);
    results.push({ packageName, snippets });
  }

  return results;
}

export async function searchCode(
  token: string,
  repo: string,
  packageName: string
): Promise<CodeSearchResult> {
  const repoDir = await cloneRepo(token, repo);
  const matches = await searchWithRipgrep(repoDir, packageName);
  const snippets = await collectSnippets(matches);
  return { packageName, snippets };
}
