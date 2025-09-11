import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Parse DATABASE_URL to detect SSL requirements
const databaseUrl = new URL(process.env.DATABASE_URL);
const sslMode = databaseUrl.searchParams.get('sslmode');
const requiresSSL = sslMode === 'require' || databaseUrl.hostname.includes('azure.com');

// Create pool with proper connection settings for Azure PostgreSQL
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5, // Reduce connection pool size for stability
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: requiresSSL ? {
    rejectUnauthorized: false // Azure Database for PostgreSQL requires SSL but uses self-signed certificates
  } : false,
});

export const db = drizzle(pool, { schema });