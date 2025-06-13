import {
  users,
  customers,
  vehicles,
  services,
  serviceTypes,
  payments,
  type User,
  type InsertUser,
  type Customer,
  type InsertCustomer,
  type Vehicle,
  type InsertVehicle,
  type Service,
  type InsertService,
  type ServiceType,
  type InsertServiceType,
  type Payment,
  type InsertPayment,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, gte, lte, count, sum, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Customer operations
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByDocument(document: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer>;
  deleteCustomer(id: number): Promise<void>;

  // Vehicle operations
  getVehicles(): Promise<Vehicle[]>;
  getVehiclesWithCustomers(): Promise<(Vehicle & { customer: Customer })[]>;
  getVehiclesByCustomer(customerId: number): Promise<Vehicle[]>;
  getVehicle(id: number): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: number, vehicle: Partial<InsertVehicle>): Promise<Vehicle>;
  deleteVehicle(id: number): Promise<void>;

  // Service operations
  getServices(): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  getServicesByCustomer(customerId: number): Promise<Service[]>;
  getServicesByVehicle(vehicleId: number): Promise<Service[]>;
  getServicesByDateRange(startDate: string, endDate: string): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, service: Partial<InsertService>): Promise<Service>;
  deleteService(id: number): Promise<void>;

  // Service type operations
  getServiceTypes(): Promise<ServiceType[]>;
  getServiceType(id: number): Promise<ServiceType | undefined>;
  createServiceType(serviceType: InsertServiceType): Promise<ServiceType>;
  updateServiceType(id: number, serviceType: Partial<InsertServiceType>): Promise<ServiceType>;

  // Payment operations
  getPaymentsByService(serviceId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;

  // Dashboard statistics
  getDashboardStats(): Promise<{
    dailyRevenue: number;
    dailyServices: number;
    appointments: number;
    activeCustomers: number;
  }>;
  getRevenueByDays(days: number): Promise<{ date: string; revenue: number }[]>;
  getTopServices(): Promise<{ name: string; count: number; revenue: number }[]>;
  getRecentServices(limit: number): Promise<any[]>;
  getUpcomingAppointments(limit: number): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.createdAt));
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Customer operations
  async getCustomers(): Promise<Customer[]> {
    try {
      return await db.select().from(customers).orderBy(asc(customers.name));
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    try {
      const [customer] = await db.select().from(customers).where(eq(customers.id, id));
      return customer;
    } catch (error) {
      console.error('Error fetching customer:', error);
      throw error;
    }
  }

  async getCustomerByDocument(document: string): Promise<Customer | undefined> {
    try {
      const [customer] = await db.select().from(customers).where(eq(customers.document, document));
      return customer;
    } catch (error) {
      console.error('Error fetching customer by document:', error);
      throw error;
    }
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    try {
      const [newCustomer] = await db.insert(customers).values({
        ...customer,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      return newCustomer;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer> {
    const [updatedCustomer] = await db
      .update(customers)
      .set({ ...customer, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return updatedCustomer;
  }

  async deleteCustomer(id: number): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  // Vehicle operations
  async getVehicles(): Promise<Vehicle[]> {
    try {
      return await db.select().from(vehicles).orderBy(vehicles.licensePlate);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      throw error;
    }
  }

  async getVehiclesWithCustomers(): Promise<(Vehicle & { customer: Customer })[]> {
    try {
      const result = await db.select({
        id: vehicles.id,
        customerId: vehicles.customerId,
        licensePlate: vehicles.licensePlate,
        brand: vehicles.brand,
        model: vehicles.model,
        year: vehicles.year,
        color: vehicles.color,
        chassis: vehicles.chassis,
        engine: vehicles.engine,
        fuelType: vehicles.fuelType,
        notes: vehicles.notes,
        createdAt: vehicles.createdAt,
        updatedAt: vehicles.updatedAt,
        customer: {
          id: customers.id,
          code: customers.code,
          document: customers.document,
          documentType: customers.documentType,
          name: customers.name,
          phone: customers.phone,
          email: customers.email,
          address: customers.address,
          observations: customers.observations,
          createdAt: customers.createdAt,
          updatedAt: customers.updatedAt,
        }
      })
      .from(vehicles)
      .innerJoin(customers, eq(vehicles.customerId, customers.id))
      .orderBy(vehicles.licensePlate);
      
      return result;
    } catch (error) {
      console.error('Error fetching vehicles with customers:', error);
      throw error;
    }
  }

  async getVehiclesByCustomer(customerId: number): Promise<Vehicle[]> {
    try {
      return await db.select().from(vehicles).where(eq(vehicles.customerId, customerId));
    } catch (error) {
      console.error('Error fetching vehicles by customer:', error);
      throw error;
    }
  }

  async getVehicle(id: number): Promise<Vehicle | undefined> {
    try {
      const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
      return vehicle;
    } catch (error) {
      console.error('Error fetching vehicle:', error);
      throw error;
    }
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const [newVehicle] = await db.insert(vehicles).values(vehicle).returning();
    return newVehicle;
  }

  async updateVehicle(id: number, vehicle: Partial<InsertVehicle>): Promise<Vehicle> {
    const [updatedVehicle] = await db
      .update(vehicles)
      .set({ ...vehicle, updatedAt: new Date() })
      .where(eq(vehicles.id, id))
      .returning();
    return updatedVehicle;
  }

  async deleteVehicle(id: number): Promise<void> {
    await db.delete(vehicles).where(eq(vehicles.id, id));
  }

  // Service operations
  async getServices(): Promise<Service[]> {
    try {
      return await db.select().from(services).orderBy(desc(services.createdAt));
    } catch (error) {
      console.error('Error fetching services:', error);
      throw error;
    }
  }

  async getService(id: number): Promise<Service | undefined> {
    try {
      const [service] = await db.select().from(services).where(eq(services.id, id));
      return service;
    } catch (error) {
      console.error('Error fetching service:', error);
      throw error;
    }
  }

  async getServicesByCustomer(customerId: number): Promise<Service[]> {
    try {
      return await db.select().from(services).where(eq(services.customerId, customerId));
    } catch (error) {
      console.error('Error fetching services by customer:', error);
      throw error;
    }
  }

  async getServicesByVehicle(vehicleId: number): Promise<Service[]> {
    try {
      return await db.select().from(services).where(eq(services.vehicleId, vehicleId));
    } catch (error) {
      console.error('Error fetching services by vehicle:', error);
      throw error;
    }
  }

  async getServicesByDateRange(startDate: string, endDate: string): Promise<Service[]> {
    try {
      return await db.select().from(services)
        .where(and(gte(services.scheduledDate, startDate), lte(services.scheduledDate, endDate)))
        .orderBy(desc(services.scheduledDate));
    } catch (error) {
      console.error('Error fetching services by date range:', error);
      throw error;
    }
  }

  async createService(service: InsertService): Promise<Service> {
    const [newService] = await db.insert(services).values(service).returning();
    return newService;
  }

  async updateService(id: number, service: Partial<InsertService>): Promise<Service> {
    const [updatedService] = await db
      .update(services)
      .set({ ...service, updatedAt: new Date() })
      .where(eq(services.id, id))
      .returning();
    return updatedService;
  }

  async deleteService(id: number): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
  }

  // Service type operations
  async getServiceTypes(): Promise<ServiceType[]> {
    try {
      return await db.select().from(serviceTypes).orderBy(asc(serviceTypes.name));
    } catch (error) {
      console.error('Error fetching service types:', error);
      throw error;
    }
  }

  async getServiceType(id: number): Promise<ServiceType | undefined> {
    try {
      const [serviceType] = await db.select().from(serviceTypes).where(eq(serviceTypes.id, id));
      return serviceType;
    } catch (error) {
      console.error('Error fetching service type:', error);
      throw error;
    }
  }

  async createServiceType(serviceType: InsertServiceType): Promise<ServiceType> {
    const [newServiceType] = await db.insert(serviceTypes).values(serviceType).returning();
    return newServiceType;
  }

  async updateServiceType(id: number, serviceType: Partial<InsertServiceType>): Promise<ServiceType> {
    const [updatedServiceType] = await db
      .update(serviceTypes)
      .set(serviceType)
      .where(eq(serviceTypes.id, id))
      .returning();
    return updatedServiceType;
  }

  // Payment operations
  async getPaymentsByService(serviceId: number): Promise<Payment[]> {
    try {
      return await db.select().from(payments).where(eq(payments.serviceId, serviceId));
    } catch (error) {
      console.error('Error fetching payments by service:', error);
      throw error;
    }
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  // Dashboard statistics
  async getDashboardStats(): Promise<{
    dailyRevenue: number;
    dailyServices: number;
    appointments: number;
    activeCustomers: number;
  }> {
    try {
      return {
        dailyRevenue: 0,
        dailyServices: 0,
        appointments: 0,
        activeCustomers: 0,
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        dailyRevenue: 0,
        dailyServices: 0,
        appointments: 0,
        activeCustomers: 0,
      };
    }
  }

  async getRevenueByDays(days: number): Promise<{ date: string; revenue: number }[]> {
    return [];
  }

  async getTopServices(): Promise<{ name: string; count: number; revenue: number }[]> {
    return [];
  }

  async getRecentServices(limit: number): Promise<any[]> {
    return [];
  }

  async getUpcomingAppointments(limit: number): Promise<any[]> {
    return [];
  }
}

export const storage = new DatabaseStorage();