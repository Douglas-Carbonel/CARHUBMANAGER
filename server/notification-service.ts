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
    keys: {
      p256dh: string;
      auth: string;
    };
  }) {
    try {
      // Remove existing subscription for this user
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));

      // Add new subscription
      await db.insert(pushSubscriptions).values({
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      });

      console.log(`User ${userId} subscribed to push notifications`);
      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return false;
    }
  }

  // Unsubscribe user from push notifications
  async unsubscribe(userId: number) {
    try {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
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
        await db.insert(serviceReminders).values({
          serviceId,
          reminderMinutes,
          scheduledFor: reminderTime,
          notificationSent: false,
        });

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
    data?: any;
  }) {
    try {
      const userSubscriptions = await db.query.pushSubscriptions.findMany({
        where: eq(pushSubscriptions.userId, userId)
      });

      if (userSubscriptions.length === 0) {
        console.log(`No push subscriptions found for user ${userId}`);
        return false;
      }

      const promises = userSubscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            }
          }, JSON.stringify(payload));
          
          console.log(`Notification sent to user ${userId}`);
          return true;
        } catch (error) {
          console.error(`Failed to send notification to subscription ${sub.id}:`, error);
          
          // If subscription is invalid, remove it
          if (error.statusCode === 410) {
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
            console.log(`Removed invalid subscription ${sub.id}`);
          }
          
          return false;
        }
      });

      const results = await Promise.all(promises);
      return results.some(result => result);
    } catch (error) {
      console.error('Error sending notification:', error);
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
    return vapidPublicKey;
  }
}

export const notificationService = new NotificationService();