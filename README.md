# AzureStoneflakev3

A stone fabrication management platform built with React, Express, and PostgreSQL.

## Azure PostgreSQL Setup

This application has been configured to work with Azure Database for PostgreSQL using the standard `pg` driver for reliable connectivity.

### Database Connection Configuration

#### Environment Variable Format
Set your `DATABASE_URL` environment variable using this format:
```
DATABASE_URL=postgresql://username%40servername:password@servername.postgres.database.azure.com:5432/databasename?sslmode=require
```

**Important Notes:**
- **URL Encoding**: The `@` symbol in the username must be URL-encoded as `%40` (e.g., `myuser%40myserver` instead of `myuser@myserver`)
- **SSL Mode**: Use `sslmode=require` for Azure Database for PostgreSQL
- **Port**: Standard PostgreSQL port `5432`

#### Example Connection String
```
DATABASE_URL=postgresql://stoneflake%40myserver:MySecurePassword123@myserver.postgres.database.azure.com:5432/stoneflakedb?sslmode=require
```

### Azure Database for PostgreSQL Requirements

1. **Firewall Configuration**: 
   - Add your application's IP address(es) to the Azure PostgreSQL firewall rules
   - For Azure App Service, enable "Allow access to Azure services"

2. **VNet Configuration** (if using VNet):
   - Ensure proper VNet integration between your app and database
   - Configure subnet delegation if required

3. **TLS/SSL**:
   - Azure Database for PostgreSQL requires SSL connections
   - The application automatically detects Azure hostnames and enables SSL
   - Uses `rejectUnauthorized: false` for compatibility with Azure's certificate setup

### Migration from Neon Database

If migrating from a Neon database:

1. ✅ **Dependencies Updated**: 
   - Removed `@neondatabase/serverless` 
   - Added `pg` driver
   - Updated Drizzle adapter to `node-postgres`

2. ✅ **Configuration Changes**:
   - Removed `neonConfig` settings
   - Updated connection pooling for standard PostgreSQL
   - Added Azure-specific SSL detection

3. ✅ **Connection Pooling**:
   - Max connections: 10
   - Idle timeout: 30 seconds  
   - Connection timeout: 10 seconds

### Health Check Endpoint

The application includes a health check endpoint for monitoring database connectivity:

```
GET /api/healthz
```

**Success Response (200):**
```json
{
  "status": "ok",
  "database": "connected", 
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Error Response (500):**
```json
{
  "status": "error",
  "database": "disconnected",
  "error": "connection timeout",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Troubleshooting

#### Connection Timeouts
- Verify firewall rules allow your application's IP
- Check that `sslmode=require` is set in connection string
- Ensure username includes the `%40servername` encoding

#### Authentication Failures  
- Verify username format: `username%40servername`
- Check password doesn't contain special characters requiring URL encoding
- Confirm user has proper permissions on the target database

#### SSL/TLS Issues
- Ensure `sslmode=require` is in the connection string
- Verify Azure Database for PostgreSQL has SSL enabled
- Check that your hosting platform supports outbound SSL connections

### Local Development

For local development with a local PostgreSQL instance:
```
DATABASE_URL=postgresql://user:password@localhost:5432/dbname?sslmode=disable
```

Note: Use `sslmode=disable` for local development only.

## Installation & Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server  
npm start

# Type checking
npm run check

# Database migrations
npm run db:push
```

## Health Monitoring

Monitor your application health using the `/api/healthz` endpoint. This can be integrated with:
- Azure Application Insights
- Azure Load Balancer health probes  
- External monitoring services
- Docker health checks

## Azure Blob Storage Configuration

This application uses Azure Blob Storage for file uploads and storage. Configure the following environment variables in your Azure App Service Application Settings:

### Required Environment Variables

- `AZURE_STORAGE_CONNECTION_STRING`: Your Azure Storage Account connection string
- `AZURE_BLOB_CONTAINER`: The name of the blob container to store files

### Setting Up in Azure App Service

1. Navigate to your App Service in the Azure Portal
2. Go to **Configuration** → **Application settings**
3. Add the following environment variables:

```
AZURE_STORAGE_CONNECTION_STRING = DefaultEndpointsProtocol=https;AccountName=<your-account>;AccountKey=<your-key>;EndpointSuffix=core.windows.net
AZURE_BLOB_CONTAINER = <your-container-name>
```

### Local Development

For local development, you can set these environment variables in your shell:

```bash
export AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;..."
export AZURE_BLOB_CONTAINER="your-container-name"
```

**Note**: Do NOT use `.env` files or commit secrets to source code. The application is designed to read environment variables at runtime only.

### Blob Container Setup

Ensure your blob container exists and has the appropriate access permissions:
- Container access level: Private (default)
- The application uses the connection string for authenticated access

## Support

For Azure-specific database connectivity issues, refer to the [Azure Database for PostgreSQL documentation](https://docs.microsoft.com/en-us/azure/postgresql/).