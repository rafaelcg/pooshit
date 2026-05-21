#!/usr/bin/env node
import { Command } from "commander";
import {
  runDeploy,
  runDestroy,
  runInit,
  runLink,
  runList,
  runLogin,
  runLogs,
  runOpen,
  runStatus,
  runUpgrade,
} from "./commands.js";

const program = new Command();

program
  .name("pooshit")
  .description("Ship anything with one command. Zero config.")
  .version("0.1.2");

program
  .command("deploy", { isDefault: true })
  .description("Deploy the current directory")
  .option("--token <token>", "Redeploy using an existing deploy token")
  .option("--json", "Output JSON")
  .action(async (options: { token?: string; json?: boolean }) => {
    await runDeploy(options);
  });

program
  .command("status")
  .description("Show deploy status for this directory")
  .option("--json", "Output JSON")
  .action(async (options: { json?: boolean }) => {
    await runStatus(options);
  });

program
  .command("list")
  .description("List deploys from this network")
  .option("--json", "Output JSON")
  .action(async (options: { json?: boolean }) => {
    await runList(options);
  });

program
  .command("destroy")
  .description("Delete the linked deploy and tear down Railway resources")
  .alias("delete")
  .option("--token <token>", "Destroy by deploy token (for CI)")
  .option("--yes", "Skip confirmation prompt")
  .option("--json", "Output JSON")
  .action(async (options: { token?: string; yes?: boolean; json?: boolean }) => {
    await runDestroy(options);
  });

program
  .command("init")
  .description("Create .pooshit/project.json for this directory")
  .option("--json", "Output JSON")
  .action(async (options: { json?: boolean }) => {
    await runInit(options);
  });

program
  .command("link")
  .description("Link this directory to an existing deploy token")
  .requiredOption("--token <token>", "Deploy token (ps_…)")
  .option("--json", "Output JSON")
  .action(async (options: { token: string; json?: boolean }) => {
    await runLink(options);
  });

program.command("open").description("Open the live URL in your browser").action(runOpen);

program.command("upgrade").description("Upgrade to Pooshit Pro").action(runUpgrade);

program.command("login").description("Log in with GitHub").action(runLogin);

program
  .command("logs")
  .description("Fetch deploy logs")
  .option("--lines <n>", "Number of log lines", "100")
  .option("--json", "Output JSON")
  .action(async (options: { lines?: string; json?: boolean }) => {
    await runLogs({
      lines: options.lines ? Number(options.lines) : 100,
      json: options.json,
    });
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
