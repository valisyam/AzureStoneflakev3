-- OLD SCHEMA - DO NOT USE
-- This schema is outdated and missing recent enhancements
-- Use updated-schema.sql instead

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table - Core user authentication and profiles
CREATE TABLE users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR UNIQUE NOT NULL,
    password VARCHAR NOT NULL,
    first_name VARCHAR NOT NULL,
    last_name VARCHAR NOT NULL,
    role VARCHAR NOT NULL CHECK (role IN ('customer', 'supplier', 'admin')),
    is_admin BOOLEAN DEFAULT false,
    phone VARCHAR,
    company_name VARCHAR,
    address TEXT,
    city VARCHAR,
    state VARCHAR,
    zip_code VARCHAR,
    country VARCHAR DEFAULT 'United States',
    created_at TIMESTAMP DEFAULT NOW(),
    email_verified BOOLEAN DEFAULT false,
    verification_code VARCHAR,
    verification_expires TIMESTAMP,
    customer_number VARCHAR,
    supplier_id VARCHAR,
    manufacturing_capabilities TEXT,
    finishing_capabilities TEXT,
    certifications TEXT,
    primary_industries TEXT,
    min_order_value DECIMAL(10,2),
    max_order_value DECIMAL(10,2),
    lead_time_days INTEGER,
    emergency_capability BOOLEAN DEFAULT false,
    international_shipping BOOLEAN DEFAULT false,
    company_name_input VARCHAR
);

-- Companies table
CREATE TABLE companies (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    customer_number VARCHAR UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- RFQs table - Request for Quotes
CREATE TABLE rfqs (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id VARCHAR NOT NULL REFERENCES users(id),
    project_name VARCHAR NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL,
    material VARCHAR,
    due_date TIMESTAMP,
    status VARCHAR DEFAULT 'new' CHECK (status IN ('new', 'quoted', 'accepted', 'declined')),
    created_at TIMESTAMP DEFAULT NOW(),
    notes TEXT,
    special_requirements TEXT,
    customer_drawing_urls TEXT,
    specification_file_urls TEXT
);

-- Sales Orders table
CREATE TABLE sales_orders (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id VARCHAR NOT NULL REFERENCES rfqs(id),
    customer_id VARCHAR NOT NULL REFERENCES users(id),
    order_number VARCHAR UNIQUE NOT NULL,
    status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'material_procurement', 'manufacturing', 'finishing', 'quality_check', 'packing', 'shipped', 'delivered')),
    total_amount DECIMAL(10,2) NOT NULL,
    due_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    archived_at TIMESTAMP,
    quality_check_status TEXT DEFAULT 'pending' CHECK (quality_check_status IN ('pending', 'approved', 'needs_revision')),
    quality_check_notes TEXT,
    customer_approved_at TIMESTAMP,
    customer_purchase_order_number VARCHAR
);

-- Purchase Orders table - Orders placed by admin to suppliers
CREATE TABLE purchase_orders (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR UNIQUE NOT NULL,
    supplier_quote_id VARCHAR,
    supplier_id VARCHAR NOT NULL REFERENCES users(id),
    rfq_id VARCHAR REFERENCES rfqs(id),
    status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'material_procurement', 'manufacturing', 'finishing', 'quality_check', 'packing', 'shipped', 'delivered', 'archived')),
    total_amount DECIMAL(10,2) NOT NULL,
    delivery_date TIMESTAMP,
    notes TEXT,
    po_file_url TEXT,
    archived_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    accepted_at TIMESTAMP
);

-- Supplier Quotes table
CREATE TABLE supplier_quotes (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id VARCHAR NOT NULL REFERENCES rfqs(id),
    supplier_id VARCHAR NOT NULL REFERENCES users(id),
    price DECIMAL(10,2) NOT NULL,
    lead_time INTEGER NOT NULL,
    notes TEXT,
    status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMP DEFAULT NOW(),
    quote_file_url TEXT,
    currency VARCHAR DEFAULT 'USD',
    tooling_cost DECIMAL(10,2),
    part_cost_per_piece DECIMAL(10,2),
    material_cost_per_piece DECIMAL(10,2),
    machining_cost_per_piece DECIMAL(10,2),
    finishing_cost_per_piece DECIMAL(10,2),
    packaging_cost_per_piece DECIMAL(10,2),
    shipping_cost DECIMAL(10,2),
    tax_percentage DECIMAL(5,2),
    discount_percentage DECIMAL(5,2),
    payment_terms VARCHAR DEFAULT 'Net 30',
    valid_until TIMESTAMP
);

-- Files table
CREATE TABLE files (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    original_name VARCHAR NOT NULL,
    stored_name VARCHAR NOT NULL,
    file_path VARCHAR NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR NOT NULL,
    uploaded_by VARCHAR NOT NULL REFERENCES users(id),
    rfq_id VARCHAR REFERENCES rfqs(id),
    order_id VARCHAR REFERENCES sales_orders(id),
    created_at TIMESTAMP DEFAULT NOW(),
    file_type VARCHAR CHECK (file_type IN ('drawing', 'specification', 'quote', 'invoice', 'quality_check'))
);

-- Sales Invoices table
CREATE TABLE sales_invoices (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR NOT NULL REFERENCES sales_orders(id),
    invoice_number VARCHAR UNIQUE NOT NULL,
    amount_due DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    due_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    invoice_file_url TEXT
);

-- Notifications table
CREATE TABLE notifications (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    type VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    related_type VARCHAR,
    related_id VARCHAR
);

-- Messages table - Communication between users
CREATE TABLE messages (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id VARCHAR NOT NULL REFERENCES users(id),
    receiver_id VARCHAR NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    related_type VARCHAR,
    related_id VARCHAR,
    thread_id VARCHAR,
    category VARCHAR DEFAULT 'general',
    created_at TIMESTAMP DEFAULT NOW(),
    attachment_urls TEXT
);

-- RFQ Assignments table - Many-to-many relationship between RFQs and suppliers
CREATE TABLE rfq_assignments (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id VARCHAR NOT NULL REFERENCES rfqs(id),
    supplier_id VARCHAR NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(rfq_id, supplier_id)
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_customer_number ON users(customer_number);
CREATE INDEX idx_rfqs_customer_id ON rfqs(customer_id);
CREATE INDEX idx_rfqs_status ON rfqs(status);
CREATE INDEX idx_sales_orders_customer_id ON sales_orders(customer_id);
CREATE INDEX idx_sales_orders_status ON sales_orders(status);
CREATE INDEX idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_supplier_quotes_rfq_id ON supplier_quotes(rfq_id);
CREATE INDEX idx_supplier_quotes_supplier_id ON supplier_quotes(supplier_id);
CREATE INDEX idx_files_rfq_id ON files(rfq_id);
CREATE INDEX idx_files_order_id ON files(order_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_thread_id ON messages(thread_id);