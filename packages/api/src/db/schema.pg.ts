import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const deploys = pgTable(
  "deploys",
  {
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
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_deploys_status_expires").on(table.status, table.expiresAt),
    index("idx_deploys_ip_hash").on(table.ipHash),
    index("idx_deploys_deploy_token").on(table.deployToken),
  ],
);

export type Deploy = typeof deploys.$inferSelect;

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  githubId: text("github_id").unique(),
  email: text("email"),
  stripeCustomerId: text("stripe_customer_id"),
  plan: text("plan", { enum: ["free", "pro"] })
    .notNull()
    .default("free"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  keyHash: text("key_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
