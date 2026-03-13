export interface Config {
  githubToken: string;
  llmApiKey: string;
}

export function loadConfig(): Config {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.error("Error: GITHUB_TOKEN environment variable is required.");
    process.exit(1);
  }

  const llmApiKey = process.env.LLM_API_KEY;
  if (!llmApiKey) {
    console.error("Error: LLM_API_KEY environment variable is required.");
    process.exit(1);
  }

  return { githubToken, llmApiKey };
}
