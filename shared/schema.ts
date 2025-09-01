import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, decimal, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["customer", "supplier", "admin"]);
export const rfqStatusEnum = pgEnum("rfq_status", ["submitted", "quoted", "accepted", "declined", "sent_to_suppliers"]);
export const orderStatusEnum = pgEnum("order_status", [
  "waiting_for_po",
  "pending",
  "material_procurement", 
  "manufacturing",
  "finishing",
  "quality_check",
  "packing",
  "shipped",
  "delivered"
]);
export const fileTypeEnum = pgEnum("file_type", ["step", "pdf", "excel", "image", "quote"]);
export const linkedToTypeEnum = pgEnum("linked_to_type", ["rfq", "order", "quality_check", "supplier_quote"]);
export const notificationTypeEnum = pgEnum("notification_type", ["rfq_assignment", "status_update", "message", "order_confirmation"]);
export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", ["pending", "accepted", "in_progress", "shipped", "delivered", "cancelled", "completed", "archived"]);


// Companies table - Each company gets a unique company number
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey(),
  companyNumber: varchar("company_number").notNull().unique(), // CU0001 for customers, V0001 for suppliers
  companyType: varchar("company_type").default("customer"), // "customer" or "supplier"
  name: varchar("name").notNull(), // Official company name
  contactEmail: varchar("contact_email"), // Primary company contact email
  phone: varchar("phone"),
  address: text("address"),
  city: varchar("city"),
  state: varchar("state"),
  country: varchar("country").default("United States"),
  postalCode: varchar("postal_code"),
  website: varchar("website"),
  industry: varchar("industry"),
  notes: text("notes"), // Admin notes about the company
  createdAt: timestamp("created_at").defaultNow(),
});

// Users table - Users belong to companies and have roles
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name").notNull(),
  title: varchar("title"), // Job title like "Purchasing Manager", "Engineer"
  phone: varchar("phone"),
  companyId: varchar("company_id").references(() => companies.id), // Link to company
  companyNameInput: varchar("company_name_input"), // What user entered during signup (before admin links to actual company)
  role: userRoleEnum("role").default("customer"),
  isAdmin: boolean("is_admin").default(false), // Keep for backwards compatibility
  isVerified: boolean("is_verified").default(false),
  verificationCode: varchar("verification_code"),
  verificationCodeExpiry: timestamp("verification_code_expiry"),
  resetCode: varchar("reset_code"),
  resetCodeExpiry: timestamp("reset_code_expiry"),
  isAdminCreated: boolean("is_admin_created").default(false), // Track if account was created by admin
  mustResetPassword: boolean("must_reset_password").default(false), // Force password reset on first login
  // User identification
  userNumber: varchar("user_number"), // 100010, 100011, etc. for all users
  website: varchar("website"),
  certifications: text("certifications"), // JSON array of certifications
  capabilities: text("capabilities"), // JSON array of manufacturing capabilities
  finishingCapabilities: text("finishing_capabilities"), // JSON array of finishing capabilities
  address: text("address"),
  city: varchar("city"),
  state: varchar("state"),
  country: varchar("country").default("United States"),
  postalCode: varchar("postal_code"),
  // Enhanced supplier assessment fields
  yearEstablished: varchar("year_established"),
  numberOfEmployees: varchar("number_of_employees"),
  facilitySize: varchar("facility_size"),
  primaryIndustries: text("primary_industries"), // JSON array
  qualitySystem: varchar("quality_system"),
  leadTimeCapability: varchar("lead_time_capability"),
  minimumOrderQuantity: varchar("minimum_order_quantity"),
  maxPartSizeCapability: varchar("max_part_size_capability"),
  toleranceCapability: varchar("tolerance_capability"),
  emergencyCapability: boolean("emergency_capability").default(false),
  internationalShipping: boolean("international_shipping").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Unique constraint on email + role combination
  emailRoleUnique: sql`UNIQUE(${table.email}, ${table.role})`,
}));

// RFQs table
export const rfqs = pgTable("rfqs", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  projectName: varchar("project_name").notNull(),
  material: varchar("material").notNull(),
  materialGrade: varchar("material_grade"),
  finishing: varchar("finishing"),
  tolerance: varchar("tolerance").notNull(),
  quantity: integer("quantity").notNull(),
  notes: text("notes"),
  specialInstructions: text("special_instructions"),
  status: rfqStatusEnum("status").default("submitted"),
  // SQTE number for RFQs sent to suppliers (replaces referenceNumber)
  sqteNumber: varchar("sqte_number"), // e.g., "SQTE-001", "SQTE-002"
  // New fields for manufacturing process and international preference
  manufacturingProcess: varchar("manufacturing_process"), // e.g., "cnc_machining", "casting", etc.
  manufacturingSubprocess: varchar("manufacturing_subprocess"), // e.g., "sand_casting", "die_casting", etc.
  internationalManufacturingOk: boolean("international_manufacturing_ok").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Files table
export const files = pgTable("files", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  fileName: varchar("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  glbUrl: text("glb_url"), // GLB conversion for STEP files
  glbPath: text("glb_path"), // Server path to GLB file
  conversionStats: text("conversion_stats"), // JSON string with conversion statistics
  fileSize: integer("file_size").notNull(),
  fileType: fileTypeEnum("file_type").notNull(),
  linkedToType: linkedToTypeEnum("linked_to_type").notNull(),
  linkedToId: varchar("linked_to_id").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Sales quotes table
export const salesQuotes = pgTable("sales_quotes", {
  id: varchar("id").primaryKey(),
  rfqId: varchar("rfq_id").notNull().references(() => rfqs.id),
  quoteNumber: varchar("quote_number").notNull().unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default("USD"),
  validUntil: timestamp("valid_until").notNull(),
  estimatedDeliveryDate: timestamp("estimated_delivery_date"),
  quoteFileUrl: text("quote_file_url"),
  notes: text("notes"), // Admin's special instructions/notes
  status: text("status", { enum: ["pending", "accepted", "declined"] }).default("pending"),
  customerResponse: text("customer_response"),
  purchaseOrderUrl: text("purchase_order_url"),
  purchaseOrderNumber: varchar("purchase_order_number"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Sales orders table
export const salesOrders = pgTable("sales_orders", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  rfqId: varchar("rfq_id").notNull().references(() => rfqs.id),
  quoteId: varchar("quote_id").references(() => salesQuotes.id),
  orderNumber: varchar("order_number").notNull().unique(),
  projectName: varchar("project_name").notNull(),
  material: varchar("material").notNull(),
  materialGrade: varchar("material_grade"),
  finishing: varchar("finishing"),
  tolerance: varchar("tolerance").notNull(),
  quantity: integer("quantity").notNull(),
  quantityShipped: integer("quantity_shipped").default(0),
  quantityRemaining: integer("quantity_remaining").notNull().default(0),
  notes: text("notes"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default("USD"),
  orderStatus: orderStatusEnum("order_status").default("pending"),
  paymentStatus: text("payment_status").$type<"unpaid" | "paid">().default("unpaid"),
  isArchived: boolean("is_archived").default(false),
  orderDate: timestamp("order_date").defaultNow(),
  estimatedCompletion: timestamp("estimated_completion"),
  trackingNumber: varchar("tracking_number"),
  shippingCarrier: varchar("shipping_carrier"),
  invoiceUrl: text("invoice_url"),
  archivedAt: timestamp("archived_at"),
  // Quality check inspection fields
  qualityCheckStatus: text("quality_check_status").$type<"pending" | "approved" | "needs_revision">().default("pending"),
  qualityCheckNotes: text("quality_check_notes"),
  customerApprovedAt: timestamp("customer_approved_at"),
  // Customer purchase order number (what customer calls this order internally)
  customerPurchaseOrderNumber: varchar("customer_purchase_order_number"),
});

// Sales invoices table
export const salesInvoices = pgTable("sales_invoices", {
  id: varchar("id").primaryKey(),
  orderId: varchar("order_id").notNull().references(() => salesOrders.id),
  invoiceNumber: varchar("invoice_number").notNull().unique(),
  amountDue: decimal("amount_due", { precision: 10, scale: 2 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).default("0"),
  dueDate: timestamp("due_date").notNull(),
  isPaid: boolean("is_paid").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Shipments table for tracking multiple partial deliveries
export const shipments = pgTable("shipments", {
  id: varchar("id").primaryKey(),
  orderId: varchar("order_id").notNull().references(() => salesOrders.id, { onDelete: 'cascade' }),
  quantityShipped: integer("quantity_shipped").notNull(),
  trackingNumber: varchar("tracking_number"),
  shippingCarrier: varchar("shipping_carrier"),
  shipmentDate: timestamp("shipment_date").notNull().defaultNow(),
  deliveryDate: timestamp("delivery_date"),
  // Independent tracking status for each shipment branch
  trackingStatus: text("tracking_status").notNull().default("material_procurement"), // material_procurement, manufacturing, finishing, quality_check, packing, shipped, delivered
  status: text("status").notNull().default("shipped"), // shipped, delivered (legacy, keeping for compatibility)
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Supplier quotes table - Quotes submitted by suppliers for RFQs
export const supplierQuotes = pgTable("supplier_quotes", {
  id: varchar("id").primaryKey(),
  rfqId: varchar("rfq_id").notNull().references(() => rfqs.id),
  supplierId: varchar("supplier_id").notNull().references(() => users.id),
  sqteNumber: varchar("sqte_number"), // Reference to the SQTE number from RFQ
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  leadTime: integer("lead_time").notNull(), // in days
  notes: text("notes"),
  quoteFileUrl: text("quote_file_url"),
  status: text("status", { enum: ["pending", "accepted", "not_selected"] }).default("pending"),
  // Enhanced pricing breakdown fields
  currency: varchar("currency").default("USD"), // USD, EUR, CAD, etc.
  toolingCost: decimal("tooling_cost", { precision: 10, scale: 2 }), // One-time tooling/setup cost
  partCostPerPiece: decimal("part_cost_per_piece", { precision: 10, scale: 2 }), // Cost per individual part
  materialCostPerPiece: decimal("material_cost_per_piece", { precision: 10, scale: 2 }), // Material cost per part
  machiningCostPerPiece: decimal("machining_cost_per_piece", { precision: 10, scale: 2 }), // Machining/processing cost per part
  finishingCostPerPiece: decimal("finishing_cost_per_piece", { precision: 10, scale: 2 }), // Finishing cost per part
  packagingCostPerPiece: decimal("packaging_cost_per_piece", { precision: 10, scale: 2 }), // Packaging cost per part
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }), // Total shipping cost
  taxPercentage: decimal("tax_percentage", { precision: 5, scale: 2 }), // Tax percentage (e.g., 8.25 for 8.25%)
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }), // Calculated tax amount
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }), // Discount percentage if any
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }), // Discount amount
  totalBeforeTax: decimal("total_before_tax", { precision: 10, scale: 2 }), // Subtotal before tax
  totalAfterTax: decimal("total_after_tax", { precision: 10, scale: 2 }), // Final total including tax
  validUntil: timestamp("valid_until"), // Quote validity date
  paymentTerms: varchar("payment_terms"), // e.g., "Net 30", "50% upfront", etc.
  submittedAt: timestamp("submitted_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
  adminFeedback: text("admin_feedback"), // Admin comment when not selecting a quote
});

// RFQ assignments table - Links RFQs to suppliers
export const rfqAssignments = pgTable("rfq_assignments", {
  id: varchar("id").primaryKey(),
  rfqId: varchar("rfq_id").notNull().references(() => rfqs.id),
  supplierId: varchar("supplier_id").notNull().references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
  status: text("status", { enum: ["assigned", "quoted", "expired"] }).default("assigned"),
});

// Notifications table - System notifications for suppliers and admins
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  relatedId: varchar("related_id"), // RFQ ID, Order ID, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Purchase Orders table - Orders placed by admin to suppliers
export const purchaseOrders = pgTable("purchase_orders", {
  id: varchar("id").primaryKey(),
  orderNumber: varchar("order_number").notNull().unique(), // PO-YYNNN format
  supplierQuoteId: varchar("supplier_quote_id").references(() => supplierQuotes.id),
  supplierId: varchar("supplier_id").notNull().references(() => users.id),
  rfqId: varchar("rfq_id").references(() => rfqs.id),
  status: purchaseOrderStatusEnum("status").default("pending"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  deliveryDate: timestamp("delivery_date"),
  notes: text("notes"),
  poFileUrl: text("po_file_url"), // URL to uploaded PO PDF file
  supplierInvoiceUrl: text("supplier_invoice_url"), // URL to supplier uploaded invoice
  invoiceUploadedAt: timestamp("invoice_uploaded_at"),
  paymentCompletedAt: timestamp("payment_completed_at"),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
});

// Messages table - Communication between admin and suppliers with file attachments
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey(),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  receiverId: varchar("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  relatedType: varchar("related_type"), // 'purchase_order', 'rfq', 'general'
  relatedId: varchar("related_id"),
  threadId: varchar("thread_id"), // Generated based on users + category for separate conversations
  category: varchar("category").default("general"), // billing, support, technical, general, etc.
  subject: varchar("subject"), // Optional subject line for the thread
  emailNotificationSent: boolean("email_notification_sent").default(false),
  emailNotificationSentAt: timestamp("email_notification_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Message Attachments table - Files attached to messages
export const messageAttachments = pgTable("message_attachments", {
  id: varchar("id").primaryKey(),
  messageId: varchar("message_id").notNull().references(() => messages.id, { onDelete: 'cascade' }),
  fileName: varchar("file_name").notNull(),
  originalName: varchar("original_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type").notNull(),
  filePath: text("file_path").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  rfqs: many(rfqs),
  files: many(files),
  orders: many(salesOrders),
  supplierQuotes: many(supplierQuotes),
  rfqAssignments: many(rfqAssignments),
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
  notifications: many(notifications),
  purchaseOrders: many(purchaseOrders),
}));

export const rfqsRelations = relations(rfqs, ({ one, many }) => ({
  user: one(users, {
    fields: [rfqs.userId],
    references: [users.id],
  }),
  files: many(files),
  quote: one(salesQuotes),
  order: one(salesOrders),
  supplierQuotes: many(supplierQuotes),
  assignments: many(rfqAssignments),
}));

export const filesRelations = relations(files, ({ one }) => ({
  user: one(users, {
    fields: [files.userId],
    references: [users.id],
  }),
}));

export const salesQuotesRelations = relations(salesQuotes, ({ one }) => ({
  rfq: one(rfqs, {
    fields: [salesQuotes.rfqId],
    references: [rfqs.id],
  }),
}));

export const salesOrdersRelations = relations(salesOrders, ({ one, many }) => ({
  user: one(users, {
    fields: [salesOrders.userId],
    references: [users.id],
  }),
  rfq: one(rfqs, {
    fields: [salesOrders.rfqId],
    references: [rfqs.id],
  }),
  quote: one(salesQuotes, {
    fields: [salesOrders.quoteId],
    references: [salesQuotes.id],
  }),
  invoice: one(salesInvoices),
  shipments: many(shipments),
}));

export const salesInvoicesRelations = relations(salesInvoices, ({ one }) => ({
  order: one(salesOrders, {
    fields: [salesInvoices.orderId],
    references: [salesOrders.id],
  }),
}));

export const shipmentsRelations = relations(shipments, ({ one }) => ({
  order: one(salesOrders, {
    fields: [shipments.orderId],
    references: [salesOrders.id],
  }),
}));

export const supplierQuotesRelations = relations(supplierQuotes, ({ one }) => ({
  rfq: one(rfqs, {
    fields: [supplierQuotes.rfqId],
    references: [rfqs.id],
  }),
  supplier: one(users, {
    fields: [supplierQuotes.supplierId],
    references: [users.id],
  }),
}));

export const rfqAssignmentsRelations = relations(rfqAssignments, ({ one }) => ({
  rfq: one(rfqs, {
    fields: [rfqAssignments.rfqId],
    references: [rfqs.id],
  }),
  supplier: one(users, {
    fields: [rfqAssignments.supplierId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one }) => ({
  supplier: one(users, {
    fields: [purchaseOrders.supplierId],
    references: [users.id],
  }),
  supplierQuote: one(supplierQuotes, {
    fields: [purchaseOrders.supplierQuoteId],
    references: [supplierQuotes.id],
  }),
  rfq: one(rfqs, {
    fields: [purchaseOrders.rfqId],
    references: [rfqs.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sentMessages",
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receivedMessages",
  }),
  attachments: many(messageAttachments),
}));

export const messageAttachmentsRelations = relations(messageAttachments, ({ one }) => ({
  message: one(messages, {
    fields: [messageAttachments.messageId],
    references: [messages.id],
  }),
}));

// Insert schemas
export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertRfqSchema = createInsertSchema(rfqs).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  uploadedAt: true,
});

export const insertSalesQuoteSchema = createInsertSchema(salesQuotes).omit({
  id: true,
  createdAt: true,
});

export const insertSalesOrderSchema = createInsertSchema(salesOrders).omit({
  id: true,
  orderDate: true,
});

export const insertSalesInvoiceSchema = createInsertSchema(salesInvoices).omit({
  id: true,
  createdAt: true,
});

export const insertShipmentSchema = createInsertSchema(shipments).omit({
  id: true,
  createdAt: true,
  shipmentDate: true,
});

export const insertSupplierQuoteSchema = createInsertSchema(supplierQuotes).omit({
  id: true,
  submittedAt: true,
  sqteNumber: true, // This will be auto-populated from RFQ
});

export const insertRfqAssignmentSchema = createInsertSchema(rfqAssignments).omit({
  id: true,
  assignedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
});

export const insertMessageAttachmentSchema = createInsertSchema(messageAttachments).omit({
  id: true,
  uploadedAt: true,
});

// Types with backward compatibility
export type Company = typeof companies.$inferSelect & {
  customerNumber?: string; // For backward compatibility - maps to companyNumber
};
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type RFQ = typeof rfqs.$inferSelect;
export type InsertRFQ = z.infer<typeof insertRfqSchema>;
export type File = typeof files.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;
export type SalesQuote = typeof salesQuotes.$inferSelect;
export type InsertSalesQuote = z.infer<typeof insertSalesQuoteSchema>;
export type SalesOrder = typeof salesOrders.$inferSelect;
export type InsertSalesOrder = z.infer<typeof insertSalesOrderSchema>;
export type SalesInvoice = typeof salesInvoices.$inferSelect;
export type InsertSalesInvoice = z.infer<typeof insertSalesInvoiceSchema>;
export type Shipment = typeof shipments.$inferSelect;
export type InsertShipment = z.infer<typeof insertShipmentSchema>;
export type SupplierQuote = typeof supplierQuotes.$inferSelect;
export type InsertSupplierQuote = z.infer<typeof insertSupplierQuoteSchema>;
export type RfqAssignment = typeof rfqAssignments.$inferSelect;
export type InsertRfqAssignment = z.infer<typeof insertRfqAssignmentSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type MessageAttachment = typeof messageAttachments.$inferSelect;
export type InsertMessageAttachment = z.infer<typeof insertMessageAttachmentSchema>;

