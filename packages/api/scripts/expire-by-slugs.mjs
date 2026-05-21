import postgres from "postgres";

const slugs = process.argv.slice(2);

if (slugs.length === 0) {
  console.error("Usage: node expire-by-slugs.mjs <slug> [slug...]");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

const rows = await sql`
  UPDATE deploys
  SET status = 'expired', updated_at = NOW()
  WHERE slug = ANY(${slugs})
    AND status = 'live'
  RETURNING slug
`;

console.log(`Marked expired: ${rows.map((row) => row.slug).join(", ") || "(none)"}`);
await sql.end();
