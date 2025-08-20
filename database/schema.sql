-- Stoneflake Manufacturing Portal Database Schema
-- Updated schema matching current development environment - COMPLETE VERSION
-- Generated for Azure migration - ALL TABLES INCLUDED

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
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Sales quotes table
CREATE TABLE sales_quotes (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id VARCHAR NOT NULL REFERENCES rfqs(id),
    quote_number VARCHAR NOT NULL UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR DEFAULT 'USD',
    valid_until TIMESTAMP NOT NULL,
    estimated_delivery_date TIMESTAMP,
    quote_file_url TEXT,
    notes TEXT, -- Admin's special instructions/notes
    status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
    customer_response TEXT,
    purchase_order_url TEXT,
    purchase_order_number VARCHAR,
    responded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sales orders table
CREATE TABLE sales_orders (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    rfq_id VARCHAR NOT NULL REFERENCES rfqs(id),
    quote_id VARCHAR REFERENCES sales_quotes(id),
    order_number VARCHAR NOT NULL UNIQUE,
    project_name VARCHAR NOT NULL,
    material VARCHAR NOT NULL,
    material_grade VARCHAR,
    finishing VARCHAR,
    tolerance VARCHAR NOT NULL,
    quantity INTEGER NOT NULL,
    quantity_shipped INTEGER DEFAULT 0,
    quantity_remaining INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR DEFAULT 'USD',
    order_status order_status DEFAULT 'pending',
    payment_status TEXT CHECK (payment_status IN ('unpaid', 'paid')) DEFAULT 'unpaid',
    is_archived BOOLEAN DEFAULT false,
    order_date TIMESTAMP DEFAULT NOW(),
    estimated_completion TIMESTAMP,
    tracking_number VARCHAR,
    shipping_carrier VARCHAR,
    invoice_url TEXT,
    archived_at TIMESTAMP,
    -- Quality check inspection fields
    quality_check_status TEXT CHECK (quality_check_status IN ('pending', 'approved', 'needs_revision')) DEFAULT 'pending',
    quality_check_notes TEXT,
    customer_approved_at TIMESTAMP,
    -- Customer purchase order number (what customer calls this order internally)
    customer_purchase_order_number VARCHAR
);

-- Sales invoices table
CREATE TABLE sales_invoices (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR NOT NULL REFERENCES sales_orders(id),
    invoice_number VARCHAR NOT NULL UNIQUE,
    amount_due DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    due_date TIMESTAMP NOT NULL,
    is_paid BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Shipments table for tracking multiple partial deliveries
CREATE TABLE shipments (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    quantity_shipped INTEGER NOT NULL,
    tracking_number VARCHAR,
    shipping_carrier VARCHAR,
    shipment_date TIMESTAMP NOT NULL DEFAULT NOW(),
    delivery_date TIMESTAMP,
    -- Independent tracking status for each shipment branch
    tracking_status TEXT NOT NULL DEFAULT 'material_procurement', -- material_procurement, manufacturing, finishing, quality_check, packing, shipped, delivered
    status TEXT NOT NULL DEFAULT 'shipped', -- shipped, delivered (legacy, keeping for compatibility)
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Supplier quotes table - Quotes submitted by suppliers for RFQs
CREATE TABLE supplier_quotes (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id VARCHAR NOT NULL REFERENCES rfqs(id),
    supplier_id VARCHAR NOT NULL REFERENCES users(id),
    sqte_number VARCHAR, -- Reference to the SQTE number from RFQ
    price DECIMAL(10,2) NOT NULL,
    lead_time INTEGER NOT NULL, -- in days
    notes TEXT,
    quote_file_url TEXT,
    status TEXT CHECK (status IN ('pending', 'accepted', 'not_selected')) DEFAULT 'pending',
    -- Enhanced pricing breakdown fields
    currency VARCHAR DEFAULT 'USD', -- USD, EUR, CAD, etc.
    tooling_cost DECIMAL(10,2), -- One-time tooling/setup cost
    part_cost_per_piece DECIMAL(10,2), -- Cost per individual part
    material_cost_per_piece DECIMAL(10,2), -- Material cost per part
    machining_cost_per_piece DECIMAL(10,2), -- Machining/processing cost per part
    finishing_cost_per_piece DECIMAL(10,2), -- Finishing cost per part
    packaging_cost_per_piece DECIMAL(10,2), -- Packaging cost per part
    shipping_cost DECIMAL(10,2), -- Total shipping cost
    tax_percentage DECIMAL(5,2), -- Tax percentage (e.g., 8.25 for 8.25%)
    tax_amount DECIMAL(10,2), -- Calculated tax amount
    discount_percentage DECIMAL(5,2), -- Discount percentage if any
    discount_amount DECIMAL(10,2), -- Discount amount
    total_before_tax DECIMAL(10,2), -- Subtotal before tax
    total_after_tax DECIMAL(10,2), -- Final total including tax
    valid_until TIMESTAMP, -- Quote validity date
    payment_terms VARCHAR, -- e.g., "Net 30", "50% upfront", etc.
    submitted_at TIMESTAMP DEFAULT NOW(),
    responded_at TIMESTAMP,
    admin_feedback TEXT -- Admin comment when not selecting a quote
);

-- RFQ assignments table - Links RFQs to suppliers
CREATE TABLE rfq_assignments (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id VARCHAR NOT NULL REFERENCES rfqs(id),
    supplier_id VARCHAR NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT NOW(),
    status TEXT CHECK (status IN ('assigned', 'quoted', 'expired')) DEFAULT 'assigned'
);

-- Notifications table - System notifications for suppliers and admins
CREATE TABLE notifications (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    type notification_type NOT NULL,
    title VARCHAR NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    related_id VARCHAR, -- RFQ ID, Order ID, etc.
    created_at TIMESTAMP DEFAULT NOW()
);

-- Purchase Orders table - Orders placed by admin to suppliers
CREATE TABLE purchase_orders (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR NOT NULL UNIQUE, -- PO-YYNNN format
    supplier_quote_id VARCHAR REFERENCES supplier_quotes(id),
    supplier_id VARCHAR NOT NULL REFERENCES users(id),
    rfq_id VARCHAR REFERENCES rfqs(id),
    status purchase_order_status DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    delivery_date TIMESTAMP,
    notes TEXT,
    po_file_url TEXT, -- URL to uploaded PO PDF file
    supplier_invoice_url TEXT, -- URL to supplier uploaded invoice
    invoice_uploaded_at TIMESTAMP,
    payment_completed_at TIMESTAMP,
    archived_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    accepted_at TIMESTAMP
);

-- Messages table - Communication between admin and suppliers with file attachments
CREATE TABLE messages (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id VARCHAR NOT NULL REFERENCES users(id),
    receiver_id VARCHAR NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    related_type VARCHAR, -- 'purchase_order', 'rfq', 'general'
    related_id VARCHAR,
    thread_id VARCHAR, -- Generated based on users + category for separate conversations
    category VARCHAR DEFAULT 'general', -- billing, support, technical, general, etc.
    subject VARCHAR, -- Optional subject line for the thread
    created_at TIMESTAMP DEFAULT NOW()
);

-- Message Attachments table - Files attached to messages
CREATE TABLE message_attachments (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id VARCHAR NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_name VARCHAR NOT NULL,
    original_name VARCHAR NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_rfqs_user_id ON rfqs(user_id);
CREATE INDEX idx_rfqs_status ON rfqs(status);
CREATE INDEX idx_files_linked_to ON files(linked_to_type, linked_to_id);
CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_companies_customer_number ON companies(customer_number);
CREATE INDEX idx_sales_quotes_rfq_id ON sales_quotes(rfq_id);
CREATE INDEX idx_sales_orders_user_id ON sales_orders(user_id);
CREATE INDEX idx_sales_orders_rfq_id ON sales_orders(rfq_id);
CREATE INDEX idx_supplier_quotes_rfq_id ON supplier_quotes(rfq_id);
CREATE INDEX idx_supplier_quotes_supplier_id ON supplier_quotes(supplier_id);
CREATE INDEX idx_rfq_assignments_rfq_id ON rfq_assignments(rfq_id);
CREATE INDEX idx_rfq_assignments_supplier_id ON rfq_assignments(supplier_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_shipments_order_id ON shipments(order_id);