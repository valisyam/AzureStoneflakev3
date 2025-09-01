# Stoneflake Manufacturing Customer Portal

## Overview

This is a full-stack manufacturing customer portal for Stoneflake (S-Hub), designed to function similarly to Xometry or Fictiv. Its main purpose is to enable customers to upload design files (STEP, PDF), request manufacturing quotes (RFQs), track orders through the production pipeline, and manage their manufacturing projects. The application provides both a customer-facing interface and an administrative dashboard for efficient management of quotes and orders. The business vision is to streamline the manufacturing order process, enhancing customer experience and operational efficiency in the manufacturing sector. Key capabilities include comprehensive company-wide data sharing and email notifications for both customer and supplier companies, professional quote status communication, and robust purchase order archiving.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application employs a modern full-stack architecture with a clear separation between client and server components.

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: TailwindCSS with a custom Stoneflake branding palette (teal primary, navy secondary), featuring dynamic role-based themes (teal/blue for customer, purple/indigo for supplier, with animated backgrounds and smooth transitions).
- **State Management**: TanStack Query (React Query) for server state
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM, leveraging Neon serverless PostgreSQL.
- **Authentication**: JWT-based authentication with bcrypt password hashing.
- **File Upload**: Multer middleware for handling STEP and PDF files.

### Key Features and Design Decisions
- **Dual-Role Portal System**: Implemented with Customer/Supplier selection, dynamic theme switching, and role-based authentication flows.
- **Business Document Numbering**: Year-based automatic numbering system for all sales quotes (SQTE-YYNNN), sales orders (SORD-YYNNN), and sales invoices (SINV-YYNNN).
- **Comprehensive Order Tracking**: An 8-stage tracking system (pending → material procurement → manufacturing → finishing → quality check → packing → shipped → delivered) with support for multi-shipment tracking and branched tracking for partial deliveries.
- **Enhanced Company Management System**: Automatic company creation, admin capabilities to edit company names, and streamlined user linking. Users from the same company share customer numbers (CU0001, CU0002, etc.) and can view all orders, RFQs, and quotes for their organization.
- **Supplier Purchase Order Workflow**: Complete Accept/Reject functionality for suppliers with backend endpoints, database operations, and frontend UI buttons. Archive functionality properly separates completed orders.
- **Admin Manual Creation**: Comprehensive admin functionality for manually creating quotes and orders with customer search and selection.
- **Customer Management System**: Advanced admin interface for linking/unlinking users to customer IDs, managing company relationships, and viewing all users within a company.
- **Individual User ID Display**: Customer portal displays unique user numbers (100014, 100015, etc.) in sidebar profile section while maintaining company-wide data sharing.
- **Admin Workflow Enhancements**: Calendar-based date pickers, resizable columns for tables, comprehensive search and filtering, and explicit save actions for status updates.
- **Invoice Management System**: Integration for admin upload and customer viewing of invoices post-packing stage.
- **Quality Check System**: Admin notification system for quality checks, persistence of files and approval status, and a dedicated approval workflow.
- **UI/UX Decisions**: Professional manufacturing industry aesthetic with subtle gradient backgrounds and industrial themes for the customer portal; clean grey background for the admin portal. Enhanced header branding with rounded glass-morphism effects. Modern sidebar navigation system for the supplier portal.
- **Authentication System**: JWT token-based authentication with role-based access control and email verification requirement for new user registrations.
- **File Management**: Support for STEP and PDF file uploads, secure file storage, and linking to RFQs or orders. Download zip functionality for order documents.
- **RFQ and Order Workflow**: Comprehensive quoting system from "New" RFQ to "Quoted", customer "Accepted/Declined", and "Order Created" by admin from accepted quotes.
- **Message Threading System**: Unique threads for each new conversation across all portals (customer, supplier, admin).
- **Unread Message Notification System**: Real-time red notification dots showing unread count with auto-refresh across all portals.

## External Dependencies

- **React Ecosystem**: React 18, React DOM, React Hook Form, React Query (TanStack Query)
- **Database**: Drizzle ORM, Neon PostgreSQL driver
- **UI Components**: Radix UI primitives, shadcn/ui, Lucide React icons
- **Styling**: TailwindCSS, class-variance-authority, clsx
- **Validation**: Zod schema validation
- **Build Tools**: Vite, TypeScript, ESBuild
- **File Handling**: Multer
- **Authentication**: bcrypt
- **Email Service**: SendGrid (for email verification)
- **3D Visualization**: xeokit SDK (for STEP file preview)