import { Hono } from "hono";
import { generateId } from "../lib/ids.js";
import {
  createDeploy,
  DeployError,
  destroyDeployByToken,
  getDeployByToken,
  getDeployLogs,
  getDeployStatus,
  listDeploysForIp,
  saveUpload,
  type StackType,
} from "../services/deploy.js";

export const deployRoutes = new Hono();

deployRoutes.post("/deploy", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("archive");
    const stack = (formData.get("stack") as StackType | null) ?? "generic";
    const deployToken = formData.get("deployToken") as string | null;

    if (!(file instanceof File)) {
      return c.json({ error: "Missing archive file" }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0) {
      return c.json({ error: "Empty archive" }, 400);
    }

    const uploadId = generateId();
    const tarballPath = await saveUpload(buffer, uploadId);

    const ip = getRequestIp(c);

    const result = await createDeploy({
      tarballPath,
      sizeBytes: buffer.length,
      stack,
      ip,
      deployToken: deployToken ?? undefined,
    });

    return c.json(result, 202);
  } catch (error) {
    if (error instanceof DeployError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

function getRequestIp(c: { req: { header: (name: string) => string | undefined } }): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.header("x-real-ip") ??
    "127.0.0.1"
  );
}

deployRoutes.get("/deploys", async (c) => {
  const deploys = await listDeploysForIp(getRequestIp(c));
  return c.json({ deploys });
});

deployRoutes.delete("/deploy/token/:token", async (c) => {
  try {
    const result = await destroyDeployByToken(c.req.param("token"));
    return c.json(result);
  } catch (error) {
    if (error instanceof DeployError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

deployRoutes.get("/deploy/:id/status", async (c) => {
  const status = await getDeployStatus(c.req.param("id"));
  if (!status) {
    return c.json({ error: "Deploy not found" }, 404);
  }
  return c.json(status);
});

deployRoutes.get("/deploy/:id/logs", async (c) => {
  const lines = Number(c.req.query("lines") ?? 100);
  const result = await getDeployLogs({
    deployId: c.req.param("id"),
    lines: Number.isFinite(lines) ? lines : 100,
  });

  if (!result) {
    return c.json({ error: "Deploy not found" }, 404);
  }

  return c.json(result);
});

deployRoutes.get("/deploy/token/:token", async (c) => {
  const status = await getDeployByToken(c.req.param("token"));
  if (!status) {
    return c.json({ error: "Deploy not found" }, 404);
  }
  return c.json(status);
});

deployRoutes.get("/deploy/token/:token/logs", async (c) => {
  const lines = Number(c.req.query("lines") ?? 100);
  const result = await getDeployLogs({
    deployToken: c.req.param("token"),
    lines: Number.isFinite(lines) ? lines : 100,
  });

  if (!result) {
    return c.json({ error: "Deploy not found" }, 404);
  }

  return c.json(result);
});
