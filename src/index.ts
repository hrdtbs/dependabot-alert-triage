import { Command } from "commander";
import { triageCommand } from "./commands/triage.js";

const program = new Command();

program
  .name("deptriage")
  .description(
    "Triage Dependabot alerts with threat intelligence and code usage analysis"
  )
  .version("0.3.0");

program
  .command("triage")
  .description(
    "Triage Dependabot alerts across all repositories for a user or organization"
  )
  .option(
    "-f, --format <format>",
    "Output format (markdown or json)",
    "json"
  )
  .option(
    "-l, --limit <number>",
    "Max alerts per repository",
    "50"
  )
  .option(
    "--epss-threshold <number>",
    "EPSS score threshold for High risk",
    "0.05"
  )
  .option("--repo <owner/repo>", "Target a single repository")
  .option("--org <name>", "Target an organization")
  .option("--user <login>", "Target a user account")
  .option(
    "--concurrency <number>",
    "Max parallel repository operations",
    "5"
  )
  .option(
    "--skip-code-search",
    "Skip cloning and code search (faster)",
    false
  )
  .action(async (options) => {
    await triageCommand({
      format: options.format as "markdown" | "json",
      limit: parseInt(options.limit, 10),
      epssThreshold: parseFloat(options.epssThreshold),
      repo: options.repo,
      org: options.org,
      user: options.user,
      concurrency: parseInt(options.concurrency, 10),
      skipCodeSearch: options.skipCodeSearch,
    });
  });

program.parse();
