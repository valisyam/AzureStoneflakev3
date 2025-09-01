import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private readonly fromEmail = 'info@stone-flake.com';
  private readonly fromName = 'S-Hub by Stoneflake';

  // Password Reset Email
  async sendPasswordResetEmail(email: string, resetCode: string, role: string): Promise<boolean> {
    const roleText = role === 'supplier' ? 'Supplier' : 'Customer';
    // Generate proper HTTPS URL for production and development
    let baseUrl = 'http://localhost:5000';
    if (process.env.REPLIT_DOMAINS) {
      // Use the first domain from REPLIT_DOMAINS (could be production or development)
      const domain = process.env.REPLIT_DOMAINS.split(',')[0];
      baseUrl = `https://${domain}`;
    } else if (process.env.REPL_ID) {
      // Fallback for development environment
      baseUrl = `https://${process.env.REPL_ID}.${process.env.REPLIT_DEV_DOMAIN || 'replit.dev'}`;
    }
    
    const resetUrl = `${baseUrl}/reset-password?email=${encodeURIComponent(email)}&role=${role}&code=${resetCode}`;
    
    const subject = `Password Reset Request - S-Hub ${roleText} Portal`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">S-Hub by Stoneflake</h1>
          <p style="color: #e0e7ff; margin: 5px 0 0;">Manufacturing Portal</p>
        </div>
        
        <div style="background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 15px; padding: 30px; margin-bottom: 30px;">
          <h2 style="color: white; margin-top: 0;">Password Reset Request</h2>
          
          <p style="color: #e0e7ff; line-height: 1.6; margin-bottom: 20px;">
            Hello,
          </p>
          
          <p style="color: #e0e7ff; line-height: 1.6; margin-bottom: 20px;">
            We received a request to reset your password for your S-Hub ${roleText} Portal account.
          </p>
          
          <div style="background: rgba(255, 255, 255, 0.2); border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="color: white; margin: 0 0 10px; font-weight: bold;">Your reset verification code:</p>
            <div style="font-size: 32px; font-weight: bold; color: #fbbf24; letter-spacing: 3px; margin: 10px 0;">${resetCode}</div>
          </div>
          
          <p style="color: #e0e7ff; line-height: 1.6; margin-bottom: 20px;">
            Or click the link below to reset your password directly:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: linear-gradient(45deg, #fbbf24, #f59e0b); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);">
              Reset Password
            </a>
          </div>
          
          <p style="color: #e0e7ff; line-height: 1.6; font-size: 14px; margin-bottom: 0;">
            This code will expire in 10 minutes. If you didn't request this password reset, please ignore this email.
          </p>
        </div>
        
        <div style="text-align: center; color: #cbd5e1; font-size: 12px;">
          <p>S-Hub by Stoneflake Manufacturing Portal</p>
          <p>Streamlining Manufacturing Communications</p>
        </div>
      </div>
    `;
    
    return await this.sendEmail({ to: email, subject, html });
  }

  async sendEmail({ to, subject, html, text }: EmailTemplate): Promise<boolean> {
    try {
      const msg = {
        to,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
      };

      console.log('📧 Preparing to send email with SendGrid:', {
        to,
        from: this.fromEmail,
        subject,
        hasApiKey: !!process.env.SENDGRID_API_KEY
      });

      const result = await sgMail.send(msg);
      console.log(`✅ Email sent successfully to ${to}`, result[0]?.statusCode);
      return true;
    } catch (error: any) {
      console.error('❌ SendGrid email error:', {
        message: error.message,
        code: error.code,
        statusCode: error.response?.status,
        body: error.response?.body,
        to,
        subject
      });
      
      // Check for specific SendGrid errors
      if (error.response?.body?.errors) {
        console.error('❌ SendGrid API errors:', error.response.body.errors);
      }
      
      return false;
    }
  }

  // RFQ Assignment Notification Email
  async sendRfqAssignmentNotification(
    supplierEmail: string,
    supplierName: string,
    rfqData: {
      projectName: string;
      material: string;
      quantity: number;
      tolerance: string;
      manufacturingProcess?: string;
      notes?: string;
    }
  ): Promise<boolean> {
    const subject = `New RFQ Assignment - ${rfqData.projectName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New RFQ Assignment</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f97316, #dc2626); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: linear-gradient(135deg, #f97316, #dc2626); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .rfq-details { background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 8px 0; }
            .label { font-weight: bold; color: #374151; }
            .value { color: #6b7280; }
            .highlight { color: #f97316; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔧 New RFQ Assignment</h1>
              <p>S-Hub Manufacturing Portal</p>
            </div>
            
            <div class="content">
              <h2>Hello ${supplierName},</h2>
              
              <p>You have received a new RFQ assignment from <strong>Stoneflake</strong>. This is an opportunity to submit a competitive quote for a manufacturing project.</p>
              
              <div class="rfq-details">
                <h3>📋 RFQ Details</h3>
                <div class="detail-row">
                  <span class="label">Project Name:</span>
                  <span class="value highlight">${rfqData.projectName}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Material:</span>
                  <span class="value">${rfqData.material}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Quantity:</span>
                  <span class="value">${rfqData.quantity}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Tolerance:</span>
                  <span class="value">${rfqData.tolerance}</span>
                </div>
                ${rfqData.manufacturingProcess ? `
                <div class="detail-row">
                  <span class="label">Manufacturing Process:</span>
                  <span class="value">${rfqData.manufacturingProcess}</span>
                </div>
                ` : ''}
                ${rfqData.notes ? `
                <div class="detail-row">
                  <span class="label">Additional Requirements:</span>
                  <span class="value">${rfqData.notes}</span>
                </div>
                ` : ''}
              </div>
              
              <p><strong>⏰ Next Steps:</strong></p>
              <ol>
                <li>Log in to your S-Hub supplier portal</li>
                <li>Review the complete RFQ details and attached files</li>
                <li>Submit your competitive quote with pricing and lead time</li>
                <li>Await notification of quote acceptance</li>
              </ol>
              
              <div style="text-align: center;">
                <a href="${process.env.CLIENT_URL || 'https://hub.stoneflake.co'}" class="button">
                  🚀 Open S-Hub Portal
                </a>
              </div>
              
              <p><em>💡 Tip: Complete your supplier profile to receive more RFQ opportunities. Suppliers with higher profile completion rates receive priority consideration.</em></p>
            </div>
            
            <div class="footer">
              <p><strong>S-Hub by Stoneflake</strong><br>
              Digital Manufacturing Platform</p>
              <p>Need help? Contact us at support@stoneflake.co</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: supplierEmail,
      subject,
      html
    });
  }

  // Quote Status Update Notification
  async sendQuoteStatusNotification(
    supplierEmail: string,
    supplierName: string,
    projectName: string,
    status: 'accepted' | 'rejected',
    quoteAmount?: number
  ): Promise<boolean> {
    const isAccepted = status === 'accepted';
    const subject = `Quote ${isAccepted ? 'Accepted' : 'Declined'} - ${projectName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Quote Status Update</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${isAccepted ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)'}; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: linear-gradient(135deg, #f97316, #dc2626); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .status-box { background: ${isAccepted ? '#ecfdf5' : '#fef2f2'}; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid ${isAccepted ? '#10b981' : '#ef4444'}; }
            .highlight { font-weight: bold; color: ${isAccepted ? '#10b981' : '#ef4444'}; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${isAccepted ? '🎉 Quote Accepted!' : '📋 Quote Update'}</h1>
              <p>S-Hub Manufacturing Portal</p>
            </div>
            
            <div class="content">
              <h2>Hello ${supplierName},</h2>
              
              <div class="status-box">
                <h3>${isAccepted ? '✅ Congratulations!' : '📝 Quote Status Update'}</h3>
                <p>Your quote for <strong>${projectName}</strong> has been <span class="highlight">${isAccepted ? 'ACCEPTED' : 'DECLINED'}</span>.</p>
                ${quoteAmount ? `<p>Quote Amount: <strong>$${quoteAmount}</strong></p>` : ''}
              </div>
              
              ${isAccepted ? `
                <p><strong>🚀 Next Steps:</strong></p>
                <ol>
                  <li>You will receive a purchase order shortly</li>
                  <li>Begin material procurement and production planning</li>
                  <li>Keep Stoneflake updated on progress milestones</li>
                  <li>Maintain quality standards as specified</li>
                </ol>
                
                <p><em>Thank you for your competitive quote. We look forward to working with you on this project!</em></p>
              ` : `
                <p>Thank you for your quote submission. While we won't be moving forward with your quote for this project, we appreciate your participation and encourage you to continue submitting quotes for future opportunities.</p>
                
                <p><em>💡 Keep your supplier profile updated and complete to maximize your chances for future RFQ assignments.</em></p>
              `}
              
              <div style="text-align: center;">
                <a href="${process.env.CLIENT_URL || 'https://hub.stoneflake.co'}" class="button">
                  📊 View Dashboard
                </a>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>S-Hub by Stoneflake</strong><br>
              Digital Manufacturing Platform</p>
              <p>Need help? Contact us at support@stoneflake.co</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: supplierEmail,
      subject,
      html
    });
  }

  // Quote Accepted Notification Email
  async sendQuoteAcceptedNotification(email: string, supplierName: string, quoteDetails: {
    projectName: string;
    quoteAmount: string;
    leadTime: number;
  }): Promise<boolean> {
    const subject = `Update on your quote for Stoneflake - ${quoteDetails.projectName} - ACCEPTED`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">S-Hub by Stoneflake</h1>
          <p style="color: #a7f3d0; margin: 5px 0 0;">Manufacturing Portal</p>
        </div>
        
        <div style="background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 15px; padding: 30px;">
          <h2 style="color: white; margin-top: 0;">🎉 Your Quote Has Been Accepted!</h2>
          
          <p style="color: #a7f3d0; line-height: 1.6; margin-bottom: 20px;">
            Hello ${supplierName},
          </p>
          
          <p style="color: #a7f3d0; line-height: 1.6; margin-bottom: 20px;">
            Great news! Your quote has been accepted:
          </p>
          
          <div style="background: rgba(255, 255, 255, 0.2); border-radius: 10px; padding: 20px; margin: 20px 0;">
            <p style="color: white; margin: 5px 0;"><strong>Project:</strong> ${quoteDetails.projectName}</p>
            <p style="color: white; margin: 5px 0;"><strong>Quote Amount:</strong> $${quoteDetails.quoteAmount}</p>
            <p style="color: white; margin: 5px 0;"><strong>Lead Time:</strong> ${quoteDetails.leadTime} days</p>
          </div>
          
          <p style="color: #a7f3d0; line-height: 1.6;">
            A purchase order will be sent to you shortly with detailed specifications.
          </p>
        </div>
      </div>
    `;
    
    const text = `Hello ${supplierName}, Your quote for ${quoteDetails.projectName} has been accepted. Purchase order coming soon.`;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  // Purchase Order Notification Email
  async sendPurchaseOrderNotification(email: string, supplierName: string, poDetails: {
    orderNumber: string;
    projectName: string;
    totalAmount: string;
    deliveryDate: Date | null;
  }): Promise<boolean> {
    const subject = `Purchase Order ${poDetails.orderNumber} - S-Hub`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">S-Hub by Stoneflake</h1>
          <p style="color: #bfdbfe; margin: 5px 0 0;">Manufacturing Portal</p>
        </div>
        
        <div style="background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 15px; padding: 30px;">
          <h2 style="color: white; margin-top: 0;">📋 New Purchase Order</h2>
          
          <p style="color: #bfdbfe; line-height: 1.6; margin-bottom: 20px;">
            Hello ${supplierName},
          </p>
          
          <div style="background: rgba(255, 255, 255, 0.2); border-radius: 10px; padding: 20px; margin: 20px 0;">
            <p style="color: white; margin: 5px 0;"><strong>Order:</strong> ${poDetails.orderNumber}</p>
            <p style="color: white; margin: 5px 0;"><strong>Project:</strong> ${poDetails.projectName}</p>
            <p style="color: white; margin: 5px 0;"><strong>Amount:</strong> $${poDetails.totalAmount}</p>
            ${poDetails.deliveryDate ? `<p style="color: white; margin: 5px 0;"><strong>Delivery:</strong> ${poDetails.deliveryDate.toLocaleDateString()}</p>` : ''}
          </div>
          
          <p style="color: #bfdbfe; line-height: 1.6;">
            Please log in to your supplier portal to view details and accept the order.
          </p>
        </div>
      </div>
    `;
    
    const text = `Hello ${supplierName}, Purchase order ${poDetails.orderNumber} has been created for ${poDetails.projectName}.`;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  // Quote Not Selected Email
  async sendQuoteNotSelectedNotification(
    email: string,
    supplierName: string,
    quoteDetails: {
      projectName: string;
      quoteAmount: string;
      adminFeedback?: string;
    }
  ): Promise<boolean> {
    const subject = `Update on your quote for Stoneflake - ${quoteDetails.projectName}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">S-Hub by Stoneflake</h1>
          <p style="color: #fed7aa; margin: 5px 0 0;">Manufacturing Portal</p>
        </div>
        
        <div style="background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 15px; padding: 30px;">
          <h2 style="color: white; margin-top: 0;">📋 Update on Your Quote</h2>
          
          <p style="color: #fed7aa; line-height: 1.6; margin-bottom: 20px;">
            Hello ${supplierName},
          </p>
          
          <p style="color: #fed7aa; line-height: 1.6; margin-bottom: 20px;">
            Thank you for submitting your quote for <strong style="color: white;">${quoteDetails.projectName}</strong>. 
            While your quote was not selected for this particular project, we truly appreciate 
            your participation and the effort you put into preparing your proposal.
          </p>
          
          <div style="background: rgba(255, 255, 255, 0.2); border-radius: 10px; padding: 20px; margin: 20px 0;">
            <p style="color: white; margin: 5px 0;"><strong>Project:</strong> ${quoteDetails.projectName}</p>
            <p style="color: white; margin: 5px 0;"><strong>Your Quote Amount:</strong> $${quoteDetails.quoteAmount}</p>
            <p style="color: white; margin: 5px 0;"><strong>Status:</strong> Not Selected</p>
          </div>
          
          ${quoteDetails.adminFeedback ? `
            <div style="background: rgba(255, 255, 255, 0.15); border-radius: 10px; padding: 20px; margin: 20px 0;">
              <h4 style="color: white; margin-top: 0; margin-bottom: 10px;">Feedback from Our Team:</h4>
              <p style="color: #fed7aa; line-height: 1.6; margin: 0;">${quoteDetails.adminFeedback}</p>
            </div>
          ` : ''}
          
          <p style="color: #fed7aa; line-height: 1.6; margin-bottom: 10px;">
            We value our partnership with you and look forward to future opportunities to collaborate. 
            Please continue to participate in our RFQ process as new projects become available.
          </p>
          
          <p style="color: #fed7aa; line-height: 1.6; margin-bottom: 0;">
            Best regards,<br>
            <strong style="color: white;">The Stoneflake Team</strong>
          </p>
        </div>
      </div>
    `;
    
    const text = `Hello ${supplierName}, Your quote for ${quoteDetails.projectName} was not selected for this project. ${quoteDetails.adminFeedback ? 'Feedback: ' + quoteDetails.adminFeedback : ''} Thank you for your participation.`;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  // Unread Message Notification Email
  async sendUnreadMessageNotification(
    userEmail: string,
    userName: string,
    userRole: 'customer' | 'supplier',
    messageCount: number,
    latestMessageContent: string,
    senderName: string
  ): Promise<boolean> {
    const portalType = userRole === 'customer' ? 'Customer' : 'Supplier';
    const portalUrl = userRole === 'customer' 
      ? 'https://hub.stoneflake.co' 
      : 'https://hub.stoneflake.co/supplier';

    const subject = `New Message${messageCount > 1 ? 's' : ''} from Stoneflake - Action Required`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);">
        <div style="background: linear-gradient(45deg, #14b8a6, #0891b2); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">
            🔔 New Message${messageCount > 1 ? 's' : ''} from Stoneflake
          </h1>
          <p style="color: #e0f2fe; margin: 10px 0 0; font-size: 16px;">
            You have ${messageCount} unread message${messageCount > 1 ? 's' : ''} waiting for your attention
          </p>
        </div>
        
        <div style="padding: 30px;">
          <p style="color: #e0e7ff; line-height: 1.6; margin-bottom: 20px; font-size: 16px;">
            Hello ${userName},
          </p>
          
          <div style="background: rgba(255, 255, 255, 0.1); border-radius: 10px; padding: 20px; margin: 20px 0;">
            <p style="color: white; margin: 0 0 15px; font-weight: bold;">Latest Message from ${senderName}:</p>
            <div style="background: rgba(255, 255, 255, 0.1); border-left: 4px solid #14b8a6; padding: 15px; border-radius: 5px;">
              <p style="color: #e0e7ff; margin: 0; font-style: italic;">
                "${latestMessageContent.length > 150 ? latestMessageContent.substring(0, 150) + '...' : latestMessageContent}"
              </p>
            </div>
            ${messageCount > 1 ? `<p style="color: #fbbf24; margin: 15px 0 0; font-size: 14px;">+ ${messageCount - 1} more message${messageCount > 2 ? 's' : ''}</p>` : ''}
          </div>
          
          <p style="color: #e0e7ff; line-height: 1.6; margin-bottom: 30px;">
            Please log in to your ${portalType} Portal to read and respond to your messages.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${portalUrl}" style="background: linear-gradient(45deg, #14b8a6, #0891b2); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);">
              Open ${portalType} Portal
            </a>
          </div>
          
          <p style="color: #e0e7ff; line-height: 1.6; font-size: 14px; margin-bottom: 0;">
            This notification was sent because you have unread messages from over 30 minutes ago. 
            Log in to your portal to stay updated with important communications.
          </p>
        </div>
        
        <div style="text-align: center; color: #cbd5e1; font-size: 12px; padding: 20px;">
          <p>S-Hub by Stoneflake Manufacturing Portal</p>
          <p>Streamlining Manufacturing Communications</p>
        </div>
      </div>
    `;
    
    return await this.sendEmail({ to: userEmail, subject, html });
  }
}

export const emailService = new EmailService();