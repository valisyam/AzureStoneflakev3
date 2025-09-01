import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

const ADMIN_EMAIL = 'vineeth@stone-flake.com';
const FROM_EMAIL = 'info@stone-flake.com';

interface NotificationData {
  type: 'signup' | 'rfq_submission';
  userEmail: string;
  userName?: string;
  userRole?: string;
  company?: string;
  rfqDetails?: {
    projectName: string;
    material: string;
    quantity: number;
    manufacturingProcess?: string;
  };
}

interface SupplierRfqNotificationData {
  supplierEmail: string;
  supplierName?: string;
  rfqDetails: {
    id: string;
    projectName: string;
    material: string;
    quantity: number;
    manufacturingProcess?: string;
    referenceNumber?: string;
  };
}

interface CustomerQuoteNotificationData {
  customerEmail: string;
  customerName?: string;
  quoteDetails: {
    id: string;
    projectName: string;
    totalPrice: number;
    deliveryDate?: string;
    rfqId: string;
  };
}

export async function sendAdminNotification(data: NotificationData): Promise<boolean> {
  try {
    let subject: string;
    let html: string;

    if (data.type === 'signup') {
      subject = `New ${data.userRole} Registration - ${data.userName || data.userEmail}`;
      html = generateSignupEmailTemplate(data);
    } else if (data.type === 'rfq_submission') {
      subject = `New RFQ Submission - ${data.rfqDetails?.projectName}`;
      html = generateRfqEmailTemplate(data);
    } else {
      console.error('Unknown notification type:', data.type);
      return false;
    }

    await mailService.send({
      to: ADMIN_EMAIL,
      from: FROM_EMAIL,
      subject,
      html,
    });

    console.log(`Admin notification sent successfully for ${data.type}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

function generateSignupEmailTemplate(data: NotificationData): string {
  const roleCapitalized = data.userRole ? data.userRole.charAt(0).toUpperCase() + data.userRole.slice(1) : 'User';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New ${roleCapitalized} Registration</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0d9488, #1e40af); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; }
        .info-box { background: white; padding: 15px; border-radius: 6px; margin: 10px 0; border-left: 4px solid #0d9488; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 New ${roleCapitalized} Registration</h1>
          <p>A new ${data.userRole} has registered on S-Hub platform</p>
        </div>
        <div class="content">
          <div class="info-box">
            <h3>Registration Details</h3>
            <p><strong>Name:</strong> ${data.userName || 'Not provided'}</p>
            <p><strong>Email:</strong> ${data.userEmail}</p>
            <p><strong>Role:</strong> ${roleCapitalized}</p>
            ${data.company ? `<p><strong>Company:</strong> ${data.company}</p>` : ''}
            <p><strong>Registration Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="info-box">
            <h3>Next Steps</h3>
            <p>• Review the new ${data.userRole || 'user'} profile in the admin dashboard</p>
            <p>• Verify company information and link to appropriate customer/supplier ID</p>
            ${data.userRole === 'supplier' ? '• Review supplier capabilities and certifications' : ''}
            ${data.userRole === 'customer' ? '• Assign customer number and company association' : ''}
          </div>
        </div>
        <div class="footer">
          <p>This is an automated notification from S-Hub by Stoneflake</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateRfqEmailTemplate(data: NotificationData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New RFQ Submission</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0d9488, #1e40af); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; }
        .info-box { background: white; padding: 15px; border-radius: 6px; margin: 10px 0; border-left: 4px solid #0d9488; }
        .urgent { border-left-color: #dc2626; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 New RFQ Submission</h1>
          <p>A customer has submitted a new Request for Quote</p>
        </div>
        <div class="content">
          <div class="info-box urgent">
            <h3>⚡ Action Required</h3>
            <p>New RFQ needs review and supplier assignment</p>
            <p><strong>Project:</strong> ${data.rfqDetails?.projectName}</p>
            <p><strong>Submitted by:</strong> ${data.userName || data.userEmail}</p>
          </div>

          <div class="info-box">
            <h3>RFQ Details</h3>
            <p><strong>Project Name:</strong> ${data.rfqDetails?.projectName}</p>
            <p><strong>Material:</strong> ${data.rfqDetails?.material}</p>
            <p><strong>Quantity:</strong> ${data.rfqDetails?.quantity}</p>
            ${data.rfqDetails?.manufacturingProcess ? `<p><strong>Manufacturing Process:</strong> ${data.rfqDetails.manufacturingProcess}</p>` : ''}
            <p><strong>Customer:</strong> ${data.userName || data.userEmail}</p>
            ${data.company ? `<p><strong>Company:</strong> ${data.company}</p>` : ''}
            <p><strong>Submission Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="info-box">
            <h3>Next Steps</h3>
            <p>• Review RFQ details and uploaded files in admin dashboard</p>
            <p>• Modify drawings if necessary</p>
            <p>• Select qualified suppliers for assignment</p>
            <p>• Send RFQ to suppliers for quotes</p>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated notification from S-Hub by Stoneflake</p>
          <p>Log in to the admin dashboard to review and assign this RFQ</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendSupplierRfqNotification(data: SupplierRfqNotificationData): Promise<boolean> {
  try {
    const subject = `New RFQ Assignment - ${data.rfqDetails.projectName}`;
    const html = generateSupplierRfqEmailTemplate(data);

    await mailService.send({
      to: data.supplierEmail,
      from: FROM_EMAIL,
      subject,
      html,
    });

    console.log(`Supplier RFQ notification sent successfully to ${data.supplierEmail}`);
    return true;
  } catch (error) {
    console.error('SendGrid supplier RFQ email error:', error);
    return false;
  }
}

export async function sendCustomerQuoteNotification(data: CustomerQuoteNotificationData): Promise<boolean> {
  try {
    const subject = `Quote Ready - ${data.quoteDetails.projectName}`;
    const html = generateCustomerQuoteEmailTemplate(data);

    await mailService.send({
      to: data.customerEmail,
      from: FROM_EMAIL,
      subject,
      html,
    });

    console.log(`Customer quote notification sent successfully to ${data.customerEmail}`);
    return true;
  } catch (error) {
    console.error('SendGrid customer quote email error:', error);
    return false;
  }
}

function generateSupplierRfqEmailTemplate(data: SupplierRfqNotificationData): string {
  const portalLink = `https://hub.stoneflake.co/supplier/rfqs/${data.rfqDetails.id}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New RFQ Assignment</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #7c3aed, #1e40af); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; }
        .info-box { background: white; padding: 15px; border-radius: 6px; margin: 10px 0; border-left: 4px solid #7c3aed; }
        .action-button { 
          display: inline-block; 
          background: linear-gradient(135deg, #7c3aed, #5b21b6); 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 6px; 
          font-weight: bold; 
          margin: 10px 0;
        }
        .urgent { border-left-color: #dc2626; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 New RFQ Assignment</h1>
          <p>You have been selected to quote on a new manufacturing project</p>
        </div>
        <div class="content">
          <div class="info-box urgent">
            <h3>⚡ Action Required</h3>
            <p>Please review the RFQ details and submit your quote</p>
            ${data.rfqDetails.referenceNumber ? `<p><strong>Reference:</strong> ${data.rfqDetails.referenceNumber}</p>` : ''}
            <p><strong>Project:</strong> ${data.rfqDetails.projectName}</p>
          </div>

          <div class="info-box">
            <h3>Project Details</h3>
            <p><strong>Project Name:</strong> ${data.rfqDetails.projectName}</p>
            <p><strong>Material:</strong> ${data.rfqDetails.material}</p>
            <p><strong>Quantity:</strong> ${data.rfqDetails.quantity}</p>
            ${data.rfqDetails.manufacturingProcess ? `<p><strong>Manufacturing Process:</strong> ${data.rfqDetails.manufacturingProcess}</p>` : ''}
            <p><strong>Assignment Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="info-box" style="text-align: center;">
            <h3>Submit Your Quote</h3>
            <p>Click the button below to access the RFQ details and submit your competitive quote</p>
            <a href="${portalLink}" class="action-button">View RFQ & Submit Quote</a>
            <p style="font-size: 12px; color: #666; margin-top: 10px;">
              Link: <a href="${portalLink}">${portalLink}</a>
            </p>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated notification from S-Hub by Stoneflake</p>
          <p>Please log in to your supplier portal to view complete RFQ details and submit your quote</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateCustomerQuoteEmailTemplate(data: CustomerQuoteNotificationData): string {
  const portalLink = `https://hub.stoneflake.co/quotes/${data.quoteDetails.id}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Quote Ready</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0d9488, #1e40af); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; }
        .info-box { background: white; padding: 15px; border-radius: 6px; margin: 10px 0; border-left: 4px solid #0d9488; }
        .action-button { 
          display: inline-block; 
          background: linear-gradient(135deg, #0d9488, #0891b2); 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 6px; 
          font-weight: bold; 
          margin: 10px 0;
        }
        .price-highlight { 
          background: linear-gradient(135deg, #f59e0b, #d97706); 
          color: white; 
          padding: 15px; 
          border-radius: 8px; 
          text-align: center; 
          font-size: 18px; 
          font-weight: bold; 
          margin: 15px 0;
        }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💰 Your Quote is Ready</h1>
          <p>We've prepared a competitive quote for your manufacturing project</p>
        </div>
        <div class="content">
          <div class="info-box">
            <h3>Quote Details</h3>
            <p><strong>Project:</strong> ${data.quoteDetails.projectName}</p>
            ${data.customerName ? `<p><strong>Customer:</strong> ${data.customerName}</p>` : ''}
            <p><strong>Quote Date:</strong> ${new Date().toLocaleString()}</p>
          </div>

          <div class="price-highlight">
            Total Quote: $${data.quoteDetails.totalPrice.toLocaleString()}
            ${data.quoteDetails.deliveryDate ? `<br><small>Estimated Delivery: ${data.quoteDetails.deliveryDate}</small>` : ''}
          </div>
          
          <div class="info-box" style="text-align: center;">
            <h3>Review & Accept Quote</h3>
            <p>View complete quote details, specifications, and terms</p>
            <a href="${portalLink}" class="action-button">View Quote Details</a>
            <p style="font-size: 12px; color: #666; margin-top: 10px;">
              Link: <a href="${portalLink}">${portalLink}</a>
            </p>
          </div>

          <div class="info-box">
            <h3>Next Steps</h3>
            <p>• Review the complete quote and specifications</p>
            <p>• Accept the quote to proceed with your order</p>
            <p>• Contact us with any questions or modifications needed</p>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated notification from S-Hub by Stoneflake</p>
          <p>Log in to your customer portal to view complete quote details</p>
        </div>
      </div>
    </body>
    </html>
  `;
}