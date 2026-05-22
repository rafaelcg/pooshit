import open from "open";
import ora from "ora";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fetchDeployByToken, destroyDeploy, fetchDeployLogs, listDeploys, pollDeployStatus, uploadDeploy } from "./api.js";
import { detectProject } from "./detect.js";
import { formatBytes, packProject, preflight } from "./pack.js";
import { clearLocalDeployContext, loadProjectConfig, persistDeployContext, resolveDeployContext, saveProjectConfig, generateProjectId } from "./project.js";
import { listAllLocalDeploys, removeDeployForCwd, saveDeployState } from "./state.js";
import {
  formatTimeRemaining,
  getStatusLine,
  printBanner,
  printError,
  printJson,
  printSuccess,
  printWarnings,
} from "./ui.js";

interface DeployOptions {
  token?: string;
  json?: boolean;
}

export async function runDeploy(options: DeployOptions): Promise<void> {
  const cwd = process.cwd();
  preflight(cwd);

  if (!options.json) {
    printBanner();
  }

  const detected = detectProject(cwd);
  if (!options.json) {
    printWarnings(detected.warnings);
  }

  const existing = await resolveDeployContext(cwd, { token: options.token });
  const deployToken = options.token ?? existing?.deployToken;

  let statusIndex = 0;
  const packSpinner = options.json
    ? null
    : ora({ text: getStatusLine(statusIndex++), color: "cyan" }).start();

  try {
    const packed = await packProject(cwd);
    if (packSpinner) {
      packSpinner.text = `uploading (${formatBytes(packed.sizeBytes)})…`;
    }

    if (packed.sizeBytes > 50 * 1024 * 1024 && packSpinner) {
      packSpinner.info(
        `Uploading ${formatBytes(packed.sizeBytes)} — free limit is 50 MB`,
      );
    }

    const uploaded = await uploadDeploy({
      buffer: packed.buffer,
      stack: detected.stack,
      deployToken,
    });

    if (packSpinner) {
      packSpinner.text = "building on Railway…";
    }

    const pollStartedAt = Date.now();
    const final = await pollDeployStatus(uploaded.id, (status) => {
      if (!packSpinner) {
        return;
      }
      const elapsedSec = Math.floor((Date.now() - pollStartedAt) / 1000);
      if (status.status === "pending") {
        packSpinner.text = `queued… (${elapsedSec}s)`;
      } else if (status.status === "building") {
        packSpinner.text = `building on Railway… (${elapsedSec}s)`;
      }
    });

    packSpinner?.stopAndPersist({
      symbol: "✓",
      text: "deployed",
    });

    await saveDeployState({
      id: final.id,
      slug: final.slug,
      url: final.url ?? "",
      deployToken: final.deployToken,
      expiresAt: final.expiresAt,
      cwd,
      updatedAt: new Date().toISOString(),
    });

    await persistDeployContext(cwd, {
      id: final.id,
      slug: final.slug,
      url: final.url ?? "",
      deployToken: final.deployToken,
      expiresAt: final.expiresAt,
      cwd,
      updatedAt: new Date().toISOString(),
    });

    if (options.json) {
      printJson(final);
      return;
    }

    if (!final.url) {
      throw new Error("Deploy succeeded but no URL returned");
    }

    printSuccess({
      url: final.url,
      expiresAt: final.expiresAt,
      deployToken: final.deployToken,
      plan: final.plan,
    });
  } catch (error) {
    packSpinner?.fail("deploy failed");
    const message = error instanceof Error ? error.message : "Unknown error";
    if (options.json) {
      printJson({ error: message });
      process.exit(1);
    }
    printError(message);
    process.exit(1);
  }
}

export async function runStatus(options: { json?: boolean }): Promise<void> {
  const cwd = process.cwd();
  const state = await resolveDeployContext(cwd);

  if (!state) {
    if (options.json) {
      printJson({ error: "No deploy found for this directory" });
      process.exit(1);
    }
    printError("No deploy found for this directory. Run npx pooshit first.");
    process.exit(1);
  }

  if (options.json) {
    printJson(state);
    return;
  }

  printBanner();
  console.log(`  url:    ${state.url}`);
  console.log(`  token:  ${state.deployToken}`);
  if (state.expiresAt) {
    console.log(`  expiry: ${formatTimeRemaining(state.expiresAt)}`);
    console.log();
    console.log("  upgrade → npx pooshit upgrade  ($9.99/mo)");
  }
  console.log();
}

export async function runOpen(): Promise<void> {
  const cwd = process.cwd();
  const state = await resolveDeployContext(cwd);
  if (!state?.url) {
    printError("No live URL found. Run npx pooshit first.");
    process.exit(1);
  }
  await open(state.url);
}

export function runUpgrade(): void {
  printBanner();
  console.log("  Pooshit Pro — $9.99/mo");
  console.log();
  console.log("  • stays live forever (free: 24h)");
  console.log("  • 500 MB uploads (free: 50 MB)");
  console.log("  • pick your subdomain");
  console.log("  • custom domain");
  console.log("  • 10 concurrent projects");
  console.log();
  console.log("  Coming soon — run npx pooshit upgrade when billing is live");
  console.log();
}

export function runLogin(): void {
  printBanner();
  console.log("  GitHub login coming soon.");
  console.log("  For now, deploy free without an account: npx pooshit");
  console.log();
}

export async function runLogs(options: { lines?: number; json?: boolean }): Promise<void> {
  const cwd = process.cwd();
  const state = await resolveDeployContext(cwd);

  if (!state) {
    if (options.json) {
      printJson({ error: "No deploy found for this directory" });
      process.exit(1);
    }
    printError("No deploy found for this directory. Run npx pooshit first.");
    process.exit(1);
  }

  const spinner = options.json ? null : ora({ text: "fetching logs…", color: "cyan" }).start();

  try {
    const result = await fetchDeployLogs({
      deployId: state.id,
      lines: options.lines ?? 100,
    });

    spinner?.stop();

    if (options.json) {
      printJson(result);
      return;
    }

    printBanner();
    if (result.serviceName) {
      console.log(`  service: ${result.serviceName}`);
    }
    console.log();
    if (!result.logs) {
      console.log("  (no logs yet — deploy may still be building)");
    } else {
      console.log(result.logs);
    }
    console.log();
  } catch (error) {
    spinner?.fail("failed to fetch logs");
    const message = error instanceof Error ? error.message : "Unknown error";
    if (options.json) {
      printJson({ error: message });
      process.exit(1);
    }
    printError(message);
    process.exit(1);
  }
}

export async function runInit(options: { json?: boolean }): Promise<void> {
  const cwd = process.cwd();
  preflight(cwd);

  const existing = await loadProjectConfig(cwd);
  if (existing) {
    const message = "Project already initialized (.pooshit/project.json exists)";
    if (options.json) {
      printJson({ error: message, project: existing });
      process.exit(1);
    }
    printError(message);
    process.exit(1);
  }

  const project = await saveProjectConfig(cwd, {
    projectId: generateProjectId(),
  });

  if (options.json) {
    printJson(project);
    return;
  }

  printBanner();
  console.log("  Created .pooshit/project.json");
  console.log(`  project: ${project.projectId}`);
  console.log();
  console.log("  Next: npx pooshit");
  console.log();
}

export async function runLink(options: {
  token: string;
  json?: boolean;
}): Promise<void> {
  const cwd = process.cwd();
  preflight(cwd);

  const remote = await fetchDeployByToken(options.token);
  const updatedAt = new Date().toISOString();

  await saveProjectConfig(cwd, {
    deployId: remote.id,
    deployToken: remote.deployToken,
    slug: remote.slug,
    url: remote.url ?? "",
    expiresAt: remote.expiresAt,
    updatedAt,
  });

  await saveDeployState({
    id: remote.id,
    slug: remote.slug,
    url: remote.url ?? "",
    deployToken: remote.deployToken,
    expiresAt: remote.expiresAt,
    cwd,
    updatedAt,
  });

  if (options.json) {
    printJson(remote);
    return;
  }

  printBanner();
  console.log("  Linked project to existing deploy");
  console.log(`  url:   ${remote.url ?? "(pending)"}`);
  console.log(`  token: ${remote.deployToken}`);
  console.log();
}

async function confirmDestroy(url: string | undefined): Promise<boolean> {
  const rl = createInterface({ input, output });
  const target = url ?? "this deploy";
  const answer = await rl.question(`Destroy ${target}? This cannot be undone. (y/N) `);
  rl.close();
  const normalized = answer.trim().toLowerCase();
  return normalized === "y" || normalized === "yes";
}

export async function runDestroy(options: {
  token?: string;
  yes?: boolean;
  json?: boolean;
}): Promise<void> {
  const cwd = process.cwd();
  const state = await resolveDeployContext(cwd, { token: options.token });
  const deployToken = options.token ?? state?.deployToken;

  if (!deployToken) {
    const message =
      "No deploy token found. Link a project or pass --token ps_…";
    if (options.json) {
      printJson({ error: message });
      process.exit(1);
    }
    printError(message);
    process.exit(1);
  }

  const targetLabel = state?.url || state?.slug || deployToken;

  if (!options.yes && !options.json) {
    const confirmed = await confirmDestroy(targetLabel);
    if (!confirmed) {
      console.log("Cancelled.");
      return;
    }
  }

  const spinner = options.json
    ? null
    : ora({ text: "destroying deploy…", color: "cyan" }).start();

  try {
    const result = await destroyDeploy(deployToken);

    if (state?.deployToken === deployToken || !options.token) {
      await clearLocalDeployContext(cwd);
      await removeDeployForCwd(cwd);
    }

    spinner?.stopAndPersist({ symbol: "✓", text: "destroyed" });

    if (options.json) {
      printJson(result);
      return;
    }

    printBanner();
    console.log(`  removed: ${result.url ?? result.slug}`);
    if (state?.deployToken === deployToken || !options.token) {
      console.log("  local project link cleared");
    }
    console.log();
  } catch (error) {
    spinner?.fail("destroy failed");
    const message = error instanceof Error ? error.message : "Unknown error";
    if (options.json) {
      printJson({ error: message });
      process.exit(1);
    }
    printError(message);
    process.exit(1);
  }
}

export async function runList(options: { json?: boolean }): Promise<void> {
  const spinner = options.json ? null : ora({ text: "fetching deploys…", color: "cyan" }).start();

  try {
    const [remote, local] = await Promise.all([listDeploys(), listAllLocalDeploys()]);
    spinner?.stop();

    if (options.json) {
      printJson({ deploys: remote, local });
      return;
    }

    printBanner();
    console.log("  Deploys from this network (last 50):");
    console.log();

    if (remote.length === 0) {
      console.log("  (none — run npx pooshit to create one)");
    } else {
      for (const deploy of remote) {
        const expiry = deploy.expiresAt
          ? formatTimeRemaining(deploy.expiresAt)
          : "no expiry";
        console.log(
          `  ${deploy.status.padEnd(8)} ${deploy.url ?? deploy.slug}  ·  ${expiry}`,
        );
      }
    }

    if (local.length > 0) {
      console.log();
      console.log("  Locally linked directories:");
      for (const entry of local) {
        console.log(`  ${entry.cwd}`);
        console.log(`    ${entry.url || entry.slug}`);
      }
    }

    console.log();
  } catch (error) {
    spinner?.fail("failed to list deploys");
    const message = error instanceof Error ? error.message : "Unknown error";
    if (options.json) {
      printJson({ error: message });
      process.exit(1);
    }
    printError(message);
    process.exit(1);
  }
}
