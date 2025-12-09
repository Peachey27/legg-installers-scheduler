import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

const sqlitePath = process.env.DATABASE_FILENAME ?? "installer_scheduler.db";

const sqlite = new Database(sqlitePath);

// Ensure tables exist if migrations haven't run.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY NOT NULL,
    client_name TEXT NOT NULL,
    client_address TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    billing_address TEXT,
    job_address TEXT NOT NULL,
    date_taken TEXT NOT NULL,
    total_price REAL,
    description TEXT NOT NULL,
    invoice_number TEXT,
    estimate_number TEXT,
    cash_sale_number TEXT,
    measurements TEXT,
    glass_or_product_details TEXT,
    quoted_range TEXT,
    internal_notes TEXT,
    assigned_date TEXT,
    estimated_duration_hours REAL,
    crew TEXT,
    area_tag TEXT NOT NULL DEFAULT 'Other',
    status TEXT NOT NULL DEFAULT 'backlog',
    factory_job_id TEXT,
    photo1_url TEXT,
    photo2_url TEXT,
    photo3_url TEXT,
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS day_settings (
    date TEXT PRIMARY KEY,
    area_label TEXT
  );
`);

export const db = drizzle(sqlite, { schema });
