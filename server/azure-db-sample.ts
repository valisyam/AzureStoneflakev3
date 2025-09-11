/**
 * Azure Database for PostgreSQL Connection Sample
 * 
 * This file demonstrates the proper way to connect to Azure Database for PostgreSQL
 * using the standard PostgreSQL driver (pg) with SSL configuration.
 * 
 * Use this as a reference for implementing database connections in your application.
 */

import { Pool, Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

// Example Azure Database for PostgreSQL connection string
// Format: postgresql://username%40servername:password@servername.postgres.database.azure.com:5432/databasename?sslmode=require
const AZURE_DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://myuser%40myserver:mypassword@myserver.postgres.database.azure.com:5432/mydatabase?sslmode=require';

/**
 * Create a connection pool for Azure PostgreSQL
 * This is the recommended approach for production applications
 */
export function createAzurePool(): Pool {
  const databaseUrl = new URL(AZURE_DATABASE_URL);
  const sslMode = databaseUrl.searchParams.get('sslmode');
  const requiresSSL = sslMode === 'require' || databaseUrl.hostname.includes('azure.com');

  return new Pool({
    connectionString: AZURE_DATABASE_URL,
    max: 10, // Maximum number of connections in the pool
    min: 2,  // Minimum number of connections in the pool
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    connectionTimeoutMillis: 10000, // Timeout after 10 seconds if connection cannot be established
    
    // SSL configuration for Azure Database for PostgreSQL
    ssl: requiresSSL ? {
      rejectUnauthorized: false, // Azure uses self-signed certificates
      // Optionally specify CA certificate if you have it:
      // ca: fs.readFileSync('path/to/azure-postgresql-ca-cert.pem').toString(),
    } : false,
  });
}

/**
 * Create a single client connection for Azure PostgreSQL
 * Use this for one-off operations or testing
 */
export function createAzureClient(): Client {
  const databaseUrl = new URL(AZURE_DATABASE_URL);
  const sslMode = databaseUrl.searchParams.get('sslmode');
  const requiresSSL = sslMode === 'require' || databaseUrl.hostname.includes('azure.com');

  return new Client({
    connectionString: AZURE_DATABASE_URL,
    connectionTimeoutMillis: 10000,
    
    // SSL configuration for Azure Database for PostgreSQL
    ssl: requiresSSL ? {
      rejectUnauthorized: false, // Azure uses self-signed certificates
    } : false,
  });
}

/**
 * Create Drizzle ORM instance with Azure PostgreSQL pool
 */
export function createDrizzleWithAzure(schema: any) {
  const pool = createAzurePool();
  return drizzle(pool, { schema });
}

/**
 * Test connection to Azure Database for PostgreSQL
 */
export async function testAzureConnection(): Promise<boolean> {
  const client = createAzureClient();
  
  try {
    await client.connect();
    const result = await client.query('SELECT 1 as test');
    console.log('Azure PostgreSQL connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Azure PostgreSQL connection failed:', error);
    return false;
  } finally {
    await client.end();
  }
}

/**
 * Example usage with error handling
 */
export async function exampleUsage() {
  const pool = createAzurePool();
  
  try {
    // Test the connection
    const client = await pool.connect();
    
    try {
      // Execute a simple query
      const result = await client.query('SELECT NOW() as current_time');
      console.log('Current time from Azure PostgreSQL:', result.rows[0].current_time);
      
      // Example of a more complex query with parameters
      const userQuery = await client.query(
        'SELECT * FROM users WHERE email = $1 LIMIT 1',
        ['example@email.com']
      );
      console.log('User query result:', userQuery.rows);
      
    } finally {
      // Always release the client back to the pool
      client.release();
    }
  } catch (error) {
    console.error('Database operation failed:', error);
    
    // Handle specific Azure PostgreSQL errors
    if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused - check your firewall settings');
    } else if (error.code === 'ENOTFOUND') {
      console.error('Host not found - check your server name');
    } else if (error.code === '28P01') {
      console.error('Authentication failed - check your username and password');
    } else if (error.code === '28000') {
      console.error('Invalid authorization - check your username format (should include @servername)');
    }
  } finally {
    // Clean up the pool when done
    await pool.end();
  }
}

/**
 * Environment variable format examples for Azure Database for PostgreSQL
 */
export const AZURE_CONNECTION_EXAMPLES = {
  // Standard format with SSL required
  standard: 'postgresql://username%40servername:password@servername.postgres.database.azure.com:5432/databasename?sslmode=require',
  
  // With additional parameters
  withParams: 'postgresql://username%40servername:password@servername.postgres.database.azure.com:5432/databasename?sslmode=require&connect_timeout=10&application_name=StoneflakeApp',
  
  // Using environment variables (recommended for production)
  withEnvVars: 'postgresql://${DB_USER}%40${DB_SERVER}:${DB_PASSWORD}@${DB_SERVER}.postgres.database.azure.com:5432/${DB_NAME}?sslmode=require'
};

/**
 * Common Azure PostgreSQL connection errors and solutions
 */
export const AZURE_CONNECTION_TROUBLESHOOTING = {
  'ECONNREFUSED': 'Check Azure firewall rules and ensure your IP/App Service is allowed',
  'ENOTFOUND': 'Verify the server name in your connection string',
  '28P01': 'Authentication failed - check username (must include @servername) and password',
  '28000': 'Invalid authorization specification - verify username format',
  'ETIMEDOUT': 'Connection timeout - check network connectivity and firewall settings',
  'SSL_ERROR': 'SSL connection failed - ensure sslmode=require and rejectUnauthorized=false'
};

// Export for use in tests or debugging
export { Pool, Client };