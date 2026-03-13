export interface Config {
  githubToken: string;
}

export function loadConfig(): Config {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.error("Error: GITHUB_TOKEN environment variable is required.");
    process.exit(1);
  }

  return { githubToken };
}
