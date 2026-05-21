import Database from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as pgSchema from "./schema.pg.js";
import * as sqliteSchema from "./schema.js";

export type PooshitDb = ReturnType<typeof drizzleSqlite<typeof sqliteSchema>>;

let dbInstance: PooshitDb | null = null;
let driver: "sqlite" | "postgres" = "sqlite";
let pgClient: ReturnType<typeof postgres> | null = null;

export function getTables() {
  return isPostgres() ? pgSchema : sqliteSchema;
}

export function useDb() {
  return {
    db: getDb() as ReturnType<typeof drizzleSqlite<typeof sqliteSchema>>,
    deploys: getTables().deploys as typeof sqliteSchema.deploys,
  };
}

export function isPostgres(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

export function getDb(): PooshitDb {
  if (dbInstance) {
    return dbInstance;
  }

  if (isPostgres()) {
    driver = "postgres";
    const url = process.env.DATABASE_URL!;
    pgClient = postgres(url, { max: 10 });
    dbInstance = drizzlePostgres(pgClient, { schema: pgSchema }) as unknown as PooshitDb;
    return dbInstance;
  }

  driver = "sqlite";
  const path = getSqlitePath();
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  dbInstance = drizzleSqlite(sqlite, { schema: sqliteSchema });
  return dbInstance;
}

function getSqlitePath(): string {
  const url = process.env.DATABASE_URL ?? "file:./pooshit.db";
  if (url.startsWith("file:")) {
    return url.slice(5);
  }
  return "./pooshit.db";
}

export async function closeDb(): Promise<void> {
  if (pgClient) {
    await pgClient.end();
    pgClient = null;
  }
  dbInstance = null;
}

export function getDriver(): "sqlite" | "postgres" {
  if (dbInstance) {
    return driver;
  }
  return isPostgres() ? "postgres" : "sqlite";
}

export async function runMigrations(): Promise<void> {
  if (isPostgres()) {
    await runPostgresMigrations();
    return;
  }
  runSqliteMigrations();
}

function runSqliteMigrations(): void {
  const path = getSqlitePath();
  const sqlite = new Database(path);
  sqlite.exec(SQLITE_MIGRATION_SQL);
  sqlite.close();
}

async function runPostgresMigrations(): Promise<void> {
  if (!pgClient) {
    getDb();
  }
  if (!pgClient) {
    throw new Error("Postgres client not initialized");
  }
  await pgClient.unsafe(POSTGRES_MIGRATION_SQL);
}

const SQLITE_MIGRATION_SQL = `
    CREATE TABLE IF NOT EXISTS deploys (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      deploy_token TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      stack TEXT NOT NULL,
      ip_hash TEXT,
      user_id TEXT,
      plan TEXT NOT NULL DEFAULT 'free',
      railway_project_id TEXT,
      railway_service_id TEXT,
      url TEXT,
      error_message TEXT,
      size_bytes INTEGER NOT NULL,
      expires_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      github_id TEXT UNIQUE,
      email TEXT,
      stripe_customer_id TEXT,
      plan TEXT NOT NULL DEFAULT 'free',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      key_hash TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_deploys_status_expires ON deploys(status, expires_at);
    CREATE INDEX IF NOT EXISTS idx_deploys_ip_hash ON deploys(ip_hash);
    CREATE INDEX IF NOT EXISTS idx_deploys_deploy_token ON deploys(deploy_token);
  `;

const POSTGRES_MIGRATION_SQL = `
    CREATE TABLE IF NOT EXISTS deploys (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      deploy_token TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      stack TEXT NOT NULL,
      ip_hash TEXT,
      user_id TEXT,
      plan TEXT NOT NULL DEFAULT 'free',
      railway_project_id TEXT,
      railway_service_id TEXT,
      url TEXT,
      error_message TEXT,
      size_bytes INTEGER NOT NULL,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      github_id TEXT UNIQUE,
      email TEXT,
      stripe_customer_id TEXT,
      plan TEXT NOT NULL DEFAULT 'free',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      key_hash TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_deploys_status_expires ON deploys(status, expires_at);
    CREATE INDEX IF NOT EXISTS idx_deploys_ip_hash ON deploys(ip_hash);
    CREATE INDEX IF NOT EXISTS idx_deploys_deploy_token ON deploys(deploy_token);
  `;

// Re-export schema types for services — sqlite schema is the canonical TS shape
export { sqliteSchema as schema };
export type { Deploy, NewDeploy } from "./schema.js";
