import { pgTable, text, real, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const jobs = pgTable("jobs", {
  id: text("id").primaryKey().notNull(),

  clientName: text("client_name").notNull(),
  clientAddress: text("client_address").notNull(),
  clientAddressLat: real("client_address_lat"),
  clientAddressLng: real("client_address_lng"),
  clientPhone: text("client_phone").notNull(),
  billingAddress: text("billing_address"),
  jobAddress: text("job_address").notNull(),

  dateTaken: text("date_taken").notNull(),
  totalPrice: real("total_price"),

  description: text("description").notNull(),
  invoiceNumber: text("invoice_number"),
  estimateNumber: text("estimate_number"),
  cashSaleNumber: text("cash_sale_number"),

  measurements: text("measurements"),
  glassOrProductDetails: text("glass_or_product_details"),
  quotedRange: text("quoted_range"),
  internalNotes: text("internal_notes"),
  materialProductUpdates: jsonb("material_product_updates")
    .$type<
      Array<{
        id: string;
        label: string;
        date: string;
      }>
    >()
    .notNull()
    .default(sql`'[]'::jsonb`),

  assignedDate: text("assigned_date"),
  estimatedDurationHours: real("estimated_duration_hours"),
  crew: text("crew"),
  areaTag: text("area_tag").notNull().default("Other"),

  status: text("status").notNull().default("backlog"),
  factoryJobId: text("factory_job_id"),

  photo1Url: text("photo1_url"),
  photo2Url: text("photo2_url"),
  photo3Url: text("photo3_url"),

  deletedAt: text("deleted_at")
});

export const daySettings = pgTable("day_settings", {
  date: text("date").primaryKey(),
  areaLabel: text("area_label")
});
