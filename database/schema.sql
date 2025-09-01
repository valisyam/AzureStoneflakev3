--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (84ade85)
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.supplier_quotes DROP CONSTRAINT IF EXISTS supplier_quotes_supplier_id_fkey;
ALTER TABLE IF EXISTS ONLY public.supplier_quotes DROP CONSTRAINT IF EXISTS supplier_quotes_rfq_id_fkey;
ALTER TABLE IF EXISTS ONLY public.shipments DROP CONSTRAINT IF EXISTS shipments_order_id_sales_orders_id_fk;
ALTER TABLE IF EXISTS ONLY public.sales_quotes DROP CONSTRAINT IF EXISTS sales_quotes_rfq_id_rfqs_id_fk;
ALTER TABLE IF EXISTS ONLY public.sales_orders DROP CONSTRAINT IF EXISTS sales_orders_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.sales_orders DROP CONSTRAINT IF EXISTS sales_orders_rfq_id_rfqs_id_fk;
ALTER TABLE IF EXISTS ONLY public.sales_orders DROP CONSTRAINT IF EXISTS sales_orders_quote_id_sales_quotes_id_fk;
ALTER TABLE IF EXISTS ONLY public.sales_invoices DROP CONSTRAINT IF EXISTS sales_invoices_order_id_sales_orders_id_fk;
ALTER TABLE IF EXISTS ONLY public.rfqs DROP CONSTRAINT IF EXISTS rfqs_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.rfq_assignments DROP CONSTRAINT IF EXISTS rfq_assignments_supplier_id_fkey;
ALTER TABLE IF EXISTS ONLY public.rfq_assignments DROP CONSTRAINT IF EXISTS rfq_assignments_rfq_id_fkey;
ALTER TABLE IF EXISTS ONLY public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_supplier_quote_id_fkey;
ALTER TABLE IF EXISTS ONLY public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_supplier_id_fkey;
ALTER TABLE IF EXISTS ONLY public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_rfq_id_fkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;
ALTER TABLE IF EXISTS ONLY public.message_attachments DROP CONSTRAINT IF EXISTS message_attachments_message_id_fkey;
ALTER TABLE IF EXISTS ONLY public.files DROP CONSTRAINT IF EXISTS files_user_id_users_id_fk;
DROP INDEX IF EXISTS public.users_email_role_unique;
DROP INDEX IF EXISTS public.users_customer_number_unique;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.supplier_quotes DROP CONSTRAINT IF EXISTS supplier_quotes_pkey;
ALTER TABLE IF EXISTS ONLY public.shipments DROP CONSTRAINT IF EXISTS shipments_pkey;
ALTER TABLE IF EXISTS ONLY public.sales_quotes DROP CONSTRAINT IF EXISTS sales_quotes_quote_number_unique;
ALTER TABLE IF EXISTS ONLY public.sales_quotes DROP CONSTRAINT IF EXISTS sales_quotes_pkey;
ALTER TABLE IF EXISTS ONLY public.sales_orders DROP CONSTRAINT IF EXISTS sales_orders_pkey;
ALTER TABLE IF EXISTS ONLY public.sales_orders DROP CONSTRAINT IF EXISTS sales_orders_order_number_unique;
ALTER TABLE IF EXISTS ONLY public.sales_invoices DROP CONSTRAINT IF EXISTS sales_invoices_pkey;
ALTER TABLE IF EXISTS ONLY public.sales_invoices DROP CONSTRAINT IF EXISTS sales_invoices_invoice_number_unique;
ALTER TABLE IF EXISTS ONLY public.rfqs DROP CONSTRAINT IF EXISTS rfqs_pkey;
ALTER TABLE IF EXISTS ONLY public.rfq_assignments DROP CONSTRAINT IF EXISTS rfq_assignments_pkey;
ALTER TABLE IF EXISTS ONLY public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_pkey;
ALTER TABLE IF EXISTS ONLY public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_order_number_key;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_pkey;
ALTER TABLE IF EXISTS ONLY public.message_attachments DROP CONSTRAINT IF EXISTS message_attachments_pkey;
ALTER TABLE IF EXISTS ONLY public.files DROP CONSTRAINT IF EXISTS files_pkey;
ALTER TABLE IF EXISTS ONLY public.db_test_markers DROP CONSTRAINT IF EXISTS db_test_markers_pkey;
ALTER TABLE IF EXISTS ONLY public.companies DROP CONSTRAINT IF EXISTS companies_pkey;
ALTER TABLE IF EXISTS ONLY public.companies DROP CONSTRAINT IF EXISTS companies_customer_number_key;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.supplier_quotes;
DROP TABLE IF EXISTS public.shipments;
DROP TABLE IF EXISTS public.sales_quotes;
DROP TABLE IF EXISTS public.sales_orders;
DROP TABLE IF EXISTS public.sales_invoices;
DROP TABLE IF EXISTS public.rfqs;
DROP TABLE IF EXISTS public.rfq_assignments;
DROP TABLE IF EXISTS public.purchase_orders;
DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.messages;
DROP TABLE IF EXISTS public.message_attachments;
DROP TABLE IF EXISTS public.files;
DROP TABLE IF EXISTS public.db_test_markers;
DROP TABLE IF EXISTS public.companies;
DROP TYPE IF EXISTS public.rfq_status;
DROP TYPE IF EXISTS public.order_status;
DROP TYPE IF EXISTS public.linked_to_type;
DROP TYPE IF EXISTS public.file_type;
--
-- Name: file_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.file_type AS ENUM (
    'step',
    'pdf',
    'excel',
    'image'
);


ALTER TYPE public.file_type OWNER TO neondb_owner;

--
-- Name: linked_to_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.linked_to_type AS ENUM (
    'rfq',
    'order',
    'quality_check'
);


ALTER TYPE public.linked_to_type OWNER TO neondb_owner;

--
-- Name: order_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.order_status AS ENUM (
    'waiting_for_po',
    'pending',
    'material_procurement',
    'manufacturing',
    'finishing',
    'quality_check',
    'packing',
    'shipped',
    'delivered'
);


ALTER TYPE public.order_status OWNER TO neondb_owner;

--
-- Name: rfq_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.rfq_status AS ENUM (
    'submitted',
    'quoted',
    'accepted',
    'declined'
);


ALTER TYPE public.rfq_status OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: companies; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.companies (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_number character varying NOT NULL,
    name character varying NOT NULL,
    contact_email character varying,
    phone character varying,
    address text,
    city character varying,
    state character varying,
    country character varying DEFAULT 'United States'::character varying,
    postal_code character varying,
    website character varying,
    industry character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    company_type character varying DEFAULT 'customer'::character varying
);


ALTER TABLE public.companies OWNER TO neondb_owner;

--
-- Name: db_test_markers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.db_test_markers (
    id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.db_test_markers OWNER TO neondb_owner;

--
-- Name: files; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.files (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    file_name character varying NOT NULL,
    file_url text NOT NULL,
    file_size integer NOT NULL,
    file_type public.file_type NOT NULL,
    linked_to_type public.linked_to_type NOT NULL,
    linked_to_id character varying NOT NULL,
    uploaded_at timestamp without time zone DEFAULT now(),
    glb_url text,
    glb_path text,
    conversion_stats text
);


ALTER TABLE public.files OWNER TO neondb_owner;

--
-- Name: message_attachments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.message_attachments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    message_id character varying NOT NULL,
    file_name character varying NOT NULL,
    original_name character varying NOT NULL,
    file_size integer NOT NULL,
    mime_type character varying NOT NULL,
    file_path text NOT NULL,
    uploaded_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.message_attachments OWNER TO neondb_owner;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.messages (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    sender_id character varying NOT NULL,
    receiver_id character varying NOT NULL,
    subject character varying,
    content text NOT NULL,
    is_read boolean DEFAULT false,
    related_type character varying,
    related_id character varying,
    created_at timestamp without time zone DEFAULT now(),
    thread_id character varying,
    category character varying DEFAULT 'general'::character varying,
    email_notification_sent boolean DEFAULT false,
    email_notification_sent_at timestamp without time zone
);


ALTER TABLE public.messages OWNER TO neondb_owner;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.notifications (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    type character varying NOT NULL,
    title character varying NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    related_id character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.notifications OWNER TO neondb_owner;

--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.purchase_orders (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    order_number character varying NOT NULL,
    supplier_quote_id character varying,
    supplier_id character varying NOT NULL,
    rfq_id character varying,
    status character varying DEFAULT 'pending'::character varying,
    total_amount numeric(10,2) NOT NULL,
    delivery_date timestamp without time zone,
    notes text,
    po_file_url text,
    created_at timestamp without time zone DEFAULT now(),
    accepted_at timestamp without time zone,
    supplier_invoice_url text,
    invoice_uploaded_at timestamp without time zone,
    payment_completed_at timestamp without time zone,
    archived_at timestamp without time zone
);


ALTER TABLE public.purchase_orders OWNER TO neondb_owner;

--
-- Name: rfq_assignments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.rfq_assignments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    rfq_id character varying NOT NULL,
    supplier_id character varying NOT NULL,
    assigned_at timestamp without time zone DEFAULT now(),
    status text DEFAULT 'assigned'::text
);


ALTER TABLE public.rfq_assignments OWNER TO neondb_owner;

--
-- Name: rfqs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.rfqs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    project_name character varying NOT NULL,
    material character varying NOT NULL,
    tolerance character varying NOT NULL,
    quantity integer NOT NULL,
    notes text,
    status public.rfq_status DEFAULT 'submitted'::public.rfq_status,
    created_at timestamp without time zone DEFAULT now(),
    material_grade character varying,
    finishing character varying,
    manufacturing_process character varying,
    manufacturing_subprocess character varying,
    international_manufacturing_ok boolean DEFAULT false,
    reference_number character varying(50),
    sqte_number text,
    special_instructions text
);


ALTER TABLE public.rfqs OWNER TO neondb_owner;

--
-- Name: sales_invoices; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sales_invoices (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    order_id character varying NOT NULL,
    invoice_number character varying NOT NULL,
    amount_due numeric(10,2) NOT NULL,
    amount_paid numeric(10,2) DEFAULT '0'::numeric,
    due_date timestamp without time zone NOT NULL,
    is_paid boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.sales_invoices OWNER TO neondb_owner;

--
-- Name: sales_orders; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sales_orders (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    rfq_id character varying NOT NULL,
    quote_id character varying,
    order_date timestamp without time zone DEFAULT now(),
    estimated_completion timestamp without time zone,
    order_status text DEFAULT 'pending'::public.order_status,
    project_name character varying NOT NULL,
    material character varying NOT NULL,
    material_grade character varying,
    finishing character varying,
    tolerance character varying NOT NULL,
    quantity integer NOT NULL,
    notes text,
    amount numeric(10,2) NOT NULL,
    currency character varying DEFAULT 'USD'::character varying,
    tracking_number character varying,
    shipping_carrier character varying,
    invoice_url text,
    payment_status text DEFAULT 'unpaid'::text,
    is_archived boolean DEFAULT false,
    archived_at timestamp without time zone,
    order_number character varying NOT NULL,
    quantity_shipped integer DEFAULT 0,
    quantity_remaining integer DEFAULT 0 NOT NULL,
    quality_check_status text DEFAULT 'pending'::text,
    quality_check_notes text,
    customer_approved_at timestamp without time zone,
    customer_purchase_order_number character varying
);


ALTER TABLE public.sales_orders OWNER TO neondb_owner;

--
-- Name: sales_quotes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sales_quotes (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    rfq_id character varying NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying DEFAULT 'USD'::character varying,
    valid_until timestamp without time zone NOT NULL,
    quote_file_url text,
    created_at timestamp without time zone DEFAULT now(),
    status text DEFAULT 'pending'::text,
    customer_response text,
    purchase_order_url text,
    responded_at timestamp without time zone,
    notes text,
    quote_number character varying NOT NULL,
    purchase_order_number character varying,
    estimated_delivery_date timestamp without time zone
);


ALTER TABLE public.sales_quotes OWNER TO neondb_owner;

--
-- Name: shipments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.shipments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    order_id character varying NOT NULL,
    quantity_shipped integer NOT NULL,
    tracking_number character varying,
    shipping_carrier character varying,
    shipment_date timestamp without time zone DEFAULT now() NOT NULL,
    delivery_date timestamp without time zone,
    status text DEFAULT 'shipped'::text NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    tracking_status text DEFAULT 'material_procurement'::text NOT NULL
);


ALTER TABLE public.shipments OWNER TO neondb_owner;

--
-- Name: supplier_quotes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.supplier_quotes (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    rfq_id character varying NOT NULL,
    supplier_id character varying NOT NULL,
    price numeric(10,2) NOT NULL,
    lead_time integer NOT NULL,
    notes text,
    quote_file_url text,
    status text DEFAULT 'pending'::text,
    submitted_at timestamp without time zone DEFAULT now(),
    responded_at timestamp without time zone,
    sqte_number text,
    currency character varying DEFAULT 'USD'::character varying,
    tooling_cost numeric(10,2),
    part_cost_per_piece numeric(10,2),
    material_cost_per_piece numeric(10,2),
    machining_cost_per_piece numeric(10,2),
    finishing_cost_per_piece numeric(10,2),
    packaging_cost_per_piece numeric(10,2),
    shipping_cost numeric(10,2),
    tax_percentage numeric(5,2),
    tax_amount numeric(10,2),
    discount_percentage numeric(5,2),
    discount_amount numeric(10,2),
    total_before_tax numeric(10,2),
    total_after_tax numeric(10,2),
    valid_until timestamp without time zone,
    payment_terms character varying DEFAULT 'Net 30'::character varying,
    admin_feedback text
);


ALTER TABLE public.supplier_quotes OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email character varying NOT NULL,
    password_hash text NOT NULL,
    name character varying NOT NULL,
    is_admin boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    company character varying,
    customer_number character varying,
    phone character varying,
    address text,
    city character varying,
    state character varying,
    country character varying DEFAULT 'United States'::character varying,
    postal_code character varying,
    linked_customer_number character varying,
    is_verified boolean DEFAULT false,
    verification_code character varying,
    verification_code_expiry timestamp without time zone,
    title character varying,
    company_id character varying,
    company_name_input character varying,
    role character varying DEFAULT 'customer'::character varying,
    website character varying,
    certifications text,
    capabilities text,
    reset_code character varying,
    reset_code_expiry timestamp without time zone,
    is_admin_created boolean DEFAULT false,
    must_reset_password boolean DEFAULT false,
    finishing_capabilities text,
    year_established character varying,
    number_of_employees character varying,
    facility_size character varying,
    primary_industries text,
    quality_system character varying,
    lead_time_capability character varying,
    minimum_order_quantity character varying,
    max_part_size_capability character varying,
    tolerance_capability character varying,
    emergency_capability boolean DEFAULT false,
    international_shipping boolean DEFAULT false,
    user_number character varying
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: companies companies_customer_number_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_customer_number_key UNIQUE (company_number);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: db_test_markers db_test_markers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.db_test_markers
    ADD CONSTRAINT db_test_markers_pkey PRIMARY KEY (id);


--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- Name: message_attachments message_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT message_attachments_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_order_number_key UNIQUE (order_number);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: rfq_assignments rfq_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rfq_assignments
    ADD CONSTRAINT rfq_assignments_pkey PRIMARY KEY (id);


--
-- Name: rfqs rfqs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT rfqs_pkey PRIMARY KEY (id);


--
-- Name: sales_invoices sales_invoices_invoice_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_invoice_number_unique UNIQUE (invoice_number);


--
-- Name: sales_invoices sales_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_pkey PRIMARY KEY (id);


--
-- Name: sales_orders sales_orders_order_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_order_number_unique UNIQUE (order_number);


--
-- Name: sales_orders sales_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_pkey PRIMARY KEY (id);


--
-- Name: sales_quotes sales_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_quotes
    ADD CONSTRAINT sales_quotes_pkey PRIMARY KEY (id);


--
-- Name: sales_quotes sales_quotes_quote_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_quotes
    ADD CONSTRAINT sales_quotes_quote_number_unique UNIQUE (quote_number);


--
-- Name: shipments shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_pkey PRIMARY KEY (id);


--
-- Name: supplier_quotes supplier_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.supplier_quotes
    ADD CONSTRAINT supplier_quotes_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users_customer_number_unique; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX users_customer_number_unique ON public.users USING btree (customer_number) WHERE (customer_number IS NOT NULL);


--
-- Name: users_email_role_unique; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX users_email_role_unique ON public.users USING btree (email, role);


--
-- Name: files files_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: message_attachments message_attachments_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.message_attachments
    ADD CONSTRAINT message_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: messages messages_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id);


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: purchase_orders purchase_orders_rfq_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_rfq_id_fkey FOREIGN KEY (rfq_id) REFERENCES public.rfqs(id);


--
-- Name: purchase_orders purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.users(id);


--
-- Name: purchase_orders purchase_orders_supplier_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_quote_id_fkey FOREIGN KEY (supplier_quote_id) REFERENCES public.supplier_quotes(id);


--
-- Name: rfq_assignments rfq_assignments_rfq_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rfq_assignments
    ADD CONSTRAINT rfq_assignments_rfq_id_fkey FOREIGN KEY (rfq_id) REFERENCES public.rfqs(id);


--
-- Name: rfq_assignments rfq_assignments_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rfq_assignments
    ADD CONSTRAINT rfq_assignments_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.users(id);


--
-- Name: rfqs rfqs_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rfqs
    ADD CONSTRAINT rfqs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: sales_invoices sales_invoices_order_id_sales_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_order_id_sales_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.sales_orders(id);


--
-- Name: sales_orders sales_orders_quote_id_sales_quotes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_quote_id_sales_quotes_id_fk FOREIGN KEY (quote_id) REFERENCES public.sales_quotes(id);


--
-- Name: sales_orders sales_orders_rfq_id_rfqs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_rfq_id_rfqs_id_fk FOREIGN KEY (rfq_id) REFERENCES public.rfqs(id);


--
-- Name: sales_orders sales_orders_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: sales_quotes sales_quotes_rfq_id_rfqs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_quotes
    ADD CONSTRAINT sales_quotes_rfq_id_rfqs_id_fk FOREIGN KEY (rfq_id) REFERENCES public.rfqs(id);


--
-- Name: shipments shipments_order_id_sales_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_order_id_sales_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.sales_orders(id) ON DELETE CASCADE;


--
-- Name: supplier_quotes supplier_quotes_rfq_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.supplier_quotes
    ADD CONSTRAINT supplier_quotes_rfq_id_fkey FOREIGN KEY (rfq_id) REFERENCES public.rfqs(id);


--
-- Name: supplier_quotes supplier_quotes_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.supplier_quotes
    ADD CONSTRAINT supplier_quotes_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.users(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

