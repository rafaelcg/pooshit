import * as Sentry from "@sentry/hono/node";
import { bootstrapEnv } from "./env.js";

bootstrapEnv();

const dsn = process.env.SENTRY_DSN?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    sendDefaultPii: true,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
  });
}
