import { randomUUID } from 'crypto';
import {
  companies,
  users,
  rfqs,
  files,
  salesQuotes,
  salesOrders,
  salesInvoices,
  shipments,
  supplierQuotes,
  rfqAssignments,
  notifications,
  messages,
  purchaseOrders,
  messageAttachments,
  type Company,
  type InsertCompany,
  type User,
  type InsertUser,
  type RFQ,
  type InsertRFQ,
  type File,
  type InsertFile,
  type SalesQuote,
  type InsertSalesQuote,
  type SalesOrder,
  type InsertSalesOrder,
  type SalesInvoice,
  type InsertSalesInvoice,
  type Shipment,
  type InsertShipment,
  type SupplierQuote,
  type InsertSupplierQuote,
  type RfqAssignment,
  type InsertRfqAssignment,
  type Notification,
  type InsertNotification,
  type Message,
  type InsertMessage,
  type PurchaseOrder,
  type InsertPurchaseOrder,
  type MessageAttachment,
  type InsertMessageAttachment,
} from "@shared/schema";
import { 
  generateCustomerNumber,
  generateSupplierNumber,
  generateSalesQuoteNumber,
  generateSalesOrderNumber,
  generatePurchaseOrderNumber
} from "@shared/utils";
import { db } from "./db";
import { eq, desc, and, or, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // Company operations
  getCompanyById(id: string): Promise<Company | undefined>;
  getCompanyByCustomerNumber(customerNumber: string): Promise<Company | undefined>;
  getAllCompanies(): Promise<Company[]>;
  getCompaniesCount(): Promise<number>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, company: Partial<InsertCompany>): Promise<void>;
  generateCustomerNumber(): Promise<string>;
  generateCompanyNumber(companyType: "customer" | "supplier"): Promise<string>;
  generateUserNumber(): Promise<string>;
  assignCustomerNumber(companyId: string, customerNumber: string): Promise<void>;
  isCustomerNumberAvailable(customerNumber: string): Promise<boolean>;
  searchCompanies(query: string): Promise<Company[]>;
  mergeCompanies(primaryCompanyId: string, companyIdsToMerge: string[], customerNumber: string, companyName: string): Promise<void>;

  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByEmailAndRole(email: string, role: string): Promise<User | undefined>;
  getAllCustomers(): Promise<(User & { company?: Company })[]>;
  searchCustomers(query: string): Promise<(User & { company?: Company })[]>;
  createUser(user: InsertUser): Promise<User>;
  createAdminUser(user: InsertUser): Promise<User>; // Create user by admin with temp password
  deleteUser(id: string): Promise<boolean>;
  resetAdminCreatedUserPassword(userId: string, newPasswordHash: string): Promise<void>; // Reset password for admin-created accounts
  clearMustResetPassword(userId: string): Promise<void>; // Clear the must reset flag after successful reset
  updateUserVerificationCode(email: string, verificationCode: string, expiry: Date): Promise<void>;
  updateUserVerificationStatus(email: string, isVerified: boolean): Promise<void>;
  verifyUserEmail(email: string, verificationCode: string): Promise<boolean>;
  updateUserResetCode(email: string, role: string, resetCode: string, expiry: Date): Promise<void>;
  verifyResetCode(email: string, role: string, resetCode: string): Promise<boolean>;
  resetForgottenPassword(email: string, role: string, newPasswordHash: string): Promise<void>;
  linkUserToCompany(userId: string, companyId: string): Promise<void>;
  unlinkUserFromCompany(userId: string): Promise<void>;
  getUsersByCompanyId(companyId: string): Promise<User[]>;
  updateUserProfile(userId: string, profileData: Partial<InsertUser>): Promise<boolean>;

  // RFQ operations
  getRFQById(id: string): Promise<RFQ | undefined>;
  getRFQsByUserId(userId: string): Promise<RFQ[]>;
  getRFQsByCustomerNumber(customerNumber: string): Promise<RFQ[]>;
  getAllRFQs(): Promise<(RFQ & { user: User })[]>;
  createRFQ(rfq: InsertRFQ): Promise<RFQ>;
  updateRFQStatus(id: string, status: string): Promise<void>;

  // File operations
  getFileById(id: string): Promise<File | undefined>;
  getFilesByRFQId(rfqId: string): Promise<File[]>;
  getFilesByUserId(userId: string): Promise<File[]>;
  getFilesByLinkedId(linkedToId: string, linkedToType: string): Promise<File[]>;
  getFileByPath(filePath: string): Promise<File | undefined>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: string, updateData: Partial<InsertFile>): Promise<void>;
  deleteFile(id: string): Promise<void>;

  // Sales quote operations
  getQuoteByRFQId(rfqId: string): Promise<SalesQuote | undefined>;
  getQuoteById(quoteId: string): Promise<SalesQuote | undefined>;
  createQuote(quote: InsertSalesQuote): Promise<SalesQuote>;
  updateQuote(id: string, quote: Partial<InsertSalesQuote>): Promise<void>;
  respondToQuote(rfqId: string, status: 'accepted' | 'declined', response?: string, purchaseOrderUrl?: string): Promise<void>;

  // Sales order operations
  getOrderById(id: string): Promise<SalesOrder | undefined>;
  getOrderByRFQId(rfqId: string): Promise<SalesOrder | undefined>;
  getOrdersByUserId(userId: string): Promise<(SalesOrder & { rfq: RFQ; quote?: SalesQuote })[]>;
  getOrdersByCustomerNumber(customerNumber: string): Promise<(SalesOrder & { rfq: RFQ; quote?: SalesQuote })[]>;
  getAllOrders(): Promise<(SalesOrder & { user: User; rfq: RFQ; quote?: SalesQuote })[]>;
  getArchivedOrders(): Promise<(SalesOrder & { user: User; rfq: RFQ; quote?: SalesQuote })[]>;
  createOrder(order: InsertSalesOrder): Promise<SalesOrder>;
  updateOrderStatus(id: string, status: string): Promise<void>;
  updateOrderPaymentStatus(id: string, paymentStatus: 'paid' | 'unpaid'): Promise<void>;
  updateOrderInvoice(id: string, invoiceUrl: string): Promise<void>;
  updateOrderQuantities(id: string, quantityShipped: number): Promise<void>;
  archiveOrder(id: string): Promise<void>;

  // Sales invoice operations
  getInvoiceByOrderId(orderId: string): Promise<SalesInvoice | undefined>;
  createInvoice(invoice: InsertSalesInvoice): Promise<SalesInvoice>;
  updateInvoicePaidStatus(id: string, isPaid: boolean): Promise<void>;

  // Quality check operations
  getQualityCheckFiles(orderId: string): Promise<File[]>;
  deleteQualityCheckFile(fileId: string): Promise<boolean>;
  updateQualityCheckApproval(orderId: string, qualityCheckStatus: string, notes?: string): Promise<void>;
  approveQualityCheck(orderId: string, notes?: string): Promise<void>;
  getQualityCheckNotifications(): Promise<any[]>;

  // Get all customers with company information
  getBusinessReports(): Promise<any[]>;

  // Company operations
  getAllCompanies(): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, company: Partial<InsertCompany>): Promise<void>;
  deleteCompany(id: string): Promise<void>;
  
  // Additional operations
  getQuotesByUserId(userId: string): Promise<SalesQuote[]>;
  createShipment(shipment: InsertShipment): Promise<Shipment>;
  getShipmentsByOrderId(orderId: string): Promise<Shipment[]>;
  updateShipmentTrackingStatus(shipmentId: string, trackingStatus: string): Promise<Shipment>;

  // Supplier operations
  getAllSuppliers(): Promise<User[]>;
  getSupplierById(id: string): Promise<User | undefined>;
  updateSupplierProfile(id: string, data: Partial<InsertUser>): Promise<void>;



  // Supplier quote operations
  getSupplierQuotesByRfqId(rfqId: string): Promise<(SupplierQuote & { supplier: User })[]>;
  getSupplierQuotesBySupplierId(supplierId: string): Promise<(SupplierQuote & { rfq: RFQ })[]>;
  createSupplierQuote(quote: InsertSupplierQuote): Promise<SupplierQuote>;
  updateSupplierQuoteStatus(id: string, status: 'accepted' | 'rejected'): Promise<void>;

  // RFQ assignment operations
  assignRfqToSuppliers(rfqId: string, supplierIds: string[]): Promise<void>;
  getAssignedRfqsBySupplierId(supplierId: string): Promise<(RfqAssignment & { rfq: RFQ & { files: File[] } })[]>;
  updateRfqAssignmentStatus(rfqId: string, supplierId: string, status: 'quoted' | 'expired'): Promise<void>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUserId(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;

  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesBetweenUsers(userId1: string, userId2: string): Promise<(Message & { sender: User; receiver: User; attachments: MessageAttachment[] })[]>;
  getMessagesByUserId(userId: string): Promise<(Message & { sender: User; receiver: User })[]>;
  getAllMessagesForUser(userId: string): Promise<(Message & { sender: User; receiver: User })[]>;
  getMessageThreads(userId: string): Promise<Array<{ threadId: string; subject: string; category: string; otherUser: User; lastMessage: Message; unreadCount: number }>>;
  getMessagesByThreadId(threadId: string): Promise<(Message & { sender: User; receiver: User; attachments: MessageAttachment[] })[]>;
  generateThreadId(userId1: string, userId2: string, category: string): string;
  findExistingThread(userId1: string, userId2: string): Promise<string | null>;
  markMessageAsRead(id: string): Promise<void>;
  markMessagesAsRead(fromUserId: string, toUserId: string): Promise<void>;
  markThreadAsRead(threadId: string, userId: string): Promise<void>;
  
  // Message attachment operations
  createMessageAttachment(attachment: InsertMessageAttachment): Promise<MessageAttachment>;
  getMessageAttachments(messageId: string): Promise<MessageAttachment[]>;
  
  // Admin operations
  getAllUsersForAdmin(): Promise<Array<{
    id: string;
    name: string;
    email: string;
    role: 'customer' | 'supplier';
    customerNumber?: string;
    userNumber?: string;
    company?: string;
  }>>;
  
  // Purchase Order operations
  createPurchaseOrder(purchaseOrder: InsertPurchaseOrder): Promise<PurchaseOrder>;
  getPurchaseOrderById(id: string): Promise<PurchaseOrder | undefined>;
  getAllPurchaseOrders(): Promise<(PurchaseOrder & { supplier: User; rfq?: RFQ; supplierQuote?: SupplierQuote })[]>;
  getPurchaseOrdersBySupplierId(supplierId: string): Promise<(PurchaseOrder & { supplier: User; rfq: RFQ; supplierQuote: SupplierQuote })[]>;
  updatePurchaseOrderStatus(id: string, status: string): Promise<void>;
  updatePurchaseOrder(id: string, updates: Partial<PurchaseOrder>): Promise<void>;
  acceptPurchaseOrder(id: string): Promise<void>;
  generatePurchaseOrderNumber(): Promise<string>;
}

export class DatabaseStorage implements IStorage {
  // Company operations
  async getCompanyById(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async getCompanyByCustomerNumber(customerNumber: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.companyNumber, customerNumber));
    return company;
  }

  async getAllCompanies(): Promise<Company[]> {
    const result = await db.select().from(companies).orderBy(desc(companies.createdAt));
    // Add backward compatibility mapping
    return result.map(company => ({
      ...company,
      customerNumber: company.companyNumber // For backward compatibility
    }));
  }

  async getCompaniesCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(companies);
    return result.count;
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    if (!insertCompany.companyNumber) {
      const companyType = insertCompany.companyType || "customer";
      insertCompany.companyNumber = await this.generateCompanyNumber(companyType);
    }
    
    // Generate UUID for the id field
    const companyWithId = {
      ...insertCompany,
      id: randomUUID()
    };
    
    const [company] = await db.insert(companies).values(companyWithId).returning();
    return company;
  }

  async updateCompany(id: string, company: Partial<InsertCompany>): Promise<void> {
    await db.update(companies).set(company).where(eq(companies.id, id));
  }

  async deleteCompany(id: string): Promise<void> {
    // First unlink all users from this company
    await db.update(users).set({ companyId: null }).where(eq(users.companyId, id));
    
    // Then delete the company
    await db.delete(companies).where(eq(companies.id, id));
  }

  async searchCompanies(query: string): Promise<Company[]> {
    return await db
      .select()
      .from(companies)
      .where(
        or(
          sql`lower(${companies.name}) like lower(${'%' + query + '%'})`,
          sql`lower(${companies.companyNumber}) like lower(${'%' + query + '%'})`,
          sql`lower(${companies.contactEmail}) like lower(${'%' + query + '%'})`
        )
      );
  }

  async generateCustomerNumber(): Promise<string> {
    return this.generateCompanyNumber("customer");
  }

  async generateCompanyNumber(companyType: "customer" | "supplier"): Promise<string> {
    const prefix = companyType === "customer" ? "CU" : "V";
    
    try {
      // Simplified approach - get all companies and filter in memory
      const allCompanies = await db.select().from(companies);
      
      let maxNumber = 0;
      for (const company of allCompanies) {
        if (company.companyNumber && company.companyNumber.startsWith(prefix)) {
          const match = company.companyNumber.match(new RegExp(`${prefix}(\\d+)`));
          if (match) {
            const num = parseInt(match[1]);
            if (num > maxNumber) {
              maxNumber = num;
            }
          }
        }
      }

      const nextNumber = maxNumber + 1;
      return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating company number:', error);
      // Fallback to simple sequence
      return `${prefix}0001`;
    }
  }

  async generateUserNumber(): Promise<string> {
    // Get all user numbers to find the highest numeric value
    const allUsers = await db
      .select({ userNumber: users.userNumber })
      .from(users)
      .where(sql`${users.userNumber} IS NOT NULL`);

    if (!allUsers || allUsers.length === 0) {
      return "100010";
    }

    // Extract numeric parts and find the maximum
    let maxNumber = 100009; // Start from 100009 so next will be 100010
    for (const user of allUsers) {
      const num = parseInt(user.userNumber || "0");
      if (num > maxNumber) {
        maxNumber = num;
      }
    }

    const nextNumber = maxNumber + 1;
    return nextNumber.toString();
  }

  async assignCustomerNumber(companyId: string, customerNumber: string): Promise<void> {
    await db.update(companies)
      .set({ companyNumber: customerNumber })
      .where(eq(companies.id, companyId));
  }

  async isCustomerNumberAvailable(customerNumber: string): Promise<boolean> {
    const [existingCompany] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.companyNumber, customerNumber))
      .limit(1);
    
    return !existingCompany;
  }

  async mergeCompanies(primaryCompanyId: string, companyIdsToMerge: string[], customerNumber: string, companyName: string): Promise<void> {
    // Update the primary company with the new name and company number
    await db.update(companies)
      .set({ 
        name: companyName, 
        companyNumber: customerNumber 
      })
      .where(eq(companies.id, primaryCompanyId));

    // Get all users from companies to be merged
    const allCompanyIds = [primaryCompanyId, ...companyIdsToMerge];
    
    // Move all users to the primary company
    await db.update(users)
      .set({ companyId: primaryCompanyId })
      .where(inArray(users.companyId, allCompanyIds));

    // Delete the other companies (not the primary one)
    if (companyIdsToMerge.length > 0) {
      await db.delete(companies)
        .where(inArray(companies.id, companyIdsToMerge));
    }
  }

  async getCompaniesByType(companyType: string): Promise<Array<Company & { userCount: number }>> {
    const result = await db
      .select({
        id: companies.id,
        companyNumber: companies.companyNumber,
        companyType: companies.companyType,
        name: companies.name,
        contactEmail: companies.contactEmail,
        phone: companies.phone,
        address: companies.address,
        city: companies.city,
        state: companies.state,
        country: companies.country,
        postalCode: companies.postalCode,
        website: companies.website,
        industry: companies.industry,
        notes: companies.notes,
        createdAt: companies.createdAt,
        userCount: sql<number>`COUNT(${users.id})`
      })
      .from(companies)
      .leftJoin(users, eq(users.companyId, companies.id))
      .where(eq(companies.companyType, companyType))
      .groupBy(companies.id)
      .orderBy(desc(companies.createdAt));

    return result;
  }

  async isVendorNumberAvailable(vendorNumber: string): Promise<boolean> {
    const [existingCompany] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.companyNumber, vendorNumber))
      .limit(1);
    
    return !existingCompany;
  }

  async assignVendorNumber(companyId: string, vendorNumber: string): Promise<void> {
    await db.update(companies)
      .set({ companyNumber: vendorNumber })
      .where(eq(companies.id, companyId));
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByEmailAndRole(email: string, role: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      and(eq(users.email, email), eq(users.role, role as any))
    );
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Generate user number for all users
    if (!insertUser.userNumber) {
      insertUser.userNumber = await this.generateUserNumber();
    }
    
    // Generate UUID for the id field
    const userWithId = {
      ...insertUser,
      id: randomUUID()
    };
    
    const [user] = await db.insert(users).values(userWithId).returning();
    return user;
  }

  async createAdminUser(insertUser: InsertUser): Promise<User> {
    // Mark as admin-created and require password reset
    insertUser.isAdminCreated = true;
    insertUser.mustResetPassword = true;
    insertUser.isVerified = true; // Admin-created accounts are pre-verified

    // Generate user number for all users
    if (!insertUser.userNumber) {
      insertUser.userNumber = await this.generateUserNumber();
    }
    
    // Generate UUID for the id field
    const userWithId = {
      ...insertUser,
      id: randomUUID()
    };
    
    const [user] = await db.insert(users).values(userWithId).returning();
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount! > 0;
  }

  async resetAdminCreatedUserPassword(userId: string, newPasswordHash: string): Promise<void> {
    console.log('🔧 Storage: ENHANCED resetAdminCreatedUserPassword called for userId:', userId);
    console.log('🔧 Storage: New password hash preview:', newPasswordHash.substring(0, 20) + '...');
    
    try {
      // Use a VERY explicit direct SQL approach to ensure it works
      const rawResult = await db.execute(sql`
        UPDATE users 
        SET password_hash = ${newPasswordHash}, must_reset_password = false 
        WHERE id = ${userId}
      `);
      console.log('✅ Storage: ENHANCED Raw SQL update result:', rawResult.rowCount, 'rows affected');
      
    } catch (error) {
      console.error('❌ Storage: ENHANCED Password reset error:', error);
      throw error;
    }
    
    // Always verify the update worked
    const [updatedUser] = await db.select({ 
      id: users.id, 
      mustResetPassword: users.mustResetPassword,
      passwordHash: users.passwordHash
    }).from(users).where(eq(users.id, userId));
    console.log('🔍 Storage: ENHANCED After update - mustResetPassword:', updatedUser?.mustResetPassword);
    console.log('🔍 Storage: ENHANCED Password hash updated to:', updatedUser?.passwordHash?.substring(0, 20) + '...');
    
    // If it's still true, force it with a separate update
    if (updatedUser?.mustResetPassword) {
      console.log('⚠️ Storage: ENHANCED Flag still true, forcing separate update...');
      await this.clearMustResetPassword(userId);
      const [finalUser] = await db.select({ 
        mustResetPassword: users.mustResetPassword 
      }).from(users).where(eq(users.id, userId));
      console.log('🔍 Storage: ENHANCED After forced clear - mustResetPassword:', finalUser?.mustResetPassword);
    }
  }

  async clearMustResetPassword(userId: string): Promise<void> {
    console.log('🔧 Storage: Explicitly clearing mustResetPassword for userId:', userId);
    const result = await db.update(users)
      .set({ mustResetPassword: false })
      .where(eq(users.id, userId));
    console.log('✅ Storage: Clear flag result:', result.rowCount, 'rows affected');
  }

  async linkUserToCompany(userId: string, companyId: string): Promise<void> {
    await db.update(users).set({ companyId }).where(eq(users.id, userId));
  }

  async unlinkUserFromCompany(userId: string): Promise<void> {
    await db.update(users).set({ companyId: null }).where(eq(users.id, userId));
  }

  async getUsersByCompanyId(companyId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.companyId, companyId));
  }

  async getSupplierCompanyUsers(supplierId: string): Promise<User[]> {
    // Get the supplier's company
    const supplier = await this.getUser(supplierId);
    if (!supplier || !supplier.companyId) {
      return [supplier].filter(Boolean); // Return just the supplier if no company
    }

    // Get all users from the same company with supplier role
    return await db
      .select()
      .from(users)
      .where(and(
        eq(users.companyId, supplier.companyId),
        eq(users.role, 'supplier')
      ));
  }

  async updateUserProfile(userId: string, profileData: Partial<InsertUser>): Promise<boolean> {
    try {
      const result = await db.update(users)
        .set(profileData)
        .where(eq(users.id, userId));
      
      return true;
    } catch (error) {
      console.error('Update user profile error:', error);
      return false;
    }
  }

  async getUsersByCustomerNumber(customerNumber: string): Promise<User[]> {
    // Find the company with this customer number
    const company = await this.getCompanyByCustomerNumber(customerNumber);
    if (!company) {
      console.log(`[DEBUG] No company found for customer number: ${customerNumber}`);
      return [];
    }
    
    // Return all users linked to this company
    const companyUsers = await this.getUsersByCompanyId(company.id);
    console.log(`[DEBUG] Found ${companyUsers.length} users for company ${company.name} (${customerNumber})`);
    return companyUsers;
  }

  async updateUserVerificationCode(email: string, verificationCode: string, expiry: Date): Promise<void> {
    // Update the most recently created unverified user with this email
    const [user] = await db.select().from(users)
      .where(and(eq(users.email, email), eq(users.isVerified, false)))
      .orderBy(desc(users.createdAt))
      .limit(1);
    
    if (user) {
      await db.update(users)
        .set({ 
          verificationCode, 
          verificationCodeExpiry: expiry 
        })
        .where(eq(users.id, user.id));
    }
  }

  async verifyUserEmail(email: string, verificationCode: string): Promise<boolean> {
    // Get all users with this email (could be customer and supplier)
    const users_found = await db.select().from(users).where(eq(users.email, email));
    
    // Try to verify any user with matching code that hasn't expired
    const now = new Date();
    for (const user of users_found) {
      if (user.verificationCode && user.verificationCodeExpiry && 
          user.verificationCode === verificationCode && user.verificationCodeExpiry > now) {
        // Mark this user as verified and clear verification code
        await db.update(users)
          .set({ 
            isVerified: true, 
            verificationCode: null, 
            verificationCodeExpiry: null 
          })
          .where(eq(users.id, user.id));
        return true;
      }
    }

    return false;
  }

  async updateUserVerificationStatus(email: string, isVerified: boolean): Promise<void> {
    // Update the most recently created user with this email
    const [user] = await db.select().from(users)
      .where(eq(users.email, email))
      .orderBy(desc(users.createdAt))
      .limit(1);
    
    if (user) {
      await db.update(users)
        .set({ 
          isVerified,
          verificationCode: isVerified ? null : undefined,
          verificationCodeExpiry: isVerified ? null : undefined
        })
        .where(eq(users.id, user.id));
    }
  }

  async updateUserResetCode(email: string, role: string, resetCode: string, expiry: Date): Promise<void> {
    await db.update(users)
      .set({ resetCode, resetCodeExpiry: expiry })
      .where(and(eq(users.email, email), eq(users.role, role as any)));
  }

  async verifyResetCode(email: string, role: string, resetCode: string): Promise<boolean> {
    const [user] = await db.select().from(users)
      .where(and(
        eq(users.email, email), 
        eq(users.role, role as any),
        eq(users.resetCode, resetCode)
      ));
    
    if (!user || !user.resetCodeExpiry) return false;
    
    const now = new Date();
    return user.resetCodeExpiry > now;
  }

  async resetForgottenPassword(email: string, role: string, newPasswordHash: string): Promise<void> {
    await db.update(users)
      .set({ 
        passwordHash: newPasswordHash,
        resetCode: null,
        resetCodeExpiry: null,
        mustResetPassword: false // Clear the flag so they can use their new password
      })
      .where(and(eq(users.email, email), eq(users.role, role as any)));
  }

  // Get the effective customer number for a user through their company
  async getEffectiveCustomerNumber(userId: string): Promise<string | null> {
    const user = await this.getUser(userId);
    if (!user || !user.companyId) return null;
    
    const company = await this.getCompanyById(user.companyId);
    return company?.companyNumber || null;
  }

  // Generate SQTE number for RFQs (replaces reference number)
  async generateSqteNumber(): Promise<string> {
    // Get the latest SQTE number
    const latestRfq = await db.select().from(rfqs)
      .where(sql`${rfqs.sqteNumber} IS NOT NULL`)
      .orderBy(desc(rfqs.sqteNumber))
      .limit(1);
    
    if (latestRfq.length === 0) {
      return 'SQTE-001';
    }
    
    const lastNumber = latestRfq[0].sqteNumber?.split('-')[1];
    const nextNumber = lastNumber ? parseInt(lastNumber) + 1 : 1;
    return `SQTE-${nextNumber.toString().padStart(3, '0')}`;
  }



  // Assign SQTE number to RFQ
  async assignSqteNumber(rfqId: string, sqteNumber: string): Promise<void> {
    await db.update(rfqs)
      .set({ sqteNumber })
      .where(eq(rfqs.id, rfqId));
  }

  // RFQ operations
  async getRFQById(id: string): Promise<RFQ | undefined> {
    const [rfq] = await db.select().from(rfqs).where(eq(rfqs.id, id));
    return rfq;
  }

  async getRFQsByUserId(userId: string): Promise<RFQ[]> {
    // First, try direct user RFQs
    const userRfqs = await db.select().from(rfqs).where(eq(rfqs.userId, userId)).orderBy(desc(rfqs.createdAt));
    
    // Get user's effective customer number for company-wide RFQs
    const effectiveCustomerNumber = await this.getEffectiveCustomerNumber(userId);
    
    if (effectiveCustomerNumber) {
      // Get all RFQs for users with same customer number
      const companyRfqs = await this.getRFQsByCustomerNumber(effectiveCustomerNumber);
      
      // Merge and deduplicate RFQs
      const allRfqs = [...userRfqs];
      for (const companyRfq of companyRfqs) {
        if (!allRfqs.find(rfq => rfq.id === companyRfq.id)) {
          allRfqs.push(companyRfq);
        }
      }
      
      // Sort by creation date
      return allRfqs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    
    return userRfqs;
  }

  async getRFQsByCustomerNumber(customerNumber: string): Promise<RFQ[]> {
    // Get all users with this customer number
    const companyUsers = await this.getUsersByCustomerNumber(customerNumber);
    const userIds = companyUsers.map(u => u.id);
    
    if (userIds.length === 0) return [];
    
    // Use inArray for proper company RFQ sharing
    return await db.select().from(rfqs).where(
      inArray(rfqs.userId, userIds)
    ).orderBy(desc(rfqs.createdAt));
  }

  async getAllRFQs(): Promise<(RFQ & { user: User })[]> {
    return await db
      .select({
        id: rfqs.id,
        userId: rfqs.userId,
        projectName: rfqs.projectName,
        material: rfqs.material,
        materialGrade: rfqs.materialGrade,
        finishing: rfqs.finishing,
        tolerance: rfqs.tolerance,
        quantity: rfqs.quantity,
        notes: rfqs.notes,
        status: rfqs.status,
        sqteNumber: rfqs.sqteNumber,
        manufacturingProcess: rfqs.manufacturingProcess,
        manufacturingSubprocess: rfqs.manufacturingSubprocess,
        internationalManufacturingOk: rfqs.internationalManufacturingOk,
        createdAt: rfqs.createdAt,
        user: users,
      })
      .from(rfqs)
      .innerJoin(users, eq(rfqs.userId, users.id))
      .orderBy(desc(rfqs.createdAt));
  }

  async createRFQ(insertRfq: InsertRFQ): Promise<RFQ> {
    // Generate UUID for the id field
    const rfqWithId = {
      ...insertRfq,
      id: randomUUID()
    };
    
    const [rfq] = await db.insert(rfqs).values(rfqWithId).returning();
    return rfq;
  }

  async updateRFQStatus(id: string, status: string): Promise<void> {
    await db.update(rfqs).set({ status: status as any }).where(eq(rfqs.id, id));
  }

  async assignReferenceNumber(rfqId: string, referenceNumber: string): Promise<void> {
    await db.update(rfqs).set({ sqteNumber: referenceNumber }).where(eq(rfqs.id, rfqId));
  }

  // File operations
  async getFileById(id: string): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file;
  }

  async getFilesByRFQId(rfqId: string): Promise<File[]> {
    return await db
      .select()
      .from(files)
      .where(and(eq(files.linkedToType, "rfq"), eq(files.linkedToId, rfqId)));
  }

  async getFilesByUserId(userId: string): Promise<File[]> {
    return await db.select().from(files).where(eq(files.userId, userId));
  }

  async getFilesByLinkedId(linkedToId: string, linkedToType: string): Promise<File[]> {
    return await db
      .select()
      .from(files)
      .where(and(eq(files.linkedToId, linkedToId), eq(files.linkedToType, linkedToType as any)));
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    // Generate UUID for the id field
    const fileWithId = {
      ...insertFile,
      id: randomUUID()
    };
    
    const [file] = await db.insert(files).values(fileWithId).returning();
    return file;
  }

  async deleteFile(id: string): Promise<void> {
    await db.delete(files).where(eq(files.id, id));
  }

  async updateFile(id: string, updateData: Partial<any>): Promise<void> {
    await db.update(files).set(updateData).where(eq(files.id, id));
  }

  async getFile(id: string): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file;
  }

  async getFileByPath(filePath: string): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.fileUrl, filePath));
    return file;
  }

  // Sales quote operations
  async getAllQuotes(): Promise<SalesQuote[]> {
    return await db.select().from(salesQuotes);
  }

  async getQuoteByRFQId(rfqId: string): Promise<SalesQuote | undefined> {
    const [quote] = await db.select().from(salesQuotes).where(eq(salesQuotes.rfqId, rfqId));
    return quote;
  }

  async getQuoteById(quoteId: string): Promise<SalesQuote | undefined> {
    const [quote] = await db.select().from(salesQuotes).where(eq(salesQuotes.id, quoteId));
    return quote;
  }

  async getQuotesByUserId(userId: string): Promise<(SalesQuote & { rfq: RFQ })[]> {
    // Get user's effective customer number for company-wide quotes
    const effectiveCustomerNumber = await this.getEffectiveCustomerNumber(userId);
    
    let targetUserIds = [userId]; // Always include the direct user
    
    if (effectiveCustomerNumber) {
      // Get all users with same customer number for company sharing
      const companyUsers = await this.getUsersByCustomerNumber(effectiveCustomerNumber);
      targetUserIds = companyUsers.map(u => u.id);
    }
    
    // Get all quotes for the target user IDs (direct user or all company users)
    const quotes = await db
      .select({
        id: salesQuotes.id,
        rfqId: salesQuotes.rfqId,
        quoteNumber: salesQuotes.quoteNumber,
        amount: salesQuotes.amount,
        currency: salesQuotes.currency,
        validUntil: salesQuotes.validUntil,
        estimatedDeliveryDate: salesQuotes.estimatedDeliveryDate,
        status: salesQuotes.status,
        customerResponse: salesQuotes.customerResponse,
        purchaseOrderUrl: salesQuotes.purchaseOrderUrl,
        purchaseOrderNumber: salesQuotes.purchaseOrderNumber,
        quoteFileUrl: salesQuotes.quoteFileUrl,
        notes: salesQuotes.notes,
        createdAt: salesQuotes.createdAt,
        respondedAt: salesQuotes.respondedAt,
        rfq: rfqs,
      })
      .from(salesQuotes)
      .innerJoin(rfqs, eq(salesQuotes.rfqId, rfqs.id))
      .where(inArray(rfqs.userId, targetUserIds))
      .orderBy(desc(salesQuotes.createdAt));

    return quotes;
  }

  // Generate quote number with format SQTE-YYXXX
  private async generateQuoteNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const yearSuffix = currentYear.toString().slice(-2); // Get last 2 digits of year
    
    // Get the count of quotes created this year
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear + 1, 0, 1);
    
    const result = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(salesQuotes)
      .where(
        and(
          sql`${salesQuotes.createdAt} >= ${yearStart}`,
          sql`${salesQuotes.createdAt} < ${yearEnd}`
        )
      );
    
    const count = result[0]?.count || 0;
    const nextNumber = count + 1;
    const paddedNumber = String(nextNumber).padStart(3, '0');
    
    return `SQTE-${yearSuffix}${paddedNumber}`;
  }

  async createQuote(insertQuote: InsertSalesQuote): Promise<SalesQuote> {
    const quoteNumber = await this.generateQuoteNumber();
    
    // Generate UUID for the id field and add quote number
    const quoteWithIdAndNumber = { 
      ...insertQuote, 
      id: randomUUID(),
      quoteNumber 
    };
    
    const [quote] = await db.insert(salesQuotes).values(quoteWithIdAndNumber).returning();
    return quote;
  }

  async updateQuote(id: string, updateQuote: Partial<InsertSalesQuote>): Promise<void> {
    await db.update(salesQuotes).set(updateQuote).where(eq(salesQuotes.id, id));
  }

  async respondToQuote(rfqId: string, status: 'accepted' | 'declined', response?: string, purchaseOrderUrl?: string): Promise<void> {
    console.log('Responding to quote:', { rfqId, status, response });
    
    await db.update(salesQuotes)
      .set({
        status,
        customerResponse: response,
        purchaseOrderUrl,
        respondedAt: new Date(),
      })
      .where(eq(salesQuotes.rfqId, rfqId));

    // Update RFQ status based on response - do not create order automatically
    if (status === 'accepted') {
      await db.update(rfqs).set({ status: 'accepted' }).where(eq(rfqs.id, rfqId));
    } else if (status === 'declined') {
      await db.update(rfqs).set({ status: 'declined' }).where(eq(rfqs.id, rfqId));
    }
  }

  // Sales order operations
  async getOrderById(id: string): Promise<SalesOrder | undefined> {
    const [order] = await db.select().from(salesOrders).where(eq(salesOrders.id, id));
    return order;
  }

  async getOrderByRFQId(rfqId: string): Promise<SalesOrder | undefined> {
    const [order] = await db.select().from(salesOrders).where(eq(salesOrders.rfqId, rfqId));
    return order;
  }

  async getOrdersByUserId(userId: string): Promise<(SalesOrder & { rfq: RFQ; quote?: SalesQuote })[]> {
    // First, get direct user orders
    const userOrders = await db
      .select()
      .from(salesOrders)
      .innerJoin(rfqs, eq(salesOrders.rfqId, rfqs.id))
      .leftJoin(salesQuotes, eq(salesOrders.quoteId, salesQuotes.id))
      .where(eq(salesOrders.userId, userId))
      .orderBy(desc(salesOrders.orderDate));
    
    const formattedUserOrders = userOrders.map(order => ({
      ...order.sales_orders,
      rfq: order.rfqs,
      quote: order.sales_quotes ? order.sales_quotes : undefined
    }));

    // Get user's effective customer number for company-wide orders
    const effectiveCustomerNumber = await this.getEffectiveCustomerNumber(userId);
    
    if (effectiveCustomerNumber) {
      // Get all orders for users with same customer number
      const companyOrders = await this.getOrdersByCustomerNumber(effectiveCustomerNumber);
      
      // Merge and deduplicate orders
      const allOrders = [...formattedUserOrders];
      for (const companyOrder of companyOrders) {
        if (!allOrders.find(order => order.id === companyOrder.id)) {
          allOrders.push(companyOrder);
        }
      }
      
      // Sort by order date
      return allOrders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    }
    
    return formattedUserOrders;
  }

  async getOrdersByCustomerNumber(customerNumber: string): Promise<(SalesOrder & { rfq: RFQ; quote?: SalesQuote })[]> {
    // Get all users with this customer number
    const companyUsers = await this.getUsersByCustomerNumber(customerNumber);
    const userIds = companyUsers.map(u => u.id);
    
    if (userIds.length === 0) return [];
    
    const orders = await db
      .select()
      .from(salesOrders)
      .innerJoin(rfqs, eq(salesOrders.rfqId, rfqs.id))
      .leftJoin(salesQuotes, eq(salesOrders.quoteId, salesQuotes.id))
      .where(sql`${salesOrders.userId} = ANY(ARRAY[${userIds.map(() => '?').join(',')}])`, ...userIds)
      .orderBy(desc(salesOrders.orderDate));
    
    return orders.map(order => ({
      ...order.sales_orders,
      rfq: order.rfqs,
      quote: order.sales_quotes ? order.sales_quotes : undefined
    }));
  }

  async getAllOrders() {
    const results = await db
      .select({
        id: salesOrders.id,
        userId: salesOrders.userId,
        rfqId: salesOrders.rfqId,
        quoteId: salesOrders.quoteId,
        orderNumber: salesOrders.orderNumber,
        projectName: salesOrders.projectName,
        material: salesOrders.material,
        materialGrade: salesOrders.materialGrade,
        finishing: salesOrders.finishing,
        tolerance: salesOrders.tolerance,
        quantity: salesOrders.quantity,
        quantityShipped: salesOrders.quantityShipped,
        quantityRemaining: salesOrders.quantityRemaining,
        notes: salesOrders.notes,
        amount: salesOrders.amount,
        currency: salesOrders.currency,
        orderStatus: salesOrders.orderStatus,
        paymentStatus: salesOrders.paymentStatus,
        isArchived: salesOrders.isArchived,
        orderDate: salesOrders.orderDate,
        estimatedCompletion: salesOrders.estimatedCompletion,
        trackingNumber: salesOrders.trackingNumber,
        shippingCarrier: salesOrders.shippingCarrier,
        invoiceUrl: salesOrders.invoiceUrl,
        archivedAt: salesOrders.archivedAt,
        qualityCheckStatus: salesOrders.qualityCheckStatus,
        qualityCheckNotes: salesOrders.qualityCheckNotes,
        customerApprovedAt: salesOrders.customerApprovedAt,
        user: users,
        rfq: rfqs,
        quote: salesQuotes,
      })
      .from(salesOrders)
      .innerJoin(users, eq(salesOrders.userId, users.id))
      .innerJoin(rfqs, eq(salesOrders.rfqId, rfqs.id))
      .leftJoin(salesQuotes, eq(salesOrders.quoteId, salesQuotes.id))
      .where(eq(salesOrders.isArchived, false))
      .orderBy(desc(salesOrders.orderDate));

    return results.map(result => ({
      ...result,
      quote: result.quote || undefined
    }));
  }

  async getArchivedOrders() {
    const results = await db
      .select({
        id: salesOrders.id,
        userId: salesOrders.userId,
        rfqId: salesOrders.rfqId,
        quoteId: salesOrders.quoteId,
        orderNumber: salesOrders.orderNumber,
        projectName: salesOrders.projectName,
        material: salesOrders.material,
        materialGrade: salesOrders.materialGrade,
        finishing: salesOrders.finishing,
        tolerance: salesOrders.tolerance,
        quantity: salesOrders.quantity,
        quantityShipped: salesOrders.quantityShipped,
        quantityRemaining: salesOrders.quantityRemaining,
        notes: salesOrders.notes,
        amount: salesOrders.amount,
        currency: salesOrders.currency,
        orderStatus: salesOrders.orderStatus,
        paymentStatus: salesOrders.paymentStatus,
        isArchived: salesOrders.isArchived,
        orderDate: salesOrders.orderDate,
        estimatedCompletion: salesOrders.estimatedCompletion,
        trackingNumber: salesOrders.trackingNumber,
        shippingCarrier: salesOrders.shippingCarrier,
        invoiceUrl: salesOrders.invoiceUrl,
        archivedAt: salesOrders.archivedAt,
        qualityCheckStatus: salesOrders.qualityCheckStatus,
        qualityCheckNotes: salesOrders.qualityCheckNotes,
        customerApprovedAt: salesOrders.customerApprovedAt,
        user: users,
        rfq: rfqs,
        quote: salesQuotes,
      })
      .from(salesOrders)
      .innerJoin(users, eq(salesOrders.userId, users.id))
      .innerJoin(rfqs, eq(salesOrders.rfqId, rfqs.id))
      .leftJoin(salesQuotes, eq(salesOrders.quoteId, salesQuotes.id))
      .where(eq(salesOrders.isArchived, true))
      .orderBy(desc(salesOrders.archivedAt));

    return results.map(result => ({
      ...result,
      quote: result.quote || undefined
    }));
  }

  // Generate order number with format SORD-YYXXX
  private async generateOrderNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const yearSuffix = currentYear.toString().slice(-2); // Get last 2 digits of year
    
    // Get the count of orders created this year
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear + 1, 0, 1);
    
    const result = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(salesOrders)
      .where(
        and(
          sql`${salesOrders.orderDate} >= ${yearStart}`,
          sql`${salesOrders.orderDate} < ${yearEnd}`
        )
      );
    
    const count = result[0]?.count || 0;
    const nextNumber = count + 1;
    const paddedNumber = String(nextNumber).padStart(3, '0');
    
    return `SORD-${yearSuffix}${paddedNumber}`;
  }

  async createOrder(insertOrder: InsertSalesOrder): Promise<SalesOrder> {
    const orderNumber = await this.generateOrderNumber();
    
    // Generate UUID for the id field
    const orderData = {
      ...insertOrder,
      id: randomUUID(),
      orderNumber,
      paymentStatus: (insertOrder.paymentStatus || 'unpaid') as 'paid' | 'unpaid',
      quantityShipped: insertOrder.quantityShipped || 0,
      quantityRemaining: insertOrder.quantityRemaining || insertOrder.quantity,
      qualityCheckStatus: 'pending' as const
    };
    
    const [order] = await db.insert(salesOrders).values([orderData]).returning();
    return order;
  }

  async updateOrderStatus(id: string, status: string): Promise<void> {
    await db.update(salesOrders).set({ orderStatus: status as any }).where(eq(salesOrders.id, id));
  }

  async updateOrderTracking(id: string, trackingNumber: string, shippingCarrier?: string): Promise<void> {
    const updateData: any = { trackingNumber };
    if (shippingCarrier !== undefined) {
      updateData.shippingCarrier = shippingCarrier;
    }
    await db.update(salesOrders).set(updateData).where(eq(salesOrders.id, id));
  }

  async updateOrderPaymentStatus(id: string, paymentStatus: 'paid' | 'unpaid'): Promise<void> {
    await db.update(salesOrders)
      .set({ paymentStatus })
      .where(eq(salesOrders.id, id));
  }

  async archiveOrder(id: string): Promise<void> {
    await db.update(salesOrders)
      .set({ 
        isArchived: true, 
        archivedAt: new Date() 
      })
      .where(eq(salesOrders.id, id));
  }

  async reopenArchivedOrder(id: string): Promise<void> {
    await db.update(salesOrders)
      .set({ 
        isArchived: false, 
        archivedAt: null,
        paymentStatus: 'unpaid'
      })
      .where(eq(salesOrders.id, id));
  }

  async updateOrderInvoice(id: string, invoiceUrl: string): Promise<void> {
    await db.update(salesOrders)
      .set({ invoiceUrl })
      .where(eq(salesOrders.id, id));
  }

  async updateOrderQuantities(id: string, quantityShipped: number): Promise<void> {
    // Get current order data
    const [currentOrder] = await db.select().from(salesOrders).where(eq(salesOrders.id, id));
    if (!currentOrder) {
      throw new Error('Order not found');
    }

    const newQuantityShipped = (currentOrder.quantityShipped || 0) + quantityShipped;
    const newQuantityRemaining = currentOrder.quantity - newQuantityShipped;

    await db.update(salesOrders)
      .set({ 
        quantityShipped: newQuantityShipped,
        quantityRemaining: Math.max(0, newQuantityRemaining)
      })
      .where(eq(salesOrders.id, id));
  }



  // Sales invoice operations
  async getInvoiceByOrderId(orderId: string): Promise<SalesInvoice | undefined> {
    const [invoice] = await db.select().from(salesInvoices).where(eq(salesInvoices.orderId, orderId));
    return invoice;
  }

  // Generate invoice number with format SINV-YYXXX
  private async generateInvoiceNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const yearSuffix = currentYear.toString().slice(-2); // Get last 2 digits of year
    
    // Get the count of invoices created this year
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear + 1, 0, 1);
    
    const result = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(salesInvoices)
      .where(
        and(
          sql`${salesInvoices.createdAt} >= ${yearStart}`,
          sql`${salesInvoices.createdAt} < ${yearEnd}`
        )
      );
    
    const count = result[0]?.count || 0;
    const nextNumber = count + 1;
    const paddedNumber = String(nextNumber).padStart(3, '0');
    
    return `SINV-${yearSuffix}${paddedNumber}`;
  }

  async createInvoice(insertInvoice: InsertSalesInvoice): Promise<SalesInvoice> {
    const invoiceNumber = await this.generateInvoiceNumber();
    
    // Generate UUID for the id field
    const invoiceWithIdAndNumber = { 
      ...insertInvoice, 
      id: randomUUID(),
      invoiceNumber 
    };
    
    const [invoice] = await db.insert(salesInvoices).values(invoiceWithIdAndNumber).returning();
    return invoice;
  }

  async updateInvoicePaidStatus(id: string, isPaid: boolean): Promise<void> {
    await db.update(salesInvoices).set({ isPaid }).where(eq(salesInvoices.id, id));
  }

  // Admin management operations
  async getAllCustomers(): Promise<(User & { company?: Company })[]> {
    // First, let's try a simpler approach to identify the issue
    try {
      const customerUsers = await db
        .select()
        .from(users)
        .where(eq(users.role, 'customer'))
        .orderBy(desc(users.createdAt));

      // Now get company information separately for each user
      const usersWithCompanies = await Promise.all(
        customerUsers.map(async (user) => {
          let company = undefined;
          if (user.companyId) {
            try {
              const [companyData] = await db
                .select()
                .from(companies)
                .where(eq(companies.id, user.companyId));
              
              if (companyData) {
                company = {
                  id: companyData.id,
                  name: companyData.name,
                  customerNumber: companyData.companyNumber,
                  contactEmail: companyData.contactEmail,
                  phone: companyData.phone,
                  address: companyData.address,
                  city: companyData.city,
                  state: companyData.state,
                  country: companyData.country,
                  postalCode: companyData.postalCode,
                  website: companyData.website,
                  industry: companyData.industry,
                  notes: companyData.notes,
                  createdAt: companyData.createdAt,
                };
              }
            } catch (companyError) {
              console.error('Error fetching company for user:', user.id, companyError);
            }
          }
          
          return {
            ...user,
            company
          };
        })
      );

      return usersWithCompanies;
    } catch (error) {
      console.error('Error in getAllCustomers:', error);
      throw error;
    }
  }

  async searchCustomers(query: string): Promise<(User & { company?: Company })[]> {
    const customers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        title: users.title,
        phone: users.phone,
        companyId: users.companyId,
        companyNameInput: users.companyNameInput,
        isVerified: users.isVerified,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.isAdmin, false));

    // Get company information and counts for each customer
    const enrichedCustomers = await Promise.all(
      customers.map(async (customer) => {
        // Get company info if linked
        let company = undefined;
        if (customer.companyId) {
          company = await this.getCompanyById(customer.companyId);
        }

        const rfqCount = await db.select({ count: sql<number>`count(*)` }).from(rfqs).where(eq(rfqs.userId, customer.id));
        const orderCount = await db.select({ count: sql<number>`count(*)` }).from(salesOrders).where(eq(salesOrders.userId, customer.id));
        const totalSpent = await db.select({ sum: sql<number>`coalesce(sum(${salesOrders.amount}), 0)` }).from(salesOrders).where(eq(salesOrders.userId, customer.id));
        
        return {
          ...customer,
          company,
          customerNumber: company?.customerNumber || null,
          rfqCount: rfqCount[0]?.count || 0,
          orderCount: orderCount[0]?.count || 0,
          totalSpent: totalSpent[0]?.sum || 0,
        };
      })
    );

    return enrichedCustomers;
  }

  async searchCustomers(query: string): Promise<(User & { company?: Company })[]> {
    const customers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        title: users.title,
        phone: users.phone,
        companyId: users.companyId,
        companyNameInput: users.companyNameInput,
        isVerified: users.isVerified,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        and(
          eq(users.isAdmin, false),
          or(
            sql`lower(${users.name}) like lower(${'%' + query + '%'})`,
            sql`lower(${users.email}) like lower(${'%' + query + '%'})`,
            sql`lower(${users.companyNameInput}) like lower(${'%' + query + '%'})`
          )
        )
      );

    // Get counts and recent activity for each customer
    const enrichedResults = await Promise.all(
      customers.map(async (customer) => {
        const rfqCount = await db.select({ count: sql<number>`count(*)` }).from(rfqs).where(eq(rfqs.userId, customer.id));
        const orderCount = await db.select({ count: sql<number>`count(*)` }).from(salesOrders).where(eq(salesOrders.userId, customer.id));
        
        // Get most recent activity
        const recentRfq = await db.select({ createdAt: rfqs.createdAt }).from(rfqs).where(eq(rfqs.userId, customer.id)).orderBy(desc(rfqs.createdAt)).limit(1);
        const recentOrder = await db.select({ orderDate: salesOrders.orderDate }).from(salesOrders).where(eq(salesOrders.userId, customer.id)).orderBy(desc(salesOrders.orderDate)).limit(1);
        
        let recentActivity = "No recent activity";
        if (recentRfq[0]?.createdAt || recentOrder[0]?.orderDate) {
          const rfqDate = recentRfq[0]?.createdAt ? new Date(recentRfq[0].createdAt) : new Date(0);
          const orderDate = recentOrder[0]?.orderDate ? new Date(recentOrder[0].orderDate) : new Date(0);
          const mostRecent = rfqDate > orderDate ? rfqDate : orderDate;
          recentActivity = mostRecent.toLocaleDateString();
        }
        
        return {
          ...customer,
          type: 'customer' as const,
          rfqCount: rfqCount[0]?.count || 0,
          orderCount: orderCount[0]?.count || 0,
          recentActivity,
        };
      })
    );

    return enrichedResults;
  }

  async getBusinessReports(): Promise<any> {
    // Get overview stats
    const totalCustomers = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isAdmin, false));
    const totalRfqs = await db.select({ count: sql<number>`count(*)` }).from(rfqs);
    const totalOrders = await db.select({ count: sql<number>`count(*)` }).from(salesOrders);
    const totalRevenue = await db.select({ sum: sql<number>`coalesce(sum(${salesOrders.amount}), 0)` }).from(salesOrders);

    // Get top customers
    const topCustomers = await db
      .select({
        id: users.id,
        name: users.name,
        company: users.company,
        totalSpent: sql<number>`coalesce(sum(${salesOrders.amount}), 0)`,
        orderCount: sql<number>`count(${salesOrders.id})`,
      })
      .from(users)
      .leftJoin(salesOrders, eq(users.id, salesOrders.userId))
      .where(eq(users.isAdmin, false))
      .groupBy(users.id, users.name, users.company)
      .orderBy(sql`coalesce(sum(${salesOrders.amount}), 0) desc`)
      .limit(5);

    // Get recent activity (mock data for now - would implement properly with activity tracking)
    const recentActivity = [
      {
        id: '1',
        type: 'rfq' as const,
        customer: 'Recent Customer',
        description: 'Submitted new RFQ for manufacturing parts',
        date: new Date().toLocaleDateString(),
      },
      {
        id: '2',
        type: 'order' as const,
        customer: 'Another Customer',
        description: 'Placed order for quoted project',
        date: new Date(Date.now() - 86400000).toLocaleDateString(),
        amount: 1500,
      },
    ];

    return {
      overview: {
        totalCustomers: totalCustomers[0]?.count || 0,
        totalRfqs: totalRfqs[0]?.count || 0,
        totalOrders: totalOrders[0]?.count || 0,
        totalRevenue: totalRevenue[0]?.sum || 0,
      },
      trends: {
        rfqsThisMonth: 5,
        rfqsLastMonth: 3,
        ordersThisMonth: 2,
        ordersLastMonth: 1,
        revenueThisMonth: 3500,
        revenueLastMonth: 2100,
      },
      topCustomers,
      recentActivity,
    };
  }

  // Shipment methods
  async createShipment(insertShipment: InsertShipment): Promise<Shipment> {
    // Generate UUID for the id field
    const shipmentWithId = {
      ...insertShipment,
      id: randomUUID()
    };
    
    const [shipment] = await db.insert(shipments).values(shipmentWithId).returning();
    return shipment;
  }

  async getShipmentsByOrderId(orderId: string): Promise<Shipment[]> {
    return await db.select().from(shipments).where(eq(shipments.orderId, orderId)).orderBy(desc(shipments.shipmentDate));
  }

  async updateShipmentStatus(shipmentId: string, status: 'shipped' | 'delivered', deliveryDate?: Date): Promise<Shipment> {
    const updateData: any = { status };
    if (status === 'delivered' && deliveryDate) {
      updateData.deliveryDate = deliveryDate;
      updateData.trackingStatus = 'delivered';
    }
    
    const [shipment] = await db
      .update(shipments)
      .set(updateData)
      .where(eq(shipments.id, shipmentId))
      .returning();
    return shipment;
  }

  async updateShipmentTrackingStatus(shipmentId: string, trackingStatus: string): Promise<Shipment> {
    const [shipment] = await db
      .update(shipments)
      .set({ trackingStatus })
      .where(eq(shipments.id, shipmentId))
      .returning();
    return shipment;
  }

  async recordPartialShipment(orderId: string, quantityShipped: number, trackingNumber?: string, shippingCarrier?: string): Promise<{ shipment: Shipment; order: SalesOrder }> {
    // Get current order
    const [order] = await db.select().from(salesOrders).where(eq(salesOrders.id, orderId));
    if (!order) {
      throw new Error('Order not found');
    }

    // Calculate new quantities
    const currentShipped = order.quantityShipped || 0;
    const newTotalShipped = currentShipped + quantityShipped;
    const newRemaining = order.quantity - newTotalShipped;

    if (newRemaining < 0) {
      throw new Error('Cannot ship more than remaining quantity');
    }

    // Create shipment record with independent tracking
    const shipment = await this.createShipment({
      orderId,
      quantityShipped,
      trackingNumber,
      shippingCarrier,
      status: 'shipped',
      trackingStatus: 'material_procurement', // Start each shipment from material procurement
    });

    // Update order quantities
    const [updatedOrder] = await db
      .update(salesOrders)
      .set({
        quantityShipped: newTotalShipped,
        quantityRemaining: newRemaining,
        // Update main tracking info only if not set
        trackingNumber: order.trackingNumber || trackingNumber,
        shippingCarrier: order.shippingCarrier || shippingCarrier,
        // If fully shipped, update status to shipped
        orderStatus: newRemaining === 0 ? 'shipped' : order.orderStatus,
      })
      .where(eq(salesOrders.id, orderId))
      .returning();

    return { shipment, order: updatedOrder };
  }

  // Check if all shipments for an order are delivered
  async areAllShipmentsDelivered(orderId: string): Promise<boolean> {
    const orderShipments = await this.getShipmentsByOrderId(orderId);
    return orderShipments.length > 0 && orderShipments.every(s => s.trackingStatus === 'delivered');
  }

  // Get orders that have incomplete shipments (for Quick Actions)
  async getOrdersWithIncompleteShipments(userId: string): Promise<SalesOrder[]> {
    const userOrders = await this.getOrdersByUserId(userId);
    const incompleteOrders = [];
    
    for (const order of userOrders) {
      const allDelivered = await this.areAllShipmentsDelivered(order.id);
      if (!allDelivered) {
        incompleteOrders.push(order);
      }
    }
    
    return incompleteOrders;
  }

  // Quality check operations
  async getQualityCheckFiles(orderId: string): Promise<File[]> {
    return await db
      .select()
      .from(files)
      .where(and(eq(files.linkedToType, "quality_check"), eq(files.linkedToId, orderId)));
  }

  async deleteQualityCheckFile(fileId: string): Promise<boolean> {
    const result = await db.delete(files).where(eq(files.id, fileId));
    return (result.rowCount || 0) > 0;
  }

  async updateQualityCheckApproval(orderId: string, qualityCheckStatus: string, notes?: string): Promise<void> {
    await db.update(salesOrders).set({ 
      qualityCheckStatus: qualityCheckStatus as any,
      qualityCheckNotes: notes,
      customerApprovedAt: qualityCheckStatus === 'approved' ? new Date() : null
    }).where(eq(salesOrders.id, orderId));
  }

  async approveQualityCheck(orderId: string, notes?: string): Promise<void> {
    await db.update(salesOrders).set({ 
      qualityCheckStatus: 'approved',
      qualityCheckNotes: notes,
      customerApprovedAt: new Date()
    }).where(eq(salesOrders.id, orderId));
  }

  async getQualityCheckOrders(): Promise<any[]> {
    const ordersInQualityCheck = await db
      .select()
      .from(salesOrders)
      .innerJoin(users, eq(salesOrders.userId, users.id))
      .where(eq(salesOrders.orderStatus, 'quality_check'));
    
    // Transform the result to match expected format
    return ordersInQualityCheck.map(row => ({
      id: row.sales_orders.id,
      orderNumber: row.sales_orders.orderNumber,
      projectName: row.sales_orders.projectName,
      customerName: row.users.name,
      qualityCheckStatus: row.sales_orders.qualityCheckStatus,
      customerApprovedAt: row.sales_orders.customerApprovedAt,
      qualityCheckNotes: row.sales_orders.qualityCheckNotes,
      createdAt: row.sales_orders.orderDate,
    }));
  }

  async getQualityCheckNotifications(): Promise<any[]> {
    const notifications = await db
      .select({
        orderId: salesOrders.id,
        orderNumber: salesOrders.orderNumber,
        projectName: salesOrders.projectName,
        customerName: users.name,
        qualityCheckStatus: salesOrders.qualityCheckStatus,
        customerApprovedAt: salesOrders.customerApprovedAt,
        qualityCheckNotes: salesOrders.qualityCheckNotes,
        orderStatus: salesOrders.orderStatus,
      })
      .from(salesOrders)
      .innerJoin(users, eq(salesOrders.userId, users.id))
      .where(
        or(
          // Orders in quality check stage awaiting approval
          and(eq(salesOrders.orderStatus, 'quality_check'), eq(salesOrders.qualityCheckStatus, 'pending')),
          // Recently approved quality checks (within last 7 days)
          and(eq(salesOrders.qualityCheckStatus, 'approved'), 
              sql`${salesOrders.customerApprovedAt} > NOW() - INTERVAL '7 days'`),
          // Orders needing revision
          eq(salesOrders.qualityCheckStatus, 'needs_revision')
        )
      )
      .orderBy(desc(salesOrders.customerApprovedAt), desc(salesOrders.orderDate));
    
    return notifications;
  }

  // Supplier operations
  async getAllSuppliers(): Promise<User[]> {
    const suppliers = await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        name: users.name,
        title: users.title,
        phone: users.phone,
        companyId: users.companyId,
        companyNameInput: users.companyNameInput,
        role: users.role,
        isAdmin: users.isAdmin,
        isVerified: users.isVerified,
        verificationCode: users.verificationCode,
        verificationCodeExpiry: users.verificationCodeExpiry,
        resetCode: users.resetCode,
        resetCodeExpiry: users.resetCodeExpiry,
        isAdminCreated: users.isAdminCreated,
        mustResetPassword: users.mustResetPassword,
        userNumber: users.userNumber,
        website: users.website,
        certifications: users.certifications,
        capabilities: users.capabilities,
        finishingCapabilities: users.finishingCapabilities,
        address: users.address,
        city: users.city,
        state: users.state,
        country: users.country,
        postalCode: users.postalCode,
        yearEstablished: users.yearEstablished,
        numberOfEmployees: users.numberOfEmployees,
        facilitySize: users.facilitySize,
        primaryIndustries: users.primaryIndustries,
        qualitySystem: users.qualitySystem,
        leadTimeCapability: users.leadTimeCapability,
        minimumOrderQuantity: users.minimumOrderQuantity,
        maxPartSizeCapability: users.maxPartSizeCapability,
        toleranceCapability: users.toleranceCapability,
        emergencyCapability: users.emergencyCapability,
        internationalShipping: users.internationalShipping,
        createdAt: users.createdAt,
        // Company fields from join
        companyName: companies.name,
        customerNumber: companies.companyNumber,
        companyContactEmail: companies.contactEmail,
        companyPhone: companies.phone,
        companyAddress: companies.address,
        companyCity: companies.city,
        companyState: companies.state,
        companyCountry: companies.country,
        companyPostalCode: companies.postalCode,
        companyWebsite: companies.website,
        companyIndustry: companies.industry,
        companyNotes: companies.notes,
        companyCreatedAt: companies.createdAt,
      })
      .from(users)
      .leftJoin(companies, eq(users.companyId, companies.id))
      .where(eq(users.role, 'supplier'));

    return suppliers.map(supplier => ({
      ...supplier,
      // Add computed company name for compatibility
      companyName: supplier.companyName || supplier.companyNameInput || 'No Company Name'
    })) as User[];
  }

  async getSupplierById(id: string): Promise<User | undefined> {
    // Simplified query - just get the user, then company separately if needed
    const [supplier] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.role, 'supplier')));

    return supplier;
  }

  async updateSupplierProfile(id: string, data: Partial<InsertUser>): Promise<void> {
    await db.update(users).set(data).where(eq(users.id, id));
  }



  // Methods to check for supplier dependencies before deletion
  async hasSupplierRFQs(supplierId: string): Promise<boolean> {
    const [count] = await db
      .select({ count: sql`count(*)` })
      .from(rfqs)
      .where(eq(rfqs.userId, supplierId));
    return Number(count.count) > 0;
  }

  async hasSupplierQuotes(supplierId: string): Promise<boolean> {
    const [count] = await db
      .select({ count: sql`count(*)` })
      .from(supplierQuotes)
      .where(eq(supplierQuotes.supplierId, supplierId));
    return Number(count.count) > 0;
  }

  async hasSupplierPurchaseOrders(supplierId: string): Promise<boolean> {
    const [count] = await db
      .select({ count: sql`count(*)` })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.supplierId, supplierId));
    return Number(count.count) > 0;
  }

  async hasSupplierMessages(supplierId: string): Promise<boolean> {
    const [count] = await db
      .select({ count: sql`count(*)` })
      .from(messages)
      .where(or(eq(messages.senderId, supplierId), eq(messages.receiverId, supplierId)));
    return Number(count.count) > 0;
  }

  // Supplier quote operations
  async getSupplierQuotesByRfqId(rfqId: string): Promise<(SupplierQuote & { supplier: User })[]> {
    const results = await db
      .select()
      .from(supplierQuotes)
      .innerJoin(users, eq(supplierQuotes.supplierId, users.id))
      .leftJoin(companies, eq(users.companyId, companies.id))
      .where(eq(supplierQuotes.rfqId, rfqId));
    
    return results.map(result => ({
      ...result.supplier_quotes,
      supplier: {
        ...result.users,
        company: result.companies?.name || result.users.company,
        supplierNumber: result.companies?.companyNumber || result.users.customerNumber,
      }
    }));
  }

  async getSupplierQuotesBySupplierId(supplierId: string): Promise<(SupplierQuote & { rfq: RFQ })[]> {
    // Get user's company for company-wide sharing
    const companyUsers = await this.getSupplierCompanyUsers(supplierId);
    const targetUserIds = companyUsers.map(u => u.id);
    
    console.log(`[DEBUG] Getting supplier quotes for company users: ${targetUserIds.length} users - ${targetUserIds.join(', ')}`);
    
    const results = await db
      .select()
      .from(supplierQuotes)
      .innerJoin(rfqs, eq(supplierQuotes.rfqId, rfqs.id))
      .where(inArray(supplierQuotes.supplierId, targetUserIds))
      .orderBy(desc(supplierQuotes.submittedAt));
    
    return results.map(result => ({
      ...result.supplier_quotes,
      rfq: result.rfqs
    }));
  }

  async createSupplierQuote(quote: InsertSupplierQuote): Promise<SupplierQuote> {
    // Get the SQTE number from the RFQ
    const rfq = await this.getRFQById(quote.rfqId);
    if (!rfq || !rfq.sqteNumber) {
      throw new Error('RFQ not found or missing SQTE number');
    }
    
    // Generate UUID for the id field and add SQTE number
    const quoteWithIdAndSqte = {
      ...quote,
      id: randomUUID(),
      sqteNumber: rfq.sqteNumber
    };
    
    const [newQuote] = await db.insert(supplierQuotes).values(quoteWithIdAndSqte).returning();
    
    // Update assignment status
    await this.updateRfqAssignmentStatus(quote.rfqId!, quote.supplierId!, 'quoted');
    
    return newQuote;
  }

  async updateSupplierQuoteStatus(id: string, status: 'accepted' | 'not_selected', adminFeedback?: string): Promise<void> {
    const updateData: any = { 
      status, 
      respondedAt: new Date() 
    };
    
    if (adminFeedback) {
      updateData.adminFeedback = adminFeedback;
    }
    
    await db.update(supplierQuotes).set(updateData).where(eq(supplierQuotes.id, id));
  }

  // RFQ assignment operations
  async assignRfqToSuppliers(rfqId: string, supplierIds: string[]): Promise<void> {
    // Generate UUIDs for each assignment
    const assignments = supplierIds.map(supplierId => ({
      id: randomUUID(),
      rfqId,
      supplierId
    }));
    
    await db.insert(rfqAssignments).values(assignments);
    
    // Update RFQ status
    await db.update(rfqs).set({ status: 'submitted' }).where(eq(rfqs.id, rfqId));
    
    // Note: Notifications are created in the route handler to avoid duplicates
  }

  async getAssignedRfqsBySupplierId(supplierId: string): Promise<(RfqAssignment & { rfq: RFQ & { files: File[] } })[]> {
    // Get user's company for company-wide sharing
    const companyUsers = await this.getSupplierCompanyUsers(supplierId);
    const targetUserIds = companyUsers.map(u => u.id);
    
    console.log(`[DEBUG] Getting assigned RFQs for supplier company users: ${targetUserIds.length} users - ${targetUserIds.join(', ')}`);
    
    const results = await db
      .select()
      .from(rfqAssignments)
      .innerJoin(rfqs, eq(rfqAssignments.rfqId, rfqs.id))
      .where(inArray(rfqAssignments.supplierId, targetUserIds))
      .orderBy(desc(rfqAssignments.assignedAt));
    
    // Get files for each RFQ
    const assignmentsWithFiles = await Promise.all(results.map(async result => {
      const rfqFiles = await this.getFilesByRFQId(result.rfqs.id);
      return {
        ...result.rfq_assignments,
        rfq: {
          ...result.rfqs,
          files: rfqFiles
        }
      };
    }));

    return assignmentsWithFiles;
  }

  async updateRfqAssignmentStatus(rfqId: string, supplierId: string, status: 'quoted' | 'expired'): Promise<void> {
    // Get user's company for company-wide updates
    const companyUsers = await this.getSupplierCompanyUsers(supplierId);
    const targetUserIds = companyUsers.map(u => u.id);
    
    console.log(`[DEBUG] Updating RFQ assignment status for supplier company users: ${targetUserIds.length} users - ${targetUserIds.join(', ')}`);
    
    // Update assignment status for all users in the company
    await db.update(rfqAssignments)
      .set({ status })
      .where(and(
        eq(rfqAssignments.rfqId, rfqId),
        inArray(rfqAssignments.supplierId, targetUserIds)
      ));
    
    console.log(`[DEBUG] Successfully updated RFQ ${rfqId} assignment status to '${status}' for all company users`);
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    // Generate UUID for the id field
    const notificationWithId = {
      ...notification,
      id: randomUUID()
    };
    
    const [newNotification] = await db.insert(notifications).values(notificationWithId).returning();
    return newNotification;
  }

  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    // Generate UUID for the id field
    const messageWithId = {
      ...message,
      id: randomUUID()
    };
    
    const [newMessage] = await db.insert(messages).values(messageWithId).returning();
    return newMessage;
  }

  async getMessagesBetweenUsers(userId1: string, userId2: string): Promise<(Message & { sender: User; receiver: User })[]> {
    // Simplified query to avoid alias issues
    const messagesList = await db
      .select()
      .from(messages)
      .where(or(
        and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
        and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
      ))
      .orderBy(desc(messages.createdAt));
    
    // Get sender and receiver info separately
    const results = [];
    for (const message of messagesList) {
      const sender = await db.select().from(users).where(eq(users.id, message.senderId)).then(rows => rows[0]);
      const receiver = await db.select().from(users).where(eq(users.id, message.receiverId)).then(rows => rows[0]);
      results.push({
        ...message,
        sender,
        receiver
      });
    }
    
    return results;
  }

  async getMessagesByUserId(userId: string): Promise<(Message & { sender: User; receiver: User })[]> {
    // Simplified query to avoid alias issues
    const messagesList = await db
      .select()
      .from(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)))
      .orderBy(desc(messages.createdAt));
    
    // Get sender and receiver info separately
    const results = [];
    for (const message of messagesList) {
      const sender = await db.select().from(users).where(eq(users.id, message.senderId)).then(rows => rows[0]);
      const receiver = await db.select().from(users).where(eq(users.id, message.receiverId)).then(rows => rows[0]);
      results.push({
        ...message,
        sender,
        receiver
      });
    }
    
    return results;
  }

  async markMessageAsRead(id: string): Promise<void> {
    await db.update(messages).set({ isRead: true }).where(eq(messages.id, id));
  }

  async getAllMessagesForUser(userId: string): Promise<(Message & { sender: User; receiver: User })[]> {
    return this.getMessagesByUserId(userId);
  }

  async markMessagesAsRead(fromUserId: string, toUserId: string): Promise<void> {
    await db.update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.senderId, fromUserId),
          eq(messages.receiverId, toUserId)
        )
      );
  }

  generateThreadId(userId1: string, userId2: string, category: string): string {
    // Generate unique thread ID for each new conversation using timestamp and random component
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const sortedUsers = [userId1, userId2].sort();
    return `${sortedUsers[0]}-${sortedUsers[1]}-${timestamp}-${random}`;
  }

  async findExistingThread(userId1: string, userId2: string): Promise<string | null> {
    // Find existing thread between these two users
    const existingMessage = await db
      .select()
      .from(messages)
      .where(
        or(
          and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
          and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(1);

    return existingMessage.length > 0 ? existingMessage[0].threadId : null;
  }

  async getMessageThreads(userId: string): Promise<Array<{ threadId: string; subject: string; category: string; otherUser: User; lastMessage: Message; unreadCount: number }>> {
    // Get all messages for the user
    const allMessages = await db
      .select()
      .from(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)))
      .orderBy(desc(messages.createdAt));

    // Group messages by thread
    const threadsMap = new Map<string, any>();

    for (const message of allMessages) {
      const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
      const category = message.category || 'general';
      const threadId = message.threadId || this.generateThreadId(userId, otherUserId, category);

      if (!threadsMap.has(threadId)) {
        // Get other user info - simplified query to avoid join issues
        const otherUserQuery = await db
          .select()
          .from(users)
          .where(eq(users.id, otherUserId));
        
        const otherUser = otherUserQuery[0];
        
        if (otherUser) {
          // Get company info separately if needed
          let company = null;
          let customerNumber = null;
          if (otherUser.companyId) {
            try {
              const companyQuery = await db
                .select()
                .from(companies)
                .where(eq(companies.id, otherUser.companyId));
              if (companyQuery.length > 0) {
                company = companyQuery[0].name;
                customerNumber = companyQuery[0].companyNumber;
              }
            } catch (error) {
              console.log('Company lookup failed:', error);
            }
          }
          
          threadsMap.set(threadId, {
            threadId,
            subject: message.subject || `${category.charAt(0).toUpperCase() + category.slice(1)} Discussion`,
            category,
            otherUser: {
              ...otherUser,
              company,
              customerNumber
            },
            lastMessage: message,
            unreadCount: 0,
            messages: []
          });
        }
      }

      const thread = threadsMap.get(threadId);
      
      if (thread) {
        // Update last message if this one is more recent
        if (new Date(message.createdAt) > new Date(thread.lastMessage.createdAt)) {
          thread.lastMessage = message;
        }

        // Count unread messages from other user
        if (!message.isRead && message.senderId !== userId) {
          thread.unreadCount++;
        }
      }
    }

    return Array.from(threadsMap.values())
      .sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());
  }

  async getMessagesByThreadId(threadId: string): Promise<(Message & { sender: User; receiver: User; attachments: MessageAttachment[] })[]> {
    const messagesList = await db
      .select()
      .from(messages)
      .where(eq(messages.threadId, threadId))
      .orderBy(messages.createdAt);

    const results = [];
    for (const message of messagesList) {
      const sender = await db.select().from(users).where(eq(users.id, message.senderId)).then(rows => rows[0]);
      const receiver = await db.select().from(users).where(eq(users.id, message.receiverId)).then(rows => rows[0]);
      
      // Fetch attachments for this message
      const attachments = await db
        .select()
        .from(messageAttachments)
        .where(eq(messageAttachments.messageId, message.id));
      
      results.push({
        ...message,
        sender,
        receiver,
        attachments
      });
    }

    return results;
  }

  async markThreadAsRead(threadId: string, userId: string): Promise<void> {
    await db.update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.threadId, threadId),
          eq(messages.receiverId, userId)
        )
      );
  }

  // Additional methods for supplier quote management
  async getSupplierQuoteById(quoteId: string): Promise<SupplierQuote | undefined> {
    const [quote] = await db
      .select()
      .from(supplierQuotes)
      .where(eq(supplierQuotes.id, quoteId));
    return quote;
  }

  async getMessageById(id: string): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }

  async getMessageAttachmentById(id: string): Promise<MessageAttachment | undefined> {
    const [attachment] = await db.select().from(messageAttachments).where(eq(messageAttachments.id, id));
    return attachment;
  }



  async updateSupplierProfile(supplierId: string, updateData: Partial<User>): Promise<void> {
    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, supplierId));
  }

  // Get supplier quotes with RFQs for admin dashboard
  async getSupplierQuotesWithRFQs(): Promise<any[]> {
    // Get all RFQs that have been sent to suppliers (status = 'sent_to_suppliers')
    const rfqsWithAssignments = await db
      .select()
      .from(rfqs)
      .where(eq(rfqs.status, 'sent_to_suppliers'))
      .orderBy(desc(rfqs.createdAt));

    // For each RFQ, get the supplier quotes and assignments
    const rfqsWithQuotes = await Promise.all(
      rfqsWithAssignments.map(async (rfq) => {
        // Get supplier quotes for this RFQ
        const quotes = await this.getSupplierQuotesByRfqId(rfq.id);
        
        // Get assignments for this RFQ to show which suppliers were assigned
        const assignments = await db
          .select()
          .from(rfqAssignments)
          .innerJoin(users, eq(rfqAssignments.supplierId, users.id))
          .where(eq(rfqAssignments.rfqId, rfq.id));

        const assignedSuppliers = assignments.map(assignment => ({
          id: assignment.users.id,
          name: assignment.users.name,
          email: assignment.users.email,
          hasQuoted: quotes.some(quote => quote.supplierId === assignment.users.id)
        }));

        return {
          ...rfq,
          supplierQuotes: quotes,
          assignedSuppliers
        };
      })
    );

    return rfqsWithQuotes;
  }

  // Message attachment operations
  async createMessageAttachment(attachment: InsertMessageAttachment): Promise<MessageAttachment> {
    // Generate UUID for the id field
    const attachmentWithId = {
      ...attachment,
      id: randomUUID()
    };
    
    const [messageAttachment] = await db.insert(messageAttachments).values(attachmentWithId).returning();
    return messageAttachment;
  }

  async getMessageAttachment(attachmentId: string): Promise<MessageAttachment | undefined> {
    const [attachment] = await db.select().from(messageAttachments).where(eq(messageAttachments.id, attachmentId));
    return attachment;
  }

  async getMessageById(messageId: string): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, messageId));
    return message;
  }

  async getMessageAttachments(messageId: string): Promise<MessageAttachment[]> {
    return await db.select().from(messageAttachments).where(eq(messageAttachments.messageId, messageId));
  }

  // Purchase Order operations
  async generatePurchaseOrderNumber(): Promise<string> {
    // Get total count of purchase orders to generate sequential numbers starting from PO-0001
    const result = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(purchaseOrders);
    
    const count = result[0]?.count || 0;
    const nextNumber = count + 1;
    const paddedNumber = String(nextNumber).padStart(4, '0');
    
    return `PO-${paddedNumber}`;
  }

  async createPurchaseOrder(purchaseOrder: InsertPurchaseOrder): Promise<PurchaseOrder> {
    const orderNumber = await this.generatePurchaseOrderNumber();
    
    // Generate UUID for the id field and add order number
    const purchaseOrderWithIdAndNumber = { 
      ...purchaseOrder, 
      id: randomUUID(),
      orderNumber 
    };
    
    const [newPurchaseOrder] = await db.insert(purchaseOrders).values(purchaseOrderWithIdAndNumber).returning();
    return newPurchaseOrder;
  }

  async getPurchaseOrderById(id: string): Promise<PurchaseOrder | undefined> {
    const [purchaseOrder] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
    return purchaseOrder;
  }

  async getPurchaseOrdersBySupplierId(supplierId: string): Promise<(PurchaseOrder & { supplier: User; rfq: RFQ; supplierQuote: SupplierQuote })[]> {
    // Get user's company for company-wide sharing
    const user = await this.getUser(supplierId);
    let targetUserIds = [supplierId]; // Always include the direct user
    
    if (user && user.companyId) {
      // Get all users from the same supplier company
      const companyUsers = await this.getUsersByCompanyId(user.companyId);
      targetUserIds = companyUsers.map(u => u.id);
    }
    
    // Get the basic purchase orders first
    const orders = await db
      .select()
      .from(purchaseOrders)
      .where(inArray(purchaseOrders.supplierId, targetUserIds))
      .orderBy(desc(purchaseOrders.createdAt));

    // Enhance each order with related data
    const enhancedOrders = await Promise.all(
      orders.map(async (order) => {
        // Get supplier info
        const supplier = await this.getUser(order.supplierId);
        
        // Get RFQ info if available
        let rfq: any = {
          id: '',
          title: 'Manual Purchase Order',
          description: '',
          quantity: 0,
          projectName: 'Manual Purchase Order',
          material: '',
        };
        
        if (order.rfqId) {
          const rfqData = await this.getRFQById(order.rfqId);
          if (rfqData) {
            rfq = {
              id: rfqData.id,
              title: rfqData.projectName || 'Manual Purchase Order',
              description: rfqData.notes || '',
              quantity: rfqData.quantity || 0,
              projectName: rfqData.projectName || 'Manual Purchase Order',
              material: rfqData.material || '',
            };
          }
        }

        // Get supplier quote info if available
        let supplierQuote: any = {
          id: '',
          price: order.totalAmount,
          leadTime: 0,
          notes: '',
        };
        
        if (order.supplierQuoteId) {
          const quoteData = await this.getSupplierQuoteById(order.supplierQuoteId);
          if (quoteData) {
            supplierQuote = {
              id: quoteData.id,
              price: quoteData.price,
              leadTime: quoteData.leadTime || 0,
              notes: quoteData.notes || '',
            };
          }
        }

        return {
          ...order,
          supplier: supplier || {
            id: order.supplierId,
            name: 'Unknown Supplier',
            email: '',
          } as User,
          rfq: rfq as RFQ,
          supplierQuote: supplierQuote as SupplierQuote,
        };
      })
    );

    return enhancedOrders;
  }

  async updatePurchaseOrderStatus(id: string, status: string): Promise<void> {
    await db.update(purchaseOrders).set({ status: status as any }).where(eq(purchaseOrders.id, id));
  }

  async updatePurchaseOrder(id: string, updates: Partial<PurchaseOrder>): Promise<void> {
    // Direct SQL approach to bypass potential type issues
    if (updates.status && updates.archivedAt) {
      await db.execute(sql`
        UPDATE purchase_orders 
        SET status = ${updates.status}, archived_at = ${updates.archivedAt}
        WHERE id = ${id}
      `);
    } else {
      await db.update(purchaseOrders).set(updates).where(eq(purchaseOrders.id, id));
    }
  }

  async acceptPurchaseOrder(id: string): Promise<void> {
    await db.update(purchaseOrders).set({ 
      status: 'accepted' as any,
      acceptedAt: new Date()
    }).where(eq(purchaseOrders.id, id));
  }

  async rejectPurchaseOrder(id: string): Promise<void> {
    await db.update(purchaseOrders).set({ 
      status: 'declined' as any
    }).where(eq(purchaseOrders.id, id));
  }

  async getAllPurchaseOrders(): Promise<(PurchaseOrder & { supplier: User; rfq?: RFQ; supplierQuote?: SupplierQuote })[]> {
    try {
      const orders = await db
        .select()
        .from(purchaseOrders)
        .orderBy(desc(purchaseOrders.createdAt));

      if (orders.length === 0) {
        return [];
      }

      // Fetch related data for each order
      const enrichedOrders = await Promise.all(
        orders.map(async (order) => {
          // Get supplier info
          const [supplier] = await db
            .select()
            .from(users)
            .where(eq(users.id, order.supplierId));

          // Get RFQ info if exists
          let rfq = undefined;
          if (order.rfqId) {
            const [rfqResult] = await db
              .select()
              .from(rfqs)
              .where(eq(rfqs.id, order.rfqId));
            rfq = rfqResult;
          }

          // Get supplier quote info if exists
          let supplierQuote = undefined;
          if (order.supplierQuoteId) {
            const [quoteResult] = await db
              .select()
              .from(supplierQuotes)
              .where(eq(supplierQuotes.id, order.supplierQuoteId));
            supplierQuote = quoteResult;
          }

          return {
            ...order,
            supplier: supplier || {
              id: order.supplierId,
              name: 'Unknown Supplier',
              email: '',
            } as User,
            rfq: rfq as RFQ,
            supplierQuote: supplierQuote as SupplierQuote,
            // Flatten commonly used fields for frontend convenience
            supplierName: supplier?.name || 'Unknown Supplier',
            supplierEmail: supplier?.email || '',
            supplierCompany: supplier?.companyNameInput || 'No Company Name',
            supplierVendorNumber: supplier?.userNumber || 'N/A',
            projectName: rfq?.projectName || 'Unknown Project',
            material: rfq?.material || '',
            materialGrade: rfq?.materialGrade || '',
            finishing: rfq?.finishing || '',
            tolerance: rfq?.tolerance || '',
            quantity: rfq?.quantity || 0,
          };
        })
      );

      return enrichedOrders;
    } catch (error) {
      console.error('Error in getAllPurchaseOrders:', error);
      return [];
    }
  }

  // Enhanced message operations with attachments
  async getMessagesBetweenUsers(userId1: string, userId2: string): Promise<(Message & { sender: User; receiver: User; attachments: MessageAttachment[] })[]> {
    const messagesWithUsers = await db
      .select({
        id: messages.id,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        content: messages.content,
        isRead: messages.isRead,
        relatedType: messages.relatedType,
        relatedId: messages.relatedId,
        createdAt: messages.createdAt,
        senderName: sql`sender.name`.as('senderName'),
        senderEmail: sql`sender.email`.as('senderEmail'),
        receiverName: sql`receiver.name`.as('receiverName'),
        receiverEmail: sql`receiver.email`.as('receiverEmail'),
      })
      .from(messages)
      .innerJoin(sql`${users} AS sender`, sql`sender.id = ${messages.senderId}`)
      .innerJoin(sql`${users} AS receiver`, sql`receiver.id = ${messages.receiverId}`)
      .where(
        or(
          and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
          and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
        )
      )
      .orderBy(messages.createdAt);

    // Get attachments for all messages
    const messagesWithAttachments = await Promise.all(
      messagesWithUsers.map(async (message) => {
        const attachments = await this.getMessageAttachments(message.id);
        return {
          id: message.id,
          senderId: message.senderId,
          receiverId: message.receiverId,
          content: message.content,
          isRead: message.isRead,
          relatedType: message.relatedType,
          relatedId: message.relatedId,
          createdAt: message.createdAt,
          sender: {
            id: message.senderId,
            name: message.senderName,
            email: message.senderEmail,
          } as User,
          receiver: {
            id: message.receiverId,
            name: message.receiverName,
            email: message.receiverEmail,
          } as User,
          attachments,
        };
      })
    );

    return messagesWithAttachments;
  }

  async getAllUsersForAdmin(): Promise<Array<{
    id: string;
    name: string;
    email: string;
    role: 'customer' | 'supplier';
    customerNumber?: string;
    userNumber?: string;
    company?: string;
  }>> {
    try {
      const result = await db.execute(sql`
        SELECT 
          id, 
          name, 
          email, 
          role, 
          customer_number, 
          user_number, 
          company
        FROM users 
        WHERE role IN ('customer', 'supplier')
        ORDER BY name
      `);

      return result.rows.map((row: any) => ({
        id: row.id,
        name: row.name || 'Unknown User',
        email: row.email,
        role: row.role as 'customer' | 'supplier',
        customerNumber: row.customer_number || undefined,
        userNumber: row.user_number || undefined,
        company: row.company || undefined,
      }));
    } catch (error) {
      console.error('Error in getAllUsersForAdmin:', error);
      throw error;
    }
  }

}

export const storage = new DatabaseStorage();
