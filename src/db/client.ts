import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { ensureSchema } from "./ensureSchema";

const sqlitePath =
  process.env.DATABASE_FILENAME ??
  (process.env.VERCEL ? "/tmp/installer_scheduler.db" : "installer_scheduler.db");

let sqlite: Database;
try {
  sqlite = new Database(sqlitePath);
} catch (err) {
  console.error(
    "Failed to open sqlite file at path",
    sqlitePath,
    "- falling back to in-memory DB.",
    err
  );
  sqlite = new Database(":memory:");
}

ensureSchema(sqlite);

export const db = drizzle(sqlite, { schema });
