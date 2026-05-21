import { Hono } from "hono";
import { getConfig } from "../config.js";
import { getDriver } from "../db/index.js";
import { isHetznerStaticEnabled } from "../hetzner/config.js";

export const healthRoutes = new Hono();

healthRoutes.get("/health", (c) => {
  const config = getConfig();
  return c.json({
    ok: true,
    version: process.env.npm_package_version ?? "0.1.0",
    db: getDriver(),
    mockDeploys: config.mockDeploys,
    useCliLogin: config.useCliLogin,
    hetznerStatic: isHetznerStaticEnabled(config),
  });
});
