# AzureStoneflakev3

A stone fabrication management platform built with React, Express, and PostgreSQL.

## File Storage Configuration

### Azure Blob Storage

The application uses Azure Blob Storage for file uploads instead of local disk storage. This provides better scalability and reliability for production deployments.

#### Required Environment Variables

```bash
# Azure Storage Connection String (Required)
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=yourstorageaccount;AccountKey=youraccountkey;EndpointSuffix=core.windows.net

# Azure Blob Container Name (Optional - defaults to 'app-files')
AZURE_BLOB_CONTAINER=app-files
```

#### Getting Azure Storage Connection String

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your Storage Account
3. Go to **Security + networking** > **Access keys**
4. Copy the **Connection string** from key1 or key2

#### File Organization

Files are organized in Azure Blob Storage using a folder-like structure:

- **Supplier Invoices**: `invoices/{purchaseOrderId}/{filename}`
- **Quality Check Files**: `qc/{orderId}/{filename}`
- **RFQ Files**: `rfqs/{rfqId}/{filename}`
- **Quote Files**: `quotes/{rfqId}/{filename}`
- **General Files**: `files/{linkedId}/{filename}`

#### File Access

- **Upload**: Files are uploaded directly to Azure Blob Storage using memory storage (no temporary files on disk)
- **Download**: Files are streamed directly from Azure Blob Storage via `/uploads/{filename}` URLs
- **Database**: File URLs are stored in the database with `/uploads/` prefix for frontend compatibility

#### Migration from Local Storage

See `AZURE_BLOB_MIGRATION.md` for detailed migration information and testing procedures.

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

## Support

For Azure-specific database connectivity issues, refer to the [Azure Database for PostgreSQL documentation](https://docs.microsoft.com/en-us/azure/postgresql/).