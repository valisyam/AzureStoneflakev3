# Stoneflake Manufacturing Portal - Azure Deployment Guide

**🚨 UPDATED FOR CURRENT VERSION** - This guide has been updated to reflect the latest codebase with all recent enhancements including supplier portal field parity and file download functionality.

This guide provides step-by-step instructions for deploying the Stoneflake Manufacturing Portal on Microsoft Azure cloud platform.

## Prerequisites

Before starting the deployment, ensure you have:

1. **Azure Account**: Active Azure subscription with billing enabled
2. **Azure CLI**: Installed and authenticated on your local machine
3. **Node.js**: Version 18 or higher
4. **PostgreSQL**: Basic understanding of database management
5. **SendGrid Account**: For email functionality (REQUIRED for production)

## Important: Schema Updates

⚠️ **Critical**: This export package contains the most recent schema including:
- Special Instructions field in RFQs table
- Enhanced supplier assessment fields
- Complete company management system
- Message threading and file attachment systems

**DO NOT** use any older schema files. Always use `database/schema.sql` from this export package.

## Deployment Architecture

The application will be deployed using:
- **Azure App Service**: For hosting the Node.js/Express application
- **Azure Database for PostgreSQL**: Managed PostgreSQL database
- **Azure Blob Storage**: For file storage (recommended for production)
- **Azure Application Insights**: For monitoring and logging

## Step 1: Prepare Azure Resources

### 1.1 Create Resource Group

```bash
az group create --name stoneflake-rg --location "East US"
```

### 1.2 Create PostgreSQL Database

```bash
az postgres flexible-server create \
  --resource-group stoneflake-rg \
  --name stoneflake-db-server \
  --location "East US" \
  --admin-user stoneflakeadmin \
  --admin-password "YourSecurePassword123!" \
  --sku-name Standard_B2s \
  --version 14 \
  --storage-size 32
```

### 1.3 Configure Database Firewall

```bash
# Allow Azure services
az postgres flexible-server firewall-rule create \
  --resource-group stoneflake-rg \
  --name stoneflake-db-server \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Allow your IP for management (replace with your IP)
az postgres flexible-server firewall-rule create \
  --resource-group stoneflake-rg \
  --name stoneflake-db-server \
  --rule-name AllowMyIP \
  --start-ip-address YOUR_IP_ADDRESS \
  --end-ip-address YOUR_IP_ADDRESS
```

### 1.4 Create Database

```bash
az postgres flexible-server db create \
  --resource-group stoneflake-rg \
  --server-name stoneflake-db-server \
  --database-name stoneflake
```

## Step 2: Database Setup

### 2.1 Connect to Database

Use your preferred PostgreSQL client:

```bash
psql "host=stoneflake-db-server.postgres.database.azure.com port=5432 dbname=stoneflake user=stoneflakeadmin password=YourSecurePassword123! sslmode=require"
```

### 2.2 Run Schema Creation

**IMPORTANT**: Use the updated schema file:

```bash
\i database/schema.sql
```

### 2.3 Import Production Data

If migrating existing data:

```bash
\i database/updated-production-data.sql
```

## Step 3: Application Deployment

### 3.1 Create App Service Plan

```bash
az appservice plan create \
  --name stoneflake-plan \
  --resource-group stoneflake-rg \
  --sku B2 \
  --is-linux
```

### 3.2 Create Web App

```bash
az webapp create \
  --resource-group stoneflake-rg \
  --plan stoneflake-plan \
  --name stoneflake-portal \
  --runtime "NODE|18-lts"
```

### 3.3 Configure Environment Variables

```bash
# Database connection (update with your actual server details)
az webapp config appsettings set \
  --resource-group stoneflake-rg \
  --name stoneflake-portal \
  --settings DATABASE_URL="postgresql://stoneflakeadmin:YourSecurePassword123!@stoneflake-db-server.postgres.database.azure.com:5432/stoneflake?sslmode=require"

# JWT Secret (generate a secure random string)
az webapp config appsettings set \
  --resource-group stoneflake-rg \
  --name stoneflake-portal \
  --settings JWT_SECRET="your-super-secure-jwt-secret-key-here"

# SendGrid (REQUIRED for production)
az webapp config appsettings set \
  --resource-group stoneflake-rg \
  --name stoneflake-portal \
  --settings SENDGRID_API_KEY="your-sendgrid-api-key"

# Environment
az webapp config appsettings set \
  --resource-group stoneflake-rg \
  --name stoneflake-portal \
  --settings NODE_ENV="production"

# Additional PostgreSQL connection details
az webapp config appsettings set \
  --resource-group stoneflake-rg \
  --name stoneflake-portal \
  --settings PGHOST="stoneflake-db-server.postgres.database.azure.com" \
  --settings PGPORT="5432" \
  --settings PGUSER="stoneflakeadmin" \
  --settings PGPASSWORD="YourSecurePassword123!" \
  --settings PGDATABASE="stoneflake"
```

### 3.4 Deploy Application Code

#### Option A: ZIP Deployment (Recommended)

```bash
# Create deployment package
cd codebase
zip -r ../stoneflake-portal.zip .

# Deploy to Azure
az webapp deploy \
  --resource-group stoneflake-rg \
  --name stoneflake-portal \
  --src-path ../stoneflake-portal.zip \
  --type zip
```

### 3.5 Run Database Migration

After deployment, run Drizzle migration:

```bash
# Connect to App Service and run migration
az webapp ssh \
  --resource-group stoneflake-rg \
  --name stoneflake-portal

# Inside the container:
npm run db:push
```

## Step 4: Post-Deployment Configuration

### 4.1 Enable Application Logs

```bash
az webapp log config \
  --resource-group stoneflake-rg \
  --name stoneflake-portal \
  --application-logging filesystem \
  --level information
```

### 4.2 Configure Startup Command

```bash
az webapp config set \
  --resource-group stoneflake-rg \
  --name stoneflake-portal \
  --startup-file "npm run start"
```

## Step 5: Verification and Testing

### 5.1 Application Health Check

```bash
# Check application status
az webapp show \
  --resource-group stoneflake-rg \
  --name stoneflake-portal \
  --query state

# View application logs
az webapp log tail \
  --resource-group stoneflake-rg \
  --name stoneflake-portal
```

### 5.2 Database Connection Test

Verify schema and data:

```sql
-- Check if all tables exist (should see all tables including new ones)
\dt

-- Verify critical tables have correct schema
\d rfqs  -- Should include special_instructions column
\d users -- Should include company_id and company_name_input columns

-- Verify data integrity
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM companies;
SELECT COUNT(*) FROM rfqs;
```

### 5.3 Functional Testing

Test all critical features:

1. **User Registration & Authentication**: Create account and verify email
2. **Company Data Sharing**: Users from same company see shared data
3. **RFQ Creation**: All fields including Special Instructions
4. **File Upload/Download**: Especially supplier file download with authentication
5. **Supplier Portal**: Field parity with admin quote creation
6. **Admin Functions**: Quote creation, supplier management
7. **Email Notifications**: SendGrid integration for quotes and orders

## Key Features to Test

### Supplier Portal Field Parity
- ✅ Special Instructions field visible in supplier RFQ details
- ✅ All quote creation fields match admin interface
- ✅ File download works with proper authentication

### File Download Authentication
- ✅ Suppliers can download RFQ files
- ✅ Authentication tokens work correctly
- ✅ Error handling provides user feedback

### Company Data Sharing
- ✅ Users from same company see identical data
- ✅ RFQs, orders, and quotes shared across company users

## Troubleshooting

### Schema Migration Issues

If you encounter schema conflicts:

1. **Check current schema**: Ensure you're using the latest `schema.sql`
2. **Manual column addition**: If missing columns, add them manually:
   ```sql
   ALTER TABLE rfqs ADD COLUMN special_instructions TEXT;
   ```
3. **Use force push**: If safe to do so: `npm run db:push --force`

### File Download Issues

If suppliers can't download files:

1. **Check token storage**: Verify `'stoneflake_token'` key in localStorage
2. **Authentication headers**: Ensure Bearer token is included
3. **CORS settings**: Configure proper CORS for file endpoints

### Common Issues

1. **Database Connection**
   - Verify connection string includes SSL mode
   - Check firewall allows App Service IPs
   - Ensure PostgreSQL version compatibility

2. **Missing Environment Variables**
   - All required secrets properly set
   - JWT_SECRET is sufficiently complex
   - SendGrid API key is valid

3. **Schema Mismatches**
   - Always use the updated schema from this export package
   - Never mix old and new schema files

## Security Considerations

1. **Database Security**
   - Use Azure PostgreSQL firewall rules
   - Enable SSL connections (required)
   - Regular security updates

2. **Application Security**
   - Environment variables for all secrets
   - JWT tokens with proper expiration
   - File upload validation and limits

3. **API Security**
   - Rate limiting on authentication endpoints
   - Proper CORS configuration
   - Input validation on all endpoints

## Performance Optimization

1. **Database Performance**
   - Connection pooling (already configured)
   - Proper indexing (included in schema)
   - Query optimization for company data sharing

2. **File Storage**
   - Consider Azure Blob Storage for large files
   - Implement CDN for static assets
   - Proper file size limits

## Post-Launch Checklist

- [ ] All environment variables configured
- [ ] Database schema matches current version
- [ ] SendGrid email notifications working
- [ ] File upload/download functionality tested
- [ ] Supplier portal field parity verified
- [ ] Company data sharing working
- [ ] SSL certificate properly configured
- [ ] Monitoring and alerts set up
- [ ] Backup strategy implemented

## Next Steps

1. **Custom Domain**: Configure your domain and SSL
2. **CI/CD Pipeline**: Set up automated deployments
3. **Monitoring**: Configure Application Insights
4. **Scaling**: Plan for user growth
5. **Backup Strategy**: Implement automated backups

This deployment package contains the most current version of the Stoneflake Manufacturing Portal with all recent enhancements and bug fixes. Follow this guide exactly for a successful Azure deployment.