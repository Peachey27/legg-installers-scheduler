// Ensure required tables exist; safe to call multiple times.
export function ensureSchema(db: any) {
  const hasJobsTable = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='jobs'")
    .get();

  if (hasJobsTable) return;

  db.exec(`
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
}

export default ensureSchema;
