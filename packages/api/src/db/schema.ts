import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const deploys = sqliteTable("deploys", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  deployToken: text("deploy_token").notNull().unique(),
  status: text("status", {
    enum: ["pending", "building", "live", "failed", "expired"],
  })
    .notNull()
    .default("pending"),
  stack: text("stack").notNull(),
  ipHash: text("ip_hash"),
  userId: text("user_id"),
  plan: text("plan", { enum: ["free", "pro"] })
    .notNull()
    .default("free"),
  railwayProjectId: text("railway_project_id"),
  railwayServiceId: text("railway_service_id"),
  url: text("url"),
  errorMessage: text("error_message"),
  sizeBytes: integer("size_bytes").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Deploy = typeof deploys.$inferSelect;
export type NewDeploy = typeof deploys.$inferInsert;

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  githubId: text("github_id").unique(),
  email: text("email"),
  stripeCustomerId: text("stripe_customer_id"),
  plan: text("plan", { enum: ["free", "pro"] })
    .notNull()
    .default("free"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  keyHash: text("key_hash").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
