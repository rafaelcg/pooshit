import * as Sentry from "@sentry/hono/node";
import { serve } from "@hono/node-server";
import { bootstrapEnv } from "./env.js";
import { mkdir } from "node:fs/promises";
import { createApp } from "./app.js";
import { getConfig } from "./config.js";
import { runMigrations } from "./db/index.js";
import { verifyRailwayAuth } from "./railway/auth.js";
import { cleanupExpiredDeploys } from "./services/deploy.js";

bootstrapEnv();

async function main() {
  const config = getConfig();
  await runMigrations();
  await mkdir(config.uploadsDir, { recursive: true });

  if (!config.mockDeploys) {
    await verifyRailwayAuth();
  }

  const app = createApp();

  if (!config.mockDeploys) {
    void cleanupExpiredDeploys().then((count) => {
      if (count > 0) {
        console.log(`Startup cleanup: removed ${count} expired deploy(s)`);
      }
    });
  }

  serve({ fetch: app.fetch, port: config.port }, (info) => {
    console.log(`pooshit api listening on http://localhost:${info.port}`);
    if (config.mockDeploys) {
      console.log("MOCK_DEPLOYS enabled — Railway will not be called");
    } else if (config.useCliLogin) {
      console.log("Using railway login session (RAILWAY_USE_CLI_LOGIN=true)");
    } else if (config.railwayApiToken) {
      console.log("Using RAILWAY_API_TOKEN for deploys");
    }
  });

  setInterval(() => {
    void cleanupExpiredDeploys().then((count) => {
      if (count > 0) {
        console.log(`Cleaned up ${count} expired deploy(s)`);
      }
    });
  }, 15 * 60 * 1000);
}

main().catch((error) => {
  console.error(error);
  if (process.env.SENTRY_DSN?.trim()) {
    Sentry.captureException(error);
    void Sentry.flush(2000).finally(() => process.exit(1));
    return;
  }
  process.exit(1);
});
