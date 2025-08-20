import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create pool with SSL required for Azure PostgreSQL
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Azure requires SSL; if your connection string doesn't already include sslmode=require,
  // keep this enabled to avoid handshake issues.
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
});

export const db = drizzle({ client: pool, schema });