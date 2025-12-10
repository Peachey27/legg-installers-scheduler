import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { ensureSchema } from "./ensureSchema";

const sqlitePath =
  process.env.DATABASE_FILENAME ??
  (process.env.VERCEL ? "/tmp/installer_scheduler.db" : "installer_scheduler.db");

const sqlite = new Database(sqlitePath);

ensureSchema(sqlite);

export const db = drizzle(sqlite, { schema });
