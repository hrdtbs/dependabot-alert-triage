import { Command } from "commander";
import { scanCommand } from "./commands/scan.js";

const program = new Command();

program
  .name("deptriage")
  .description(
    "Triage Dependabot alerts with threat intelligence and LLM-based reachability analysis"
  )
  .version("0.1.0");

program
  .command("scan")
  .description("Scan and triage Dependabot alerts for a repository")
  .requiredOption("-r, --repo <owner/repo>", "Target GitHub repository")
  .option("-f, --format <format>", "Output format (table or json)", "table")
  .option("-l, --limit <number>", "Max alerts to evaluate", "50")
  .option(
    "--epss-threshold <number>",
    "EPSS score threshold for High risk",
    "0.05"
  )
  .action(async (options) => {
    await scanCommand({
      repo: options.repo,
      format: options.format as "table" | "json",
      limit: parseInt(options.limit, 10),
      epssThreshold: parseFloat(options.epssThreshold),
    });
  });

program.parse();
