import { createHash, randomBytes } from "node:crypto";

export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

export function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(6);
  let slug = "";
  for (let i = 0; i < 6; i++) {
    slug += chars[bytes[i]! % chars.length];
  }
  return slug;
}

export function generateDeployToken(): string {
  return `ps_${randomBytes(16).toString("hex")}`;
}

export function generateId(): string {
  return randomBytes(12).toString("hex");
}

export function buildUrl(slug: string, domain: string): string {
  return `https://${slug}.${domain}`;
}
