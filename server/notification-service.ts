import webpush from 'web-push';
import cron from 'node-cron';
import { db } from './db.js';
import { serviceReminders, services, customers, vehicles, pushSubscriptions, users } from '../shared/schema.js';
import { eq, and, lte, sql } from 'drizzle-orm';

// Configure web-push
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@carhub.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
}

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

  // Create a service reminder
  async createServiceReminder(serviceId: number, reminderMinutes: number) {
    try {
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

      // Only create reminder if it's in the future
      if (reminderTime > new Date()) {
        await db.execute(sql`
          INSERT INTO service_reminders (service_id, reminder_minutes, scheduled_for, notification_sent)
          VALUES (${serviceId}, ${reminderMinutes}, ${reminderTime}, false)
        `);

        console.log(`Service reminder created for service ${serviceId} at ${reminderTime}`);
        return true;
      }

      return false;
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
      const userSubscriptions = await db.execute(sql`
        SELECT * FROM push_subscriptions WHERE user_id = ${userId}
      `);

      if (userSubscriptions.rows.length === 0) {
        console.log(`No push subscriptions found for user ${userId}`);
        return false;
      }

      const promises = userSubscriptions.rows.map(async (subscription: any) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            JSON.stringify(payload)
          );
          console.log(`Notification sent to user ${userId}`);
        } catch (error: any) {
          console.error(`Failed to send notification to user ${userId}:`, error);
          // If subscription is invalid, remove it
          if (error.statusCode === 410 || error.statusCode === 404) {
            await db.execute(sql`
              DELETE FROM push_subscriptions WHERE id = ${subscription.id}
            `);
          }
        }
      });

      await Promise.allSettled(promises);
      return true;
    } catch (error) {
      console.error('Error sending notification to user:', error);
      return false;
    }
  }

  // Send reminder notifications
  async sendServiceReminders() {
    try {
      const now = new Date();
      
      // Get pending reminders that should be sent now
      const pendingReminders = await db.query.serviceReminders.findMany({
        where: and(
          eq(serviceReminders.notificationSent, false),
          lte(serviceReminders.scheduledFor, now)
        ),
        with: {
          service: {
            with: {
              customer: true,
              vehicle: true,
              technician: true,
            }
          }
        }
      });

      console.log(`Found ${pendingReminders.length} pending reminders to process`);

      for (const reminder of pendingReminders) {
        const service = reminder.service;
        
        if (!service.customer || !service.vehicle) {
          continue;
        }

        // Send notification to technician if assigned
        if (service.technicianId) {
          const payload = {
            title: '🔔 Lembrete de Serviço',
            body: `Serviço agendado em ${reminder.reminderMinutes} min: ${service.customer.name} - ${service.vehicle.brand} ${service.vehicle.model} (${service.vehicle.licensePlate})`,
            data: {
              serviceId: service.id,
              type: 'service_reminder',
              customerId: service.customerId,
              vehicleId: service.vehicleId,
            }
          };

          await this.sendNotificationToUser(service.technicianId, payload);
        }

        // Send notification to all admin users
        const adminUsers = await db.query.users.findMany({
          where: eq(users.role, 'admin')
        });

        for (const admin of adminUsers) {
          const payload = {
            title: '🔔 Lembrete de Serviço',
            body: `Serviço agendado em ${reminder.reminderMinutes} min: ${service.customer.name} - ${service.vehicle.brand} ${service.vehicle.model} (${service.vehicle.licensePlate})`,
            data: {
              serviceId: service.id,
              type: 'service_reminder',
              customerId: service.customerId,
              vehicleId: service.vehicleId,
            }
          };

          await this.sendNotificationToUser(admin.id, payload);
        }

        // Mark reminder as sent
        await db.update(serviceReminders)
          .set({ notificationSent: true })
          .where(eq(serviceReminders.id, reminder.id));

        console.log(`Processed reminder for service ${service.id}`);
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
    return process.env.VAPID_PUBLIC_KEY || 'BHfIRCvKu3LHHrYf4MPaPuMgCjRTz-Ty0Dn17W0EyoEfEEWzglJb8daT8O7HlH9U5oi-FIJVJBLaBB6HAVCFFYY';
  }
}

export const notificationService = new NotificationService();