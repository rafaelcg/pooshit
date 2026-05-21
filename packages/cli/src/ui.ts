import pc from "picocolors";

export function printBanner(): void {
  console.log();
  console.log(pc.cyan("  pooshit") + pc.dim(" · ship anything"));
  console.log();
}

const STATUS_LINES = [
  "packing your project…",
  "uploading to the cloud…",
  "building on the cloud…",
  "negotiating with the cloud…",
  "almost there…",
  "teaching Node about PORT…",
  "summoning containers…",
];

export function getStatusLine(index: number): string {
  return STATUS_LINES[index % STATUS_LINES.length]!;
}

export function printWarnings(warnings: string[]): void {
  for (const warning of warnings) {
    console.log(pc.yellow(`  ⚠ ${warning}`));
  }
  if (warnings.length > 0) {
    console.log();
  }
}

export function printSuccess(options: {
  url: string;
  expiresAt: string | null;
  deployToken: string;
  plan: "free" | "pro";
}): void {
  console.log();
  console.log(pc.bold("  Hey! Your project is live:"));
  console.log();
  console.log(pc.green(`  →  ${options.url}`));
  console.log();

  if (options.plan === "free" && options.expiresAt) {
    const hours = Math.max(
      1,
      Math.round(
        (new Date(options.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60),
      ),
    );
    console.log(pc.dim(`  ⏱  expires in ${hours} hours`));
    console.log();
    console.log(
      pc.dim("  like it?  ") +
        pc.white("npx pooshit upgrade") +
        pc.dim("  ($9.99/mo — keep it forever)"),
    );
  } else {
    console.log(pc.dim("  ✓  pro — stays live forever"));
  }

  console.log();
  console.log(pc.dim(`  redeploy token: ${options.deployToken}`));
  console.log();
  console.log(pc.dim("  shipped with pooshit"));
  console.log();
}

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function formatTimeRemaining(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) {
    return "expired";
  }
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}

export function printError(message: string): void {
  console.error();
  console.error(pc.red(`  ✗ ${message}`));
  console.error();
}
