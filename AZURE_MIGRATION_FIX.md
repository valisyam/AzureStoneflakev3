# Azure Migration Schema Fix

## Problem
The export package contains an outdated database schema that doesn't match your current development environment. This is causing Drizzle to want to delete existing columns and create new ones, which will cause data loss.

## Root Cause
The export package was created before several key enhancements:
1. **Missing `special_instructions` field** in RFQs table (added recently for field parity)
2. **Old company structure** - export package uses old `company` column instead of new `company_id` and `company_name_input` fields
3. **Missing enhanced supplier fields** that were added for supplier assessments

## Solution Options

### Option 1: Use Updated Schema (RECOMMENDED)
Replace the old schema.sql with the updated one I created:

1. **Backup your current Azure database** (if you have data)
2. **Use the new schema file**: `export-package/database/updated-schema.sql` 
3. **Run drizzle push** with the updated schema

### Option 2: Manual Migration Steps
If you want to keep your existing Azure database and migrate it:

1. **Add missing columns manually:**
```sql
-- Add special_instructions to RFQs table
ALTER TABLE rfqs ADD COLUMN special_instructions TEXT;

-- Update users table structure (if using old company column)
ALTER TABLE users ADD COLUMN company_id VARCHAR REFERENCES companies(id);
ALTER TABLE users ADD COLUMN company_name_input VARCHAR;
-- Then migrate data from old 'company' column to 'company_name_input'
-- Finally drop the old 'company' column: ALTER TABLE users DROP COLUMN company;
```

2. **Update your drizzle.config.ts** to point to your Azure database
3. **Run drizzle push** - it should now see the schema as matching

## Critical Files to Update

### 1. Export Package Schema
✅ **FIXED**: `export-package/codebase/shared/schema.ts` - Added missing specialInstructions field
✅ **CREATED**: `export-package/database/updated-schema.sql` - Complete current schema

### 2. Environment Variables for Azure
Make sure your Azure deployment has these environment variables:
- `DATABASE_URL` - Your Azure PostgreSQL connection string
- `JWT_SECRET` - For authentication
- `SENDGRID_API_KEY` - For email notifications

### 3. Package Dependencies
The export package should include all current dependencies from your working environment.

## Recommended Migration Steps

1. **Stop any running Azure services**
2. **Create fresh Azure PostgreSQL database** 
3. **Use updated-schema.sql** to create tables with correct structure
4. **Import your production data** using the production-data.sql (if you have existing data)
5. **Deploy updated codebase** from export-package/codebase/
6. **Test all functionality** especially:
   - User authentication
   - RFQ creation with Special Instructions field
   - File downloads for suppliers
   - Company data sharing

## Verification Checklist
- [ ] RFQs table has `special_instructions` column
- [ ] Users table has `company_id` and `company_name_input` columns (not old `company` column)
- [ ] All enhanced supplier assessment fields are present
- [ ] Special Instructions field appears in supplier portal
- [ ] File downloads work for suppliers
- [ ] Company data sharing works between users from same company

## Important Notes
- **DO NOT** proceed with the migration that wants to delete the `company` column if you have important data
- **ALWAYS** backup your database before making schema changes
- The warning about "data-loss statements" indicates a schema mismatch that needs to be resolved before deployment