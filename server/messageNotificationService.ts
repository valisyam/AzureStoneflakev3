import { db } from './db';
import { messages, users } from '../shared/schema';
import { eq, and, lt, sql, isNull, or } from 'drizzle-orm';
import { emailService } from './emailService';

interface UnreadMessageData {
  messageId: string;
  receiverId: string;
  receiverName: string;
  receiverEmail: string;
  receiverRole: 'customer' | 'supplier';
  senderId: string;
  senderName: string;
  content: string;
  createdAt: Date;
  emailNotificationSent: boolean;
}

class MessageNotificationService {
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    // Start the notification checker
    this.start();
  }

  start() {
    if (this.isRunning) {
      console.log('📧 Message notification service is already running');
      return;
    }

    this.isRunning = true;
    console.log('📧 Starting message notification service - checking every 5 minutes');

    // Check immediately on start
    this.checkAndSendNotifications();

    // Then check every 5 minutes
    this.intervalId = setInterval(() => {
      this.checkAndSendNotifications();
    }, 5 * 60 * 1000); // 5 minutes
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('📧 Message notification service stopped');
  }

  async checkAndSendNotifications() {
    try {
      console.log('📧 Checking for unread messages older than 30 minutes...');
      
      // Calculate 30 minutes ago
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);

      // Find unread messages older than 30 minutes that haven't had email notifications sent
      const unreadMessages = await db
        .select({
          messageId: messages.id,
          receiverId: messages.receiverId,
          receiverName: sql`receiver.name`.as('receiverName'),
          receiverEmail: sql`receiver.email`.as('receiverEmail'),
          receiverRole: sql`receiver.role`.as('receiverRole'),
          senderId: messages.senderId,
          senderName: sql`sender.name`.as('senderName'),
          content: messages.content,
          createdAt: messages.createdAt,
          emailNotificationSent: messages.emailNotificationSent,
        })
        .from(messages)
        .innerJoin(sql`${users} AS receiver`, sql`receiver.id = ${messages.receiverId}`)
        .innerJoin(sql`${users} AS sender`, sql`sender.id = ${messages.senderId}`)
        .where(
          and(
            eq(messages.isRead, false), // Message is unread
            lt(messages.createdAt, thirtyMinsAgo), // Older than 30 minutes
            or(
              eq(messages.emailNotificationSent, false), // No email sent yet
              isNull(messages.emailNotificationSent) // or field is null
            ),
            // Don't send notifications for admin messages (they see messages in real-time)
            sql`receiver.role != 'admin'`
          )
        )
        .orderBy(messages.receiverId, messages.createdAt);

      if (unreadMessages.length === 0) {
        console.log('📧 No unread messages requiring notifications found');
        return;
      }

      console.log(`📧 Found ${unreadMessages.length} unread messages requiring notifications`);

      // Group messages by receiver to send one email per user
      const messagesByReceiver = new Map<string, UnreadMessageData[]>();
      
      for (const message of unreadMessages) {
        const receiverId = message.receiverId;
        if (!messagesByReceiver.has(receiverId)) {
          messagesByReceiver.set(receiverId, []);
        }
        messagesByReceiver.get(receiverId)!.push(message as UnreadMessageData);
      }

      // Send notifications to each receiver
      for (const [receiverId, userMessages] of Array.from(messagesByReceiver.entries())) {
        try {
          const firstMessage = userMessages[0];
          const messageCount = userMessages.length;
          const latestMessage = userMessages[userMessages.length - 1];

          console.log(`📧 Sending notification to ${firstMessage.receiverEmail} for ${messageCount} unread message(s)`);

          // Send email notification
          const emailSent = await emailService.sendUnreadMessageNotification(
            firstMessage.receiverEmail,
            firstMessage.receiverName,
            firstMessage.receiverRole,
            messageCount,
            latestMessage.content,
            latestMessage.senderName
          );

          if (emailSent) {
            // Mark all messages for this user as having email notification sent
            const messageIds = userMessages.map((msg: UnreadMessageData) => msg.messageId);
            console.log(`📧 Marking ${messageIds.length} messages as notified:`, messageIds);
            
            // Update each message individually to avoid SQL array issues
            let successCount = 0;
            for (const messageId of messageIds) {
              try {
                await db
                  .update(messages)
                  .set({
                    emailNotificationSent: true,
                    emailNotificationSentAt: new Date(),
                  })
                  .where(eq(messages.id, messageId));
                successCount++;
                console.log(`✅ Updated message ${messageId} notification status`);
              } catch (updateError) {
                console.error(`❌ Failed to update message ${messageId}:`, updateError);
              }
            }

            console.log(`✅ Email notification sent to ${firstMessage.receiverEmail} and ${successCount}/${messageCount} message(s) marked`);
          } else {
            console.log(`❌ Failed to send email notification to ${firstMessage.receiverEmail}`);
          }
        } catch (error) {
          const firstMessage = userMessages[0];
          console.error(`❌ Error sending notification to ${firstMessage.receiverEmail}:`, error);
        }
      }

    } catch (error) {
      console.error('❌ Error in message notification service:', error);
    }
  }

  // Method to manually trigger notification check (for testing)
  async triggerNotificationCheck() {
    console.log('📧 Manually triggering notification check...');
    await this.checkAndSendNotifications();
  }
}

// Create and export singleton instance
export const messageNotificationService = new MessageNotificationService();

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('📧 Shutting down message notification service...');
  messageNotificationService.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('📧 Shutting down message notification service...');
  messageNotificationService.stop();
  process.exit(0);
});