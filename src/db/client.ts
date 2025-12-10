import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import * as schema from "./schema";
import { ensureSchema } from "./ensureSchema";

const sqlitePath =
  process.env.DATABASE_FILENAME ??
  (process.env.VERCEL ? "/tmp/installer_scheduler.db" : "installer_scheduler.db");

// On Vercel, prepare a writable copy in /tmp (copy bundled DB if present)
if (process.env.VERCEL) {
  try {
    if (!fs.existsSync(sqlitePath)) {
      const bundled = path.join(process.cwd(), "installer_scheduler.db");
      if (fs.existsSync(bundled)) {
        fs.copyFileSync(bundled, sqlitePath);
      } else {
        fs.writeFileSync(sqlitePath, "");
      }
    }
  } catch (err) {
    console.error("Failed to prepare sqlite file", err);
  }
}

const sqlite: Database.Database = new Database(sqlitePath);

ensureSchema(sqlite);

export const db = drizzle(sqlite, { schema });
