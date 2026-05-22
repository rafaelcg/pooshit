import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });
const rows = await sql`SELECT slug FROM deploys WHERE status = 'live' ORDER BY slug`;
console.log(rows.map((row) => row.slug).join(","));
await sql.end();
