import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import * as schema from "./schema";
import { ensureSchema } from "./ensureSchema";

const isVercel = !!process.env.VERCEL;
const configuredPath = process.env.DATABASE_FILENAME ?? "installer_scheduler.db";
const tmpPath = "/tmp/installer_scheduler.db";
const targetPath = isVercel && !configuredPath.startsWith("/tmp/")
  ? tmpPath
  : configuredPath;

function preparePath(targetPath: string) {
  if (!isVercel) return targetPath;

  try {
    // Ensure a writable file exists in /tmp; copy bundled DB if present.
    if (!fs.existsSync(targetPath)) {
      const bundled = path.join(process.cwd(), "installer_scheduler.db");
      if (fs.existsSync(bundled)) {
        fs.copyFileSync(bundled, targetPath);
      } else {
        fs.writeFileSync(targetPath, "");
      }
    }
  } catch (err) {
    console.error("Failed to prepare sqlite file", err);
  }
  return targetPath;
}

function openDatabase(targetPath: string) {
  const preparedPath = preparePath(targetPath);
  const sqlite = new Database(preparedPath);
  ensureSchema(sqlite);
  return { sqlite, activePath: preparedPath };
}

let sqlite: Database.Database;
let activePath = targetPath;

try {
  const opened = openDatabase(targetPath);
  sqlite = opened.sqlite;
  activePath = opened.activePath;
} catch (err: any) {
  console.error("Failed to open sqlite at target path, attempting /tmp fallback", err);
  if (targetPath !== tmpPath) {
    const fallback = openDatabase(tmpPath);
    sqlite = fallback.sqlite;
    activePath = fallback.activePath;
    console.warn("Using SQLite fallback path", activePath);
  } else {
    throw err;
  }
}

export const db = drizzle(sqlite, { schema });
