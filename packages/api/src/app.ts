import { Hono } from "hono";
import { cors } from "hono/cors";
import { sentry } from "@sentry/hono/node";
import { getConfig } from "./config.js";
import { deployRoutes } from "./routes/deploy.js";
import { healthRoutes } from "./routes/health.js";
import { statsRoutes } from "./routes/stats.js";

export function createApp() {
  const app = new Hono();
  const config = getConfig();

  if (config.sentryDsn) {
    app.use("*", sentry(app));
  }

  if (config.sentryDebug) {
    app.get("/debug-sentry", () => {
      throw new Error("My first Sentry error!");
    });
  }

  app.use(
    "*",
    cors({
      origin: (origin) => {
        if (config.allowedOrigins === "*") {
          return origin ?? "*";
        }
        if (!origin) {
          return config.allowedOrigins[0] ?? null;
        }
        return config.allowedOrigins.includes(origin) ? origin : null;
      },
      allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    }),
  );

  app.route("/", healthRoutes);
  app.route("/v1", deployRoutes);
  app.route("/v1", statsRoutes);

  return app;
}
