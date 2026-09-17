import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;
const globalForDb = globalThis as unknown as { sql?: Sql };

// One small connection pool per server instance. `prepare: false` is required
// by Supabase's transaction pooler.
export function getSql(): Sql {
  if (!globalForDb.sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    globalForDb.sql = postgres(url, { prepare: false, max: 3, ssl: local ? false : "require" });
  }
  return globalForDb.sql;
}
