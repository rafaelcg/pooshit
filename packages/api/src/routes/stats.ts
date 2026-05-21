import { count, eq } from "drizzle-orm";
import { Hono } from "hono";
import { useDb } from "../db/index.js";

export const statsRoutes = new Hono();

statsRoutes.get("/stats", async (c) => {
  const { db, deploys } = useDb();
  const [total] = await db.select({ value: count() }).from(deploys);
  const [live] = await db
    .select({ value: count() })
    .from(deploys)
    .where(eq(deploys.status, "live"));

  return c.json({
    totalDeploys: total?.value ?? 0,
    liveDeploys: live?.value ?? 0,
  });
});
