# Azure Stoneflake v3

A full-stack application built with React, Node.js, Express, and PostgreSQL, optimized for deployment on Azure App Service with Azure Database for PostgreSQL.

## Database Configuration

### Azure Database for PostgreSQL Setup

This application uses the standard PostgreSQL driver (`pg`) for compatibility with Azure Database for PostgreSQL. The previous Neon serverless driver has been replaced to ensure proper connectivity with Azure's managed PostgreSQL service.

#### Environment Variables

Set the following environment variable in your Azure App Service Configuration:

```
DATABASE_URL=postgresql://username%40servername:password@servername.postgres.database.azure.com:5432/databasename?sslmode=require
```

**Important Notes:**
- Replace `username%40servername` with your actual username followed by `%40` (URL-encoded `@`) and your server name
- Replace `password` with your actual database password (URL-encode special characters)
- Replace `servername` with your Azure PostgreSQL server name
- Replace `databasename` with your target database name
- The `sslmode=require` parameter is essential for Azure Database for PostgreSQL

#### SSL Configuration

The application automatically detects Azure PostgreSQL connections and configures SSL appropriately:
- SSL is enabled automatically for Azure PostgreSQL hostnames (`*.postgres.database.azure.com`)
- SSL is enabled when `sslmode=require` is present in the DATABASE_URL
- Uses `rejectUnauthorized: false` for Azure's self-signed certificates

### Migration from Neon to PostgreSQL

If you're migrating from a previous version that used Neon serverless:

#### Migration Checklist

- [x] Remove `@neondatabase/serverless` dependency
- [x] Install `pg` and `@types/pg` dependencies
- [x] Update database connection configuration in `server/db.ts`
- [x] Switch Drizzle ORM adapter from `drizzle-orm/neon-serverless` to `drizzle-orm/node-postgres`
- [x] Remove all `neonConfig` overrides
- [x] Add SSL configuration for Azure Database for PostgreSQL
- [ ] Update DATABASE_URL environment variable format
- [ ] Test database connectivity with Azure PostgreSQL
- [ ] Run `npm run db:push` to ensure schema compatibility

#### Key Changes Made

1. **Driver Replacement**: Replaced Neon serverless driver with standard PostgreSQL driver (`pg`)
2. **Drizzle Adapter**: Updated from `drizzle-orm/neon-serverless` to `drizzle-orm/node-postgres`
3. **SSL Configuration**: Added automatic SSL detection and configuration for Azure
4. **Connection Parameters**: Removed Neon-specific configurations that caused timeouts
5. **Error Handling**: Improved connection timeout and SSL error handling

### Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your database connection:
   ```bash
   export DATABASE_URL="postgresql://username:password@localhost:5432/dbname"
   ```

3. Push database schema:
   ```bash
   npm run db:push
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

### Production Deployment

#### Azure App Service Deployment

1. Configure the DATABASE_URL in Azure App Service App Settings
2. Ensure your Azure Database for PostgreSQL allows connections from your App Service
3. Deploy using your preferred method (GitHub Actions, Azure CLI, etc.)

#### Database Schema Deployment

Run the following command to push your schema to Azure PostgreSQL:

```bash
npm run db:push
```

### Troubleshooting

#### Connection Timeout Errors

If you encounter connection timeout errors:
- Verify your DATABASE_URL format includes the correct Azure PostgreSQL hostname
- Ensure `sslmode=require` is included in the connection string
- Check that your Azure Database for PostgreSQL firewall allows connections from your App Service
- Verify the username format includes `@servername` (URL-encoded as `%40servername`)

#### SSL Certificate Errors

The application is configured to work with Azure's self-signed SSL certificates. If you encounter SSL errors:
- Ensure `sslmode=require` is in your DATABASE_URL
- Verify the hostname matches the pattern `*.postgres.database.azure.com`

#### Infrastructure vs Application Errors

- **Database connection errors** (timeouts, SSL issues, authentication failures) should return HTTP 500, not 400
- **Application validation errors** (missing fields, invalid data) should return HTTP 400
- Review error handling in your route handlers to ensure proper HTTP status codes

## Architecture

- **Frontend**: React with TypeScript, Vite build system
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Drizzle ORM
- **Deployment**: Azure App Service + Azure Database for PostgreSQL

## Dependencies

### Core Database Dependencies
- `pg`: Standard PostgreSQL driver for Node.js
- `@types/pg`: TypeScript definitions for pg
- `drizzle-orm`: Type-safe ORM with PostgreSQL support
- `drizzle-kit`: Database toolkit for schema management

### Removed Dependencies
- `@neondatabase/serverless`: Replaced with standard PostgreSQL driver