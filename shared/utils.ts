// Utility functions for formatting business IDs consistently across the application

/**
 * Format customer number as CU000X
 */
export function formatCustomerNumber(customerNumber: string): string {
  return customerNumber || "CU0000";
}

/**
 * Format sales quote number as SQTE-YYNNN  
 */
export function formatSalesQuoteNumber(quoteNumber: string): string {
  return quoteNumber || "SQTE-0000";
}

/**
 * Format sales order number as SORD-YYNNN
 */
export function formatSalesOrderNumber(orderNumber: string): string {
  return orderNumber || "SORD-0000";
}

/**
 * Format purchase order number as PO-YYNNN
 */
export function formatPurchaseOrderNumber(orderNumber: string): string {
  return orderNumber || "PO-0000";
}

/**
 * Format supplier number as V000X
 */
export function formatSupplierNumber(supplierNumber: string): string {
  return supplierNumber || "V0000";
}

/**
 * Generate next customer number in sequence
 */
export function generateCustomerNumber(lastNumber: string | null): string {
  if (!lastNumber) return "CU0001";
  
  const match = lastNumber.match(/CU(\d+)/);
  if (!match) return "CU0001";
  
  const nextNum = parseInt(match[1]) + 1;
  return `CU${nextNum.toString().padStart(4, '0')}`;
}

/**
 * Generate next sales quote number in SQTE-YYNNN format
 */
export function generateSalesQuoteNumber(lastNumber: string | null): string {
  const currentYear = new Date().getFullYear() % 100; // Get last 2 digits of year
  const yearPrefix = `SQTE-${currentYear.toString().padStart(2, '0')}`;
  
  if (!lastNumber || !lastNumber.startsWith(yearPrefix)) {
    return `${yearPrefix}001`;
  }
  
  const match = lastNumber.match(/SQTE-\d{2}(\d+)/);
  if (!match) return `${yearPrefix}001`;
  
  const nextNum = parseInt(match[1]) + 1;
  return `${yearPrefix}${nextNum.toString().padStart(3, '0')}`;
}

/**
 * Generate next sales order number in SORD-YYNNN format
 */
export function generateSalesOrderNumber(lastNumber: string | null): string {
  const currentYear = new Date().getFullYear() % 100; // Get last 2 digits of year
  const yearPrefix = `SORD-${currentYear.toString().padStart(2, '0')}`;
  
  if (!lastNumber || !lastNumber.startsWith(yearPrefix)) {
    return `${yearPrefix}001`;
  }
  
  const match = lastNumber.match(/SORD-\d{2}(\d+)/);
  if (!match) return `${yearPrefix}001`;
  
  const nextNum = parseInt(match[1]) + 1;
  return `${yearPrefix}${nextNum.toString().padStart(3, '0')}`;
}

/**
 * Generate next purchase order number in PO-YYNNN format
 */
export function generatePurchaseOrderNumber(lastNumber: string | null): string {
  const currentYear = new Date().getFullYear() % 100; // Get last 2 digits of year
  const yearPrefix = `PO-${currentYear.toString().padStart(2, '0')}`;
  
  if (!lastNumber || !lastNumber.startsWith(yearPrefix)) {
    return `${yearPrefix}001`;
  }
  
  const match = lastNumber.match(/PO-\d{2}(\d+)/);
  if (!match) return `${yearPrefix}001`;
  
  const nextNum = parseInt(match[1]) + 1;
  return `${yearPrefix}${nextNum.toString().padStart(3, '0')}`;
}

/**
 * Generate next supplier number in V000X format
 */
export function generateSupplierNumber(lastNumber: string | null): string {
  if (!lastNumber) return "V0001";
  
  const match = lastNumber.match(/V(\d+)/);
  if (!match) return "V0001";
  
  const nextNum = parseInt(match[1]) + 1;
  return `V${nextNum.toString().padStart(4, '0')}`;
}

/**
 * Extract readable ID from full object for display in tables
 */
export function extractDisplayId(item: any): string {
  // RFQ SQTE Number (prioritize over other checks since RFQs are key objects)
  if (item.sqteNumber) return item.sqteNumber;
  
  // Customer/Company
  if (item.customerNumber) return formatCustomerNumber(item.customerNumber);
  
  // Sales Quote
  if (item.quoteNumber) return formatSalesQuoteNumber(item.quoteNumber);
  
  // Sales Order
  if (item.orderNumber && item.orderNumber.startsWith('SORD')) return formatSalesOrderNumber(item.orderNumber);
  
  // Purchase Order  
  if (item.orderNumber && item.orderNumber.startsWith('PO')) return formatPurchaseOrderNumber(item.orderNumber);
  
  // Supplier
  if (item.supplierNumber) return formatSupplierNumber(item.supplierNumber);
  
  // Fallback to first 8 characters of ID if no formatted number exists
  if (item.id) return item.id.substring(0, 8);
  
  return "N/A";
}