-- Stoneflake Manufacturing Portal Database Schema
-- Updated schema matching current development environment
-- Generated for Azure migration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for gen_random_uuid() if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE user_role AS ENUM ('customer', 'supplier', 'admin');
CREATE TYPE rfq_status AS ENUM ('submitted', 'quoted', 'accepted', 'declined', 'sent_to_suppliers');
CREATE TYPE order_status AS ENUM ('waiting_for_po', 'pending', 'material_procurement', 'manufacturing', 'finishing', 'quality_check', 'packing', 'shipped', 'delivered');
CREATE TYPE file_type AS ENUM ('step', 'pdf', 'excel', 'image', 'quote');
CREATE TYPE linked_to_type AS ENUM ('rfq', 'order', 'quality_check', 'supplier_quote');
CREATE TYPE notification_type AS ENUM ('rfq_assignment', 'status_update', 'message', 'order_confirmation');
CREATE TYPE purchase_order_status AS ENUM ('pending', 'accepted', 'in_progress', 'shipped', 'delivered', 'cancelled', 'completed', 'archived');

-- Companies table - Each company gets a unique customer number
CREATE TABLE companies (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_number VARCHAR NOT NULL UNIQUE, -- CU0001, CU0002, etc.
    name VARCHAR NOT NULL, -- Official company name
    contact_email VARCHAR, -- Primary company contact email
    phone VARCHAR,
    address TEXT,
    city VARCHAR,
    state VARCHAR,
    country VARCHAR DEFAULT 'United States',
    postal_code VARCHAR,
    website VARCHAR,
    industry VARCHAR,
    notes TEXT, -- Admin notes about the company
    created_at TIMESTAMP DEFAULT NOW()
);

-- Users table - Users belong to companies and have roles
CREATE TABLE users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR NOT NULL,
    password_hash TEXT NOT NULL,
    name VARCHAR NOT NULL,
    title VARCHAR, -- Job title like "Purchasing Manager", "Engineer"
    phone VARCHAR,
    company_id VARCHAR REFERENCES companies(id), -- Link to company
    company_name_input VARCHAR, -- What user entered during signup (before admin links to actual company)
    role user_role DEFAULT 'customer',
    is_admin BOOLEAN DEFAULT false, -- Keep for backwards compatibility
    is_verified BOOLEAN DEFAULT false,
    verification_code VARCHAR,
    verification_code_expiry TIMESTAMP,
    reset_code VARCHAR,
    reset_code_expiry TIMESTAMP,
    is_admin_created BOOLEAN DEFAULT false, -- Track if account was created by admin
    must_reset_password BOOLEAN DEFAULT false, -- Force password reset on first login
    -- Supplier-specific fields
    supplier_number VARCHAR, -- V0001, V0002, etc. for suppliers
    website VARCHAR,
    certifications TEXT, -- JSON array of certifications
    capabilities TEXT, -- JSON array of manufacturing capabilities
    finishing_capabilities TEXT, -- JSON array of finishing capabilities
    address TEXT,
    city VARCHAR,
    state VARCHAR,
    country VARCHAR DEFAULT 'United States',
    postal_code VARCHAR,
    -- Enhanced supplier assessment fields
    year_established VARCHAR,
    number_of_employees VARCHAR,
    facility_size VARCHAR,
    primary_industries TEXT, -- JSON array
    quality_system VARCHAR,
    lead_time_capability VARCHAR,
    minimum_order_quantity VARCHAR,
    max_part_size_capability VARCHAR,
    tolerance_capability VARCHAR,
    emergency_capability BOOLEAN DEFAULT false,
    international_shipping BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    -- Unique constraint on email + role combination
    UNIQUE(email, role)
);

-- RFQs table
CREATE TABLE rfqs (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    project_name VARCHAR NOT NULL,
    material VARCHAR NOT NULL,
    material_grade VARCHAR,
    finishing VARCHAR,
    tolerance VARCHAR NOT NULL,
    quantity INTEGER NOT NULL,
    notes TEXT,
    special_instructions TEXT, -- CRITICAL: This field was missing in export package
    status rfq_status DEFAULT 'submitted',
    -- SQTE number for RFQs sent to suppliers (replaces referenceNumber)
    sqte_number VARCHAR, -- e.g., "SQTE-001", "SQTE-002"
    -- New fields for manufacturing process and international preference
    manufacturing_process VARCHAR, -- e.g., "cnc_machining", "casting", etc.
    manufacturing_subprocess VARCHAR, -- e.g., "sand_casting", "die_casting", etc.
    international_manufacturing_ok BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Files table
CREATE TABLE files (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    file_name VARCHAR NOT NULL,
    file_url TEXT NOT NULL,
    glb_url TEXT, -- GLB conversion for STEP files
    glb_path TEXT, -- Server path to GLB file
    conversion_stats TEXT, -- JSON string with conversion statistics
    file_size INTEGER NOT NULL,
    file_type file_type NOT NULL,
    linked_to_type linked_to_type NOT NULL,
    linked_to_id VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Continue with other tables from your current schema...
-- (Add remaining tables as needed)

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_rfqs_user_id ON rfqs(user_id);
CREATE INDEX idx_rfqs_status ON rfqs(status);
CREATE INDEX idx_files_linked_to ON files(linked_to_type, linked_to_id);
CREATE INDEX idx_companies_customer_number ON companies(customer_number);