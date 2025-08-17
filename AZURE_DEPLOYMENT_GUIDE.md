# Stoneflake Manufacturing Portal - Azure Deployment Guide

## Overview
This package contains the complete Stoneflake Manufacturing Portal codebase and database for deployment to Microsoft Azure.

## Contents
- `codebase/` - Complete application source code
- `database/` - Database schema and production data
- This deployment guide

## Azure Services Required

### 1. Azure Database for PostgreSQL
- Create a PostgreSQL Flexible Server instance
- Recommended: General Purpose, 2 vCores, 8GB RAM
- Enable SSL connections
- Import schema: `database/schema.sql`
- Import data: `database/production-data.sql`

### 2. Azure App Service
- Create a new App Service (Node.js 20 LTS)
- Enable Application Insights for monitoring
- Configure auto-scaling if needed

### 3. Azure Storage Account (Optional)
- For file uploads and static assets
- Configure blob storage containers

## Environment Variables
Set these in Azure App Service Configuration:

```
NODE_ENV=production
DATABASE_URL=postgresql://username:password@server.postgres.database.azure.com:5432/database?ssl=true
JWT_SECRET=your-jwt-secret-key
SENDGRID_API_KEY=your-sendgrid-key
PORT=8080
```

## Deployment Steps

### Step 1: Database Setup
1. Create Azure PostgreSQL Flexible Server
2. Create database: `stoneflake_manufacturing`
3. Run schema creation: `psql -f database/schema.sql`
4. Import production data: `psql -f database/production-data.sql`
5. Update connection string in environment variables

### Step 2: Code Deployment
1. Upload codebase to Azure App Service
2. Configure build command: `npm install && npm run build`
3. Configure start command: `npm run start`
4. Set environment variables
5. Enable continuous deployment (optional)

### Step 3: DNS and Domain
1. Configure custom domain in Azure App Service
2. Enable SSL certificate
3. Update CORS settings if needed

### Step 4: Testing
1. Verify database connectivity
2. Test user authentication
3. Verify file upload functionality
4. Test all major workflows:
   - Customer RFQ submission
   - Supplier quote submission
   - Admin order management
   - Purchase order workflows

## Database Migration Notes

### Current Production Data
- Users: Customer and supplier accounts
- Purchase Orders: PO-0001 (archived), PO-0002 (archived), PO-0003 (pending)
- All archive filtering functionality is working
- Email verification system active

### Security Considerations
- All passwords are bcrypt hashed
- JWT tokens for authentication
- SSL required for database connections
- File upload restrictions in place

## Post-Deployment Configuration

### 1. Admin Account Setup
- Verify admin user: vineeth@stone-flake.com
- Test admin portal access
- Verify all admin functions

### 2. Email Service
- Configure SendGrid API key
- Test email verification flow
- Verify notification emails

### 3. File Storage
- Configure upload directories
- Test file upload/download
- Verify file security

## Monitoring and Maintenance

### Azure Application Insights
- Monitor performance metrics
- Track user behavior
- Set up alerts for errors

### Database Maintenance
- Regular backups scheduled
- Monitor query performance
- Update statistics regularly

### Security Updates
- Regular dependency updates
- Monitor security advisories
- SSL certificate renewal

## Support and Documentation

### Application Features
- Customer portal for RFQ submission and order tracking
- Supplier portal for quote management and order fulfillment
- Admin portal for comprehensive system management
- Real-time messaging system
- File upload and document management
- Purchase order Accept/Reject workflow
- Archive functionality for completed orders

### Technical Stack
- Frontend: React 18 + TypeScript + TailwindCSS
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL with Drizzle ORM
- Authentication: JWT + bcrypt
- Email: SendGrid integration

### Contact
For technical support during migration, refer to the development team.

## Backup and Recovery

### Database Backups
- Configure automated daily backups
- Test restore procedures
- Document recovery processes

### Application Backups
- Source code in version control
- Configuration backup
- File storage backup strategy

## Performance Optimization

### Database
- Connection pooling configured
- Indexes optimized for common queries
- Query performance monitoring

### Application
- Static asset caching
- API response optimization
- Client-side code splitting

---

This deployment package includes all necessary components for a complete Azure migration of the Stoneflake Manufacturing Portal.