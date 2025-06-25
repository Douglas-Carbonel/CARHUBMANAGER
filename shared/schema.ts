import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  date,
  time,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).unique().notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  firstName: varchar('first_name'),
  lastName: varchar('last_name'),
  role: varchar('role', { enum: ['admin', 'technician'] }).default('technician'),
  isActive: boolean('is_active').default(true),
  permissions: text('permissions').array(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  code: varchar("code").unique().notNull(),
  document: varchar("document").unique(), // CPF or CNPJ
  documentType: varchar("document_type", { enum: ["cpf", "cnpj"] }),
  name: varchar("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  address: text("address"),
  city: varchar("city"),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zip_code", { length: 10 }),
  observations: text("observations"),
  loyaltyPoints: integer("loyalty_points").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  licensePlate: varchar("license_plate").unique().notNull(),
  brand: varchar("brand").notNull(),
  model: varchar("model").notNull(),
  year: integer("year").notNull(),
  color: varchar("color"),
  chassis: varchar("chassis"),
  engine: varchar("engine"),
  fuelType: varchar("fuel_type"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Unified services table (replaces both service_types and service_extras)
export const unifiedServices = pgTable("unified_services", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  defaultPrice: decimal("default_price", { precision: 10, scale: 2 }).default("0.00"),
  estimatedDuration: integer("estimated_duration"), // in minutes
  isActive: boolean("is_active").default(true),
  isRecurring: boolean("is_recurring").default(false),
  intervalMonths: integer("interval_months"),
  loyaltyPoints: integer("loyalty_points").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id).notNull(),
  serviceTypeId: integer("service_type_id"), // Keep for backward compatibility during migration - now optional
  unifiedServiceId: integer("unified_service_id").references(() => unifiedServices.id), // New reference
  technicianId: integer("technician_id").references(() => users.id),
  status: varchar("status", { 
    enum: ["scheduled", "in_progress", "completed", "cancelled"] 
  }).default("scheduled"),
  scheduledDate: date("scheduled_date"),
  scheduledTime: time("scheduled_time"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  estimatedValue: decimal("estimated_value", { precision: 10, scale: 2 }),
  finalValue: decimal("final_value", { precision: 10, scale: 2 }),
  valorPago: decimal("valor_pago", { precision: 10, scale: 2 }).default("0.00"),
  pixPago: decimal("pix_pago", { precision: 10, scale: 2 }).default("0.00"),
  dinheiroPago: decimal("dinheiro_pago", { precision: 10, scale: 2 }).default("0.00"),
  chequePago: decimal("cheque_pago", { precision: 10, scale: 2 }).default("0.00"),
  cartaoPago: decimal("cartao_pago", { precision: 10, scale: 2 }).default("0.00"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").references(() => services.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { 
    enum: ["cash", "card", "pix", "transfer"] 
  }),
  paymentDate: date("payment_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Loyalty tracking table temporarily disabled due to service type consolidation
/*
export const loyaltyTracking = pgTable("loyalty_tracking", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id).notNull(),
  serviceTypeId: integer("service_type_id").references(() => serviceTypes.id).notNull(),
  lastServiceDate: date("last_service_date").notNull(),
  nextDueDate: date("next_due_date").notNull(),
  status: varchar("status", { 
    enum: ["active", "overdue", "completed"] 
  }).default("active"),
  points: integer("points").default(0),
  notificationSent: boolean("notification_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
*/

export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  entityType: varchar("entity_type", { enum: ["customer", "vehicle", "service"] }),
  entityId: integer("entity_id"), // Now nullable for temporary photos
  category: varchar("category", { 
    enum: ["vehicle", "service", "damage", "before", "after", "other"] 
  }).default("other"),
  fileName: varchar("file_name").notNull(),
  originalName: varchar("original_name").notNull(),
  mimeType: varchar("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  url: varchar("url").notNull(),
  description: text("description"),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// New service items table to handle multiple services per appointment
export const serviceItems = pgTable("service_items", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").references(() => services.id, { onDelete: "cascade" }).notNull(),
  unifiedServiceId: integer("unified_service_id").references(() => unifiedServices.id).notNull(),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  observacao: text("observacao"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Push subscriptions table for notifications
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Service reminders table
export const serviceReminders = pgTable("service_reminders", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").references(() => services.id, { onDelete: "cascade" }).notNull(),
  reminderMinutes: integer("reminder_minutes").notNull().default(30), // 15, 30, 60, etc.
  notificationSent: boolean("notification_sent").default(false),
  scheduledFor: timestamp("scheduled_for").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const customersRelations = relations(customers, ({ many }) => ({
  vehicles: many(vehicles),
  services: many(services),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  customer: one(customers, {
    fields: [vehicles.customerId],
    references: [customers.id],
  }),
  services: many(services),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  customer: one(customers, {
    fields: [services.customerId],
    references: [customers.id],
  }),
  vehicle: one(vehicles, {
    fields: [services.vehicleId],
    references: [vehicles.id],
  }),
  unifiedService: one(unifiedServices, {
    fields: [services.unifiedServiceId],
    references: [unifiedServices.id],
  }),
  technician: one(users, {
    fields: [services.technicianId],
    references: [users.id],
  }),
  payments: many(payments),
  serviceItems: many(serviceItems),
}));

export const unifiedServicesRelations = relations(unifiedServices, ({ many }) => ({
  services: many(services),
  serviceItems: many(serviceItems),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  service: one(services, {
    fields: [payments.serviceId],
    references: [services.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  services: many(services),
}));

// Loyalty tracking relations temporarily disabled
/*
export const loyaltyTrackingRelations = relations(loyaltyTracking, ({ one }) => ({
  customer: one(customers, {
    fields: [loyaltyTracking.customerId],
    references: [customers.id],
  }),
  vehicle: one(vehicles, {
    fields: [loyaltyTracking.vehicleId],
    references: [vehicles.id],
  }),
}));
*/

export const photosRelations = relations(photos, ({ one }) => ({
  uploader: one(users, {
    fields: [photos.uploadedBy],
    references: [users.id],
  }),
}));

export const serviceItemsRelations = relations(serviceItems, ({ one }) => ({
  service: one(services, {
    fields: [serviceItems.serviceId],
    references: [services.id],
  }),
  unifiedService: one(unifiedServices, {
    fields: [serviceItems.unifiedServiceId],
    references: [unifiedServices.id],
  }),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [pushSubscriptions.userId],
    references: [users.id],
  }),
}));

export const serviceRemindersRelations = relations(serviceReminders, ({ one }) => ({
  service: one(services, {
    fields: [serviceReminders.serviceId],
    references: [services.id],
  }),
}));

// Insert schemas
export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceSchema = createInsertSchema(services).extend({
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  estimatedValue: z.string().optional(),
  finalValue: z.string().optional(),
  valorPago: z.string().optional(),
  pixPago: z.string().optional(),
  dinheiroPago: z.string().optional(),
  chequePago: z.string().optional(),
  cartaoPago: z.string().optional(),
  reminderEnabled: z.boolean().optional(),
  reminderMinutes: z.number().optional(),
}).omit({
  serviceTypeId: true, // Remove a obrigatoriedade do serviceTypeId
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
});

export const insertServiceReminderSchema = createInsertSchema(serviceReminders).omit({
  id: true,
  createdAt: true,
});

export const insertUnifiedServiceSchema = createInsertSchema(unifiedServices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceItemSchema = createInsertSchema(serviceItems).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPhotoSchema = createInsertSchema(photos).omit({
  id: true,
  createdAt: true,
});

// Loyalty tracking schema temporarily removed

export const updateServiceSchema = insertServiceSchema.partial().extend({
  serviceItems: z.array(z.object({
    unifiedServiceId: z.number(),
    valor: z.string(),
    observacao: z.string().optional(),
  })).optional(),
  pixPago: z.string().optional(),
  dinheiroPago: z.string().optional(),
  chequePago: z.string().optional(),
  cartaoPago: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;
export type InsertUnifiedService = z.infer<typeof insertUnifiedServiceSchema>;
export type UnifiedService = typeof unifiedServices.$inferSelect;
export type InsertServiceItem = z.infer<typeof insertServiceItemSchema>;
export type ServiceItem = typeof serviceItems.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type Photo = typeof photos.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertServiceReminder = z.infer<typeof insertServiceReminderSchema>;
export type ServiceReminder = typeof serviceReminders.$inferSelect;
// Loyalty tracking types temporarily removed