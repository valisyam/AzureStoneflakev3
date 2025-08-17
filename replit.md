# Stoneflake Manufacturing Customer Portal

## Overview

This is a full-stack manufacturing customer portal for Stoneflake (S-Hub), designed to function similarly to Xometry or Fictiv. Its main purpose is to enable customers to upload design files (STEP, PDF), request manufacturing quotes (RFQs), track orders through the production pipeline, and manage their manufacturing projects. The application provides both a customer-facing interface and an administrative dashboard for efficient management of quotes and orders. The business vision is to streamline the manufacturing order process, enhancing customer experience and operational efficiency in the manufacturing sector.

**Latest Enhancement**: Fixed critical production archive filtering bug where archived purchase orders (PO-0001, PO-0002) appeared in Active POs tab despite having archived status. Root cause was missing archived_at timestamps in production database - records had status='archived' but archived_at=null. Implemented two-part fix: (1) Database update to add proper archived_at timestamps to archived purchase orders, (2) Enhanced frontend filtering logic to check both archivedAt timestamp AND status conditions. Archive filtering now works correctly across production environment with proper separation between Active POs and Archived POs tabs in supplier portal.

**Previous Enhancement**: Successfully resolved critical company data sharing bug that prevented users from the same company from seeing each other's data. Root cause was faulty SQL query syntax in `getRFQsByCustomerNumber` function using `ANY(ARRAY[...])` which was replaced with Drizzle's `inArray()` function. Additionally fixed authentication issues for Customer One account. Company data sharing now works perfectly - all users from the same company (Cherry Hill, CU0151) can see identical RFQs, orders, and quotes data. Both Customer One and Customer Two now access their shared dashboard showing activeRfqs:2 with proper authentication.

**Previous Enhancement**: Completely removed all 3D preview functionality from the system per user request. The system now focuses exclusively on simple file attachment and download capabilities without any STEP file visualization features. All 3D preview buttons, conversion routes, and related components have been eliminated from customer portal, supplier portal, and admin interfaces. File upload functionality works cleanly with immediate "Ready" status display and download-only capabilities for attached STEP and PDF files.

**Previous Enhancement**: Successfully resolved critical purchase order archiving bug that prevented admin-to-supplier purchase orders from appearing in archive tabs across both admin and supplier portals. Root cause was Drizzle ORM update failing to set `archivedAt` timestamp field due to type mapping issues. Implemented direct SQL approach in `updatePurchaseOrder` function to ensure both status and archived_at fields are properly updated simultaneously. Archive synchronization now works correctly - when admin archives a purchase order, it immediately appears in both the admin portal archives and the corresponding supplier's archived orders section, maintaining data consistency across all user roles.

**Previous Enhancement**: Fixed critical supplier company name display bug in admin portal supplier management. Issue was caused by duplicate `getAllSuppliers()` methods in backend storage where the simple version was overriding the detailed one with proper company name computation logic. Resolved by removing the duplicate method and ensuring the API correctly returns computed company names from either linked company records or `companyNameInput` field. Suppliers now display their actual company names (e.g., "Arcotherm") instead of "No Company Name" placeholder text.

**Previous Enhancement**: Fixed message threading system to create unique threads for each new conversation across all portals (customer, supplier, admin). Previously messages were incorrectly grouped by category dropdown selection, now each "New Message" creates a completely separate thread. Updated `generateThreadId()` function to use timestamp and random components instead of category-based grouping, ensuring every new conversation gets its own distinct thread while preserving existing thread functionality for message replies.

**Previous Enhancement**: Implemented comprehensive download zip functionality for order documents in customer portal My Orders page. Download zip feature is now available in both Active Orders and Order History tabs when invoices are uploaded by admin. The zip file contains all order-related documents including customer drawings, specifications, quote documents, purchase orders, quality check files, and invoices, organized by category folders. Enhanced existing backend endpoint to include invoices regardless of order status, allowing customers to download complete document packages as soon as invoices are available.

**Previous Enhancement**: Fixed critical customer numbering sequence bug that was generating CU0001, CU0011, CU0021 instead of sequential CU0001, CU0002, CU0003. Root cause was alphabetical string sorting vs numeric sorting in database queries. Implemented proper numeric extraction and comparison in `generateCustomerNumber()` function to ensure sequential customer numbering for new companies going forward.

**Previous Enhancement**: Added invoice viewing capability to customer portal order tables and removed non-functional 3D preview from RFQ submissions. Invoice buttons now appear in both active and archived orders when invoices are available, with proper URL handling to open PDFs in new browser tabs. Completely removed confusing "Converting..." messages and 3D preview functionality from STEP file uploads in RFQ submission, showing immediate "Ready" status instead.

**Previous Enhancement**: Implemented comprehensive unread message notification system across all three portals (customer, supplier, admin). Added real-time red notification dots beside "Messages" navigation items showing unread count (1-99 or "99+") with 30-second auto-refresh. System includes dedicated API endpoint `/api/messages/unread-count` and `useUnreadMessages` hook for seamless integration. Notification dots automatically appear/disappear based on unread message status, providing instant visual feedback for new messages across the platform.

**Previous Enhancement**: Completely redesigned supplier portal with modern sidebar navigation system, solving header overcrowding and logo distortion issues. Removed excessive margins across all portals (customer, supplier, admin) by eliminating max-width containers, ensuring full-width content utilization. The new supplier layout features a collapsible sidebar with proper logo display, user profile section, and clean top header showing current page context. This creates a more professional and space-efficient interface that matches modern web application standards.

**Previous Enhancement**: Reorganized admin portal tabs to fix organizational issues and streamline supplier workflow. Customer Management now exclusively shows customer-to-admin interactions (customer accounts, companies, customer RFQs, customer orders). Supplier Management now focuses on admin-to-supplier workflow: direct RFQ creation and sending to filtered suppliers, supplier quote management, and purchase orders. Removed the confusing "RFQ assignment" workflow in favor of clean supplier filtering and direct RFQ creation system that allows admins to filter suppliers by capabilities/location and create new RFQs to send to multiple selected suppliers.

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
- **Enhanced Company Management System**: Automatic company creation when users register with company name input, admin capabilities to edit company names for consistency, and streamlined user linking via dropdown selection. Users from the same company share customer numbers (CU0001, CU0002, etc.) and can view all orders, RFQs, and quotes for their organization, enabling seamless collaboration between purchasing managers, engineers, and directors.
- **Supplier Purchase Order Workflow**: Complete Accept/Reject functionality for suppliers with backend endpoints (PATCH /api/purchase-orders/:id/accept|reject), database operations, and frontend UI buttons. Pending purchase orders display green Accept and red Reject buttons with proper authentication, validation, and success/error notifications. Archive functionality properly separates completed orders into archived tabs across both supplier and admin portals.
- **Admin Manual Creation**: Comprehensive admin functionality for manually creating quotes and orders with customer search and selection capabilities.
- **Customer Management System**: Advanced admin interface for linking/unlinking users to customer IDs, managing company relationships, and viewing all users within a company.
- **Admin Workflow Enhancements**: Calendar-based date pickers, resizable columns for tables, comprehensive search and filtering, and explicit save actions for status updates.
- **Invoice Management System**: Integration for admin upload and customer viewing of invoices post-packing stage.
- **Quality Check System**: Admin notification system for quality checks, persistence of files and approval status, and a dedicated approval workflow.
- **UI/UX Decisions**: Professional manufacturing industry aesthetic with subtle gradient backgrounds and industrial themes for the customer portal; clean grey background for the admin portal. Enhanced header branding with rounded glass-morphism effects.
- **Authentication System**: JWT token-based authentication with role-based access control and email verification requirement for new user registrations.
- **Email Verification System**: Secure 6-digit code verification using SendGrid email service. New users must verify their email before accessing the portal. Admin users (vineeth@stone-flake.com) are auto-verified.
- **File Management**: Support for STEP and PDF file uploads, secure file storage, and linking to RFQs or orders.
- **RFQ and Order Workflow**: Comprehensive quoting system from "New" RFQ to "Quoted", customer "Accepted/Declined", and "Order Created" by admin from accepted quotes. Automated order creation is not in place; admin manually creates sales orders after purchase order submission.
- **3D File Visualization**: Enhanced STEP file preview system using xeokit SDK for high-quality 3D rendering. Backend converts STEP files to XKT format for optimized web viewing. Customers can preview uploaded STEP files in real-time during RFQ submission.

## External Dependencies

- **React Ecosystem**: React 18, React DOM, React Hook Form, React Query
- **Database**: Drizzle ORM, Neon PostgreSQL driver
- **UI Components**: Radix UI primitives, Lucide React icons
- **Styling**: TailwindCSS, class-variance-authority, clsx
- **Validation**: Zod schema validation
- **Build Tools**: Vite, TypeScript, ESBuild
- **File Handling**: Multer (for file uploads)
- **Authentication**: bcrypt (for password hashing)