// src/db/client.ts
//
// Drizzle DB client using Neon (serverless Postgres) with a wrapper
// that supports both tagged-template and function-style calls.

import "server-only";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL env var is not set");
}

// Base Neon HTTP client (tagged-template compatible)
const neonSql = neon(databaseUrl);

// Hybrid client: lets Drizzle call us EITHER as a tagged template
//   db`SELECT ${value}`
// OR as a normal function
//   db("SELECT $1", [value])
const client = ((
  textOrStrings: any,
  params?: any,
  options?: any
) => {
  // Tagged-template call: first arg is a TemplateStringsArray
  if (
    Array.isArray(textOrStrings) &&
    Object.prototype.hasOwnProperty.call(textOrStrings, "raw")
  ) {
    // Forward directly to the Neon tagged-template function
    return (neonSql as any)(textOrStrings, params, options);
  }

  // Function-style call: use .query when available; otherwise invoke the client directly.
  // e.g. client("SELECT $1", [value], options)
  const neonQuery = (neonSql as any).query ?? (neonSql as any);
  return neonQuery(textOrStrings, params, options);
}) as any;

// Expose .query explicitly as well, for any code that expects it
const directQuery = (neonSql as any).query ?? (neonSql as any);
client.query = (...args: any[]) => directQuery(...args);

// Drizzle DB instance
export const db = drizzle(client, { schema });
