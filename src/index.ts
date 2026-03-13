import { Command } from "commander";
import { scanCommand } from "./commands/scan.js";

const program = new Command();

program
  .name("deptriage")
  .description(
    "Triage Dependabot alerts with threat intelligence and code usage analysis"
  )
  .version("0.2.0");

program
  .command("scan")
  .description(
    "Collect Dependabot alert data and generate an LLM-friendly triage report"
  )
  .requiredOption("-r, --repo <owner/repo>", "Target GitHub repository")
  .option(
    "-f, --format <format>",
    "Output format (markdown or json)",
    "markdown"
  )
  .option("-l, --limit <number>", "Max alerts to evaluate", "50")
  .option(
    "--epss-threshold <number>",
    "EPSS score threshold for High risk",
    "0.05"
  )
  .action(async (options) => {
    await scanCommand({
      repo: options.repo,
      format: options.format as "markdown" | "json",
      limit: parseInt(options.limit, 10),
      epssThreshold: parseFloat(options.epssThreshold),
    });
  });

program.parse();
