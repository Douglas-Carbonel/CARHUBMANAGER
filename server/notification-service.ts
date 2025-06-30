import webpush from 'web-push';
import cron from 'node-cron';
import { db } from './db.js';
import { serviceReminders, services, customers, vehicles, pushSubscriptions, users } from '../shared/schema.js';
import { eq, and, lte, sql } from 'drizzle-orm';

// Generate or use VAPID keys
let vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@carhub.com';

// Generate new VAPID keys if not provided
if (!vapidPublicKey || !vapidPrivateKey) {
  console.log('Generating new VAPID keys...');
  const vapidKeys = webpush.generateVAPIDKeys();
  vapidPublicKey = vapidKeys.publicKey;
  vapidPrivateKey = vapidKeys.privateKey;
  
  console.log('Generated VAPID keys:');
  console.log('Public Key:', vapidPublicKey);
  console.log('Private Key:', vapidPrivateKey);
  console.log('Add these to your environment variables for production');
}

webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

export class NotificationService {
  constructor() {
    this.setupCronJob();
  }

  // Generate VAPID keys if needed
  static generateVapidKeys() {
    return webpush.generateVAPIDKeys();
  }

  // Subscribe user to push notifications
  async subscribe(userId: number, subscription: {
    endpoint: string;
    p256dh: string;
    auth: string;
  }) {
    try {
      console.log('Subscribing user to push notifications:', userId);
      
      // Remove existing subscription for this user using raw SQL
      await db.execute(sql`
        DELETE FROM push_subscriptions WHERE user_id = ${userId}
      `);
      
      // Add new subscription using raw SQL
      await db.execute(sql`
        INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
        VALUES (${userId}, ${subscription.endpoint}, ${subscription.p256dh}, ${subscription.auth})
      `);
      
      console.log('User subscribed successfully:', userId);
      return true;
    } catch (error) {
      console.error('Error subscribing user:', error);
      return false;
    }
  }

  // Unsubscribe user from push notifications
  async unsubscribe(userId: number) {
    try {
      await db.execute(sql`
        DELETE FROM push_subscriptions WHERE user_id = ${userId}
      `);
      console.log(`User ${userId} unsubscribed from push notifications`);
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    }
  }

  // Create service_reminders table if it doesn't exist
  async ensureServiceRemindersTable() {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS service_reminders (
          id SERIAL PRIMARY KEY,
          service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
          reminder_minutes INTEGER NOT NULL,
          scheduled_for TIMESTAMP NOT NULL,
          notification_sent BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('service_reminders table ensured');
    } catch (error) {
      console.error('Error ensuring service_reminders table:', error);
    }
  }

  // Create a service reminder
  async createServiceReminder(serviceId: number, reminderMinutes: number) {
    try {
      // Ensure table exists
      await this.ensureServiceRemindersTable();

      // Get service details
      const service = await db.query.services.findFirst({
        where: eq(services.id, serviceId),
        with: {
          customer: true,
          vehicle: true,
        }
      });

      if (!service || !service.scheduledDate || !service.scheduledTime) {
        console.error('Service not found or missing schedule information');
        return false;
      }

      // Calculate when to send the reminder
      const scheduledDateTime = new Date(`${service.scheduledDate}T${service.scheduledTime}`);
      const reminderTime = new Date(scheduledDateTime.getTime() - (reminderMinutes * 60 * 1000));
      const now = new Date();

      console.log(`Service ${serviceId} details:`);
      console.log(`  Scheduled: ${service.scheduledDate}T${service.scheduledTime}`);
      console.log(`  Scheduled DateTime: ${scheduledDateTime}`);
      console.log(`  Reminder Time: ${reminderTime}`);
      console.log(`  Current Time: ${now}`);
      console.log(`  Reminder is in future: ${reminderTime > now}`);

      // First delete any existing reminders for this service
      await db.execute(sql`
        DELETE FROM service_reminders WHERE service_id = ${serviceId}
      `);

      // Create new reminder (allowing past dates for testing)
      await db.execute(sql`
        INSERT INTO service_reminders (service_id, reminder_minutes, scheduled_for, notification_sent)
        VALUES (${serviceId}, ${reminderMinutes}, ${reminderTime}, false)
      `);

      console.log(`Service reminder created for service ${serviceId} at ${reminderTime}`);
      
      // Verify insertion
      const insertedReminder = await db.execute(sql`
        SELECT * FROM service_reminders WHERE service_id = ${serviceId}
      `);
      console.log('Inserted reminder verification:', insertedReminder.rows);
      
      return true;
    } catch (error) {
      console.error('Error creating service reminder:', error);
      return false;
    }
  }

  // Send notification to a specific user
  async sendNotificationToUser(userId: number, payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: any;
  }) {
    try {
      console.log(`Attempting to send notification to user ${userId}`);
      console.log('Payload:', payload);
      
      const userSubscriptions = await db.execute(sql`
        SELECT * FROM push_subscriptions WHERE user_id = ${userId}
      `);

      if (userSubscriptions.rows.length === 0) {
        console.log(`No push subscriptions found for user ${userId}`);
        return false;
      }

      console.log(`Found ${userSubscriptions.rows.length} subscriptions for user ${userId}`);
      
      const promises = userSubscriptions.rows.map(async (subscription: any) => {
        try {
          console.log('Sending to endpoint:', subscription.endpoint.substring(0, 50) + '...');
          
          const result = await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            JSON.stringify(payload)
          );
          
          console.log(`✅ Notification sent successfully to user ${userId}`, result);
          return true;
        } catch (error: any) {
          console.error(`❌ Failed to send notification to user ${userId}:`, {
            statusCode: error.statusCode,
            body: error.body,
            endpoint: subscription.endpoint.substring(0, 50) + '...'
          });
          
          // If subscription is invalid, remove it
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`Removing invalid subscription for user ${userId}`);
            await db.execute(sql`
              DELETE FROM push_subscriptions WHERE id = ${subscription.id}
            `);
          }
          
          return false;
        }
      });

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
      
      console.log(`Notification sending complete: ${successful}/${results.length} successful`);
      return successful > 0;
    } catch (error) {
      console.error('Error sending notification to user:', error);
      return false;
    }
  }

  // Send reminder notifications  
  async sendServiceReminders() {
    try {
      const now = new Date();
      
      // Check if tables exist before querying
      const tableCheck = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'service_reminders'
      `);
      
      if (tableCheck.rows.length === 0) {
        console.log('service_reminders table does not exist yet');
        return false;
      }
      
      // Find reminders that should be sent now using raw SQL
      const reminders = await db.execute(sql`
        SELECT 
          sr.*,
          s.id as service_id,
          s.customer_id,
          s.vehicle_id,
          s.service_type_id,
          c.name as customer_name,
          v.brand as vehicle_brand,
          v.model as vehicle_model,
          v.license_plate as vehicle_plate,
          st.name as service_type_name
        FROM service_reminders sr
        JOIN services s ON sr.service_id = s.id
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN vehicles v ON s.vehicle_id = v.id
        LEFT JOIN service_types st ON s.service_type_id = st.id
        WHERE sr.scheduled_for <= ${now} AND sr.notification_sent = false
      `);

      console.log(`Found ${reminders.rows.length} reminders to send`);

      for (const reminder of reminders.rows) {
        const payload = {
          title: 'Lembrete de Serviço - CarHub',
          body: `${reminder.customer_name} - ${reminder.vehicle_brand} ${reminder.vehicle_model} (${reminder.vehicle_plate}) - ${reminder.service_type_name} em ${reminder.reminder_minutes} minutos`,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          data: {
            serviceId: reminder.service_id,
            type: 'service-reminder'
          }
        };

        // Send to all admin users
        const adminUsers = [1]; // Assuming admin user ID is 1
        
        for (const adminId of adminUsers) {
          await this.sendNotificationToUser(adminId, payload);
        }

        // Mark reminder as sent
        await db.execute(sql`
          UPDATE service_reminders 
          SET notification_sent = true 
          WHERE id = ${reminder.id}
        `);

        console.log(`Reminder sent for service ${reminder.service_id}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error sending service reminders:', error);
      return false;
    }
  }

  // Setup cron job to check for reminders every minute
  private setupCronJob() {
    // Run every minute
    cron.schedule('* * * * *', async () => {
      await this.sendServiceReminders();
    });

    console.log('Notification cron job scheduled - checking for reminders every minute');
  }

  // Get VAPID public key
  getVapidPublicKey() {
    return vapidPublicKey;
  }
}

export const notificationService = new NotificationService();