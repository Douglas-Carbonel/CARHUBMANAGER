import {
  users,
  customers,
  vehicles,
  services,
  serviceTypes,
  payments,
  loyaltyTracking,
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
  type LoyaltyTracking,
  type InsertLoyaltyTracking,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, gte, lte, count, sum, sql, isNotNull } from "drizzle-orm";

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
  getServices(): Promise<(Service & { customer: Customer; vehicle: Vehicle; serviceType: ServiceType })[]>;
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

  // Customer analytics
  getCustomerAnalytics(): Promise<{
    total: number;
    newThisWeek: number;
    newThisMonth: number;
    topCustomers: {
      customerId: number;
      customerName: string;
      serviceCount: number;
    }[];
  }>;

  // Service analytics
  getServiceAnalytics(): Promise<{
    total: number;
    thisWeek: number;
    thisMonth: number;
    topServiceTypes: {
      serviceTypeId: number;
      serviceTypeName: string;
      serviceCount: number;
    }[];
    averageValue: number;
  }>;

  // Vehicle analytics
  getVehicleAnalytics(): Promise<{
    totalVehicles: number;
    brandDistribution: { brand: string; count: number; percentage: number; }[];
    fuelDistribution: { fuelType: string; count: number; percentage: number; }[];
    ageDistribution: { range: string; count: number; percentage: number; }[];
  }>;

  // Basic loyalty operations
  addLoyaltyPoints(customerId: number, points: number): Promise<void>;
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
    // Check if vehicle has open services (not completed or cancelled)
    const openServices = await db
      .select()
      .from(services)
      .where(
        and(
          eq(services.vehicleId, id),
          sql`${services.status} NOT IN ('completed', 'cancelled')`
        )
      );

    if (openServices.length > 0) {
      throw new Error(`Não é possível excluir este veículo pois há ${openServices.length} serviço(s) em aberto. Finalize ou cancele os serviços antes de excluir o veículo.`);
    }

    await db.delete(vehicles).where(eq(vehicles.id, id));
  }

  // Service operations
  async getServices(): Promise<(Service & { customer: Customer; vehicle: Vehicle; serviceType: ServiceType })[]> {
    const result = await db
      .select({
        service: services,
        customer: customers,
        vehicle: vehicles,
        serviceType: serviceTypes,
      })
      .from(services)
      .leftJoin(customers, eq(services.customerId, customers.id))
      .leftJoin(vehicles, eq(services.vehicleId, vehicles.id))
      .leftJoin(serviceTypes, eq(services.serviceTypeId, serviceTypes.id))
      .orderBy(desc(services.createdAt));

    return result.map(row => ({
      ...row.service,
      customer: row.customer!,
      vehicle: row.vehicle!,
      serviceType: row.serviceType!,
    }));
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
    try {
      console.log('Storage: Creating service with data:', JSON.stringify(service, null, 2));
      const [newService] = await db.insert(services).values(service).returning();
      console.log('Storage: Service created successfully:', newService);
      return newService;
    } catch (error) {
      console.error('Storage: Error creating service:', error);
      throw error;
    }
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
  async getDashboardStats() {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format

      // Get today's revenue from completed services
      const todayCompletedServices = await db
        .select()
        .from(services)
        .where(
          and(
            eq(services.scheduledDate, todayStr),
            eq(services.status, 'completed')
          )
        );

      const dailyRevenue = todayCompletedServices.reduce((sum, service) => {
        return sum + Number(service.finalValue || service.estimatedValue || 0);
      }, 0);

      // Get today's total services count (all statuses)
      const todayServicesCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(services)
        .where(eq(services.scheduledDate, todayStr));

      // Get scheduled appointments for today and future dates
      const scheduledAppointments = await db
        .select({ count: sql<number>`count(*)` })
        .from(services)
        .where(
          and(
            gte(services.scheduledDate, todayStr),
            eq(services.status, 'scheduled')
          )
        );

      // Get active customers (customers with services in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const activeCustomers = await db
        .selectDistinct({ customerId: services.customerId })
        .from(services)
        .where(gte(services.scheduledDate, thirtyDaysAgo.toISOString().split('T')[0]));

      return {
        dailyRevenue,
        dailyServices: todayServicesCount[0]?.count || 0,
        appointments: scheduledAppointments[0]?.count || 0,
        activeCustomers: activeCustomers.length
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {
        dailyRevenue: 0,
        dailyServices: 0,
        appointments: 0,
        activeCustomers: 0
      };
    }
  }

  // Customer analytics
  async getCustomerAnalytics() {
    try {
      const today = new Date();
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Total customers
      const totalCustomers = await db
        .select({ count: sql<number>`count(*)` })
        .from(customers);

      // New customers this week
      const newCustomersWeek = await db
        .select({ count: sql<number>`count(*)` })
        .from(customers)
        .where(gte(customers.createdAt, lastWeek));

      // New customers this month
      const newCustomersMonth = await db
        .select({ count: sql<number>`count(*)` })
        .from(customers)
        .where(gte(customers.createdAt, lastMonth));

      // Customers with most services
      const topCustomers = await db
        .select({
          customerId: services.customerId,
          customerName: customers.name,
          serviceCount: sql<number>`count(*)`
        })
        .from(services)
        .innerJoin(customers, eq(services.customerId, customers.id))
        .groupBy(services.customerId, customers.name)
        .orderBy(sql`count(*) desc`)
        .limit(5);

      return {
        total: totalCustomers[0]?.count || 0,
        newThisWeek: newCustomersWeek[0]?.count || 0,
        newThisMonth: newCustomersMonth[0]?.count || 0,
        topCustomers
      };
    } catch (error) {
      console.error('Error getting customer analytics:', error);
      return {
        total: 0,
        newThisWeek: 0,
        newThisMonth: 0,
        topCustomers: []
      };
    }
  }

  // Service analytics
  async getServiceAnalytics() {
    try {
      const today = new Date();
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Total services
      const totalServices = await db
        .select({ count: sql<number>`count(*)` })
        .from(services);

      // Services this week
      const servicesWeek = await db
        .select({ count: sql<number>`count(*)` })
        .from(services)
        .where(gte(services.scheduledDate, lastWeek.toISOString().split('T')[0]));

      // Services this month
      const servicesMonth = await db
        .select({ count: sql<number>`count(*)` })
        .from(services)
        .where(gte(services.scheduledDate, lastMonth.toISOString().split('T')[0]));

      // Most scheduled services
      const topServiceTypes = await db
        .select({
          serviceTypeId: services.serviceTypeId,
          serviceTypeName: serviceTypes.name,
          serviceCount: sql<number>`count(*)`
        })
        .from(services)
        .innerJoin(serviceTypes, eq(services.serviceTypeId, serviceTypes.id))
        .groupBy(services.serviceTypeId, serviceTypes.name)
        .orderBy(sql`count(*) desc`)
        .limit(5);

      // Average service value (considering both finalValue and estimatedValue)
      const allServices = await db
        .select({
          finalValue: services.finalValue,
          estimatedValue: services.estimatedValue,
          status: services.status
        })
        .from(services);

      const servicesWithValues = allServices.filter(s => {
        const value = s.status === 'completed' && s.finalValue 
          ? Number(s.finalValue) 
          : Number(s.estimatedValue || 0);
        return value > 0;
      });

      const avgServiceValue = servicesWithValues.length > 0 
        ? servicesWithValues.reduce((sum, s) => {
            const value = s.status === 'completed' && s.finalValue 
              ? Number(s.finalValue) 
              : Number(s.estimatedValue || 0);
            return sum + value;
          }, 0) / servicesWithValues.length
        : 0;

      return {
        total: totalServices[0]?.count || 0,
        thisWeek: servicesWeek[0]?.count || 0,
        thisMonth: servicesMonth[0]?.count || 0,
        topServiceTypes,
        averageValue: avgServiceValue
      };
    } catch (error) {
      console.error('Error getting service analytics:', error);
      return {
        total: 0,
        thisWeek: 0,
        thisMonth: 0,
        topServiceTypes: [],
        averageValue: 0
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

  // Vehicle analytics
  async getVehicleAnalytics() {
    const vehiclesData = await db.select().from(vehicles);

    // Brand distribution
    const brandCounts = vehiclesData.reduce((acc, vehicle) => {
      acc[vehicle.brand] = (acc[vehicle.brand] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Fuel type distribution  
    const fuelCounts = vehiclesData.reduce((acc, vehicle) => {
      acc[vehicle.fuelType] = (acc[vehicle.fuelType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Year distribution
    const currentYear = new Date().getFullYear();
    const yearRanges = {
      'Novo (0-2 anos)': 0,
      'Semi-novo (3-5 anos)': 0,
      'Usado (6-10 anos)': 0,
      'Antigo (10+ anos)': 0
    };

    vehiclesData.forEach(vehicle => {
      const age = currentYear - vehicle.year;
      if (age <= 2) yearRanges['Novo (0-2 anos)']++;
      else if (age <= 5) yearRanges['Semi-novo (3-5 anos)']++;
      else if (age <= 10) yearRanges['Usado (6-10 anos)']++;
      else yearRanges['Antigo (10+ anos)']++;
    });

    return {
      totalVehicles: vehiclesData.length,
      brandDistribution: Object.entries(brandCounts).map(([brand, count]) => ({
        brand,
        count,
        percentage: (count / vehiclesData.length) * 100
      })),
      fuelDistribution: Object.entries(fuelCounts).map(([fuel, count]) => ({
        fuelType: fuel,
        count,
        percentage: (count / vehiclesData.length) * 100
      })),
      ageDistribution: Object.entries(yearRanges).map(([range, count]) => ({
        range,
        count,
        percentage: vehiclesData.length > 0 ? (count / vehiclesData.length) * 100 : 0
      }))
    };
  }

  // Loyalty tracking operations
  async getLoyaltyTracking(): Promise<(LoyaltyTracking & { customer: Customer; vehicle: Vehicle; serviceType: ServiceType })[]> {
    const result = await db
      .select({
        tracking: loyaltyTracking,
        customer: customers,
        vehicle: vehicles,
        serviceType: serviceTypes,
      })
      .from(loyaltyTracking)
      .leftJoin(customers, eq(loyaltyTracking.customerId, customers.id))
      .leftJoin(vehicles, eq(loyaltyTracking.vehicleId, vehicles.id))
      .leftJoin(serviceTypes, eq(loyaltyTracking.serviceTypeId, serviceTypes.id))
      .orderBy(desc(loyaltyTracking.nextDueDate));

    return result.map(row => ({
      ...row.tracking,
      customer: row.customer!,
      vehicle: row.vehicle!,
      serviceType: row.serviceType!,
    }));
  }

  async getLoyaltyTrackingByCustomer(customerId: number): Promise<(LoyaltyTracking & { vehicle: Vehicle; serviceType: ServiceType })[]> {
    const result = await db
      .select({
        tracking: loyaltyTracking,
        vehicle: vehicles,
        serviceType: serviceTypes,
      })
      .from(loyaltyTracking)
      .leftJoin(vehicles, eq(loyaltyTracking.vehicleId, vehicles.id))
      .leftJoin(serviceTypes, eq(loyaltyTracking.serviceTypeId, serviceTypes.id))
      .where(eq(loyaltyTracking.customerId, customerId))
      .orderBy(desc(loyaltyTracking.nextDueDate));

    return result.map(row => ({
      ...row.tracking,
      vehicle: row.vehicle!,
      serviceType: row.serviceType!,
    }));
  }

  async getOverdueLoyaltyServices(): Promise<(LoyaltyTracking & { customer: Customer; vehicle: Vehicle; serviceType: ServiceType })[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const result = await db
      .select({
        tracking: loyaltyTracking,
        customer: customers,
        vehicle: vehicles,
        serviceType: serviceTypes,
      })
      .from(loyaltyTracking)
      .leftJoin(customers, eq(loyaltyTracking.customerId, customers.id))
      .leftJoin(vehicles, eq(loyaltyTracking.vehicleId, vehicles.id))
      .leftJoin(serviceTypes, eq(loyaltyTracking.serviceTypeId, serviceTypes.id))
      .where(
        and(
          eq(loyaltyTracking.status, 'active'),
          lte(loyaltyTracking.nextDueDate, today)
        )
      )
      .orderBy(desc(loyaltyTracking.nextDueDate));

    return result.map(row => ({
      ...row.tracking,
      customer: row.customer!,
      vehicle: row.vehicle!,
      serviceType: row.serviceType!,
    }));
  }

  async getUpcomingLoyaltyServices(days: number): Promise<(LoyaltyTracking & { customer: Customer; vehicle: Vehicle; serviceType: ServiceType })[]> {
    const today = new Date();
    const futureDate = new Date(today.getTime() + (days * 24 * 60 * 60 * 1000));
    const todayStr = today.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    const result = await db
      .select({
        tracking: loyaltyTracking,
        customer: customers,
        vehicle: vehicles,
        serviceType: serviceTypes,
      })
      .from(loyaltyTracking)
      .leftJoin(customers, eq(loyaltyTracking.customerId, customers.id))
      .leftJoin(vehicles, eq(loyaltyTracking.vehicleId, vehicles.id))
      .leftJoin(serviceTypes, eq(loyaltyTracking.serviceTypeId, serviceTypes.id))
      .where(
        and(
          eq(loyaltyTracking.status, 'active'),
          gte(loyaltyTracking.nextDueDate, todayStr),
          lte(loyaltyTracking.nextDueDate, futureDateStr)
        )
      )
      .orderBy(asc(loyaltyTracking.nextDueDate));

    return result.map(row => ({
      ...row.tracking,
      customer: row.customer!,
      vehicle: row.vehicle!,
      serviceType: row.serviceType!,
    }));
  }

  async createLoyaltyTracking(tracking: InsertLoyaltyTracking): Promise<LoyaltyTracking> {
    const [newTracking] = await db.insert(loyaltyTracking).values(tracking).returning();
    return newTracking;
  }

  async updateLoyaltyTracking(id: number, tracking: Partial<InsertLoyaltyTracking>): Promise<LoyaltyTracking> {
    const [updatedTracking] = await db
      .update(loyaltyTracking)
      .set({ ...tracking, updatedAt: new Date() })
      .where(eq(loyaltyTracking.id, id))
      .returning();
    return updatedTracking;
  }

  async deleteLoyaltyTracking(id: number): Promise<void> {
    await db.delete(loyaltyTracking).where(eq(loyaltyTracking.id, id));
  }

  async addLoyaltyPoints(customerId: number, points: number): Promise<void> {
    await db
      .update(customers)
      .set({
        loyaltyPoints: sql`${customers.loyaltyPoints} + ${points}`,
        updatedAt: new Date()
      })
      .where(eq(customers.id, customerId));
  }

  async processServiceForLoyalty(service: Service): Promise<void> {
    try {
      // Busca o tipo de serviço para verificar se é recorrente
      const serviceType = await this.getServiceType(service.serviceTypeId);
      
      if (!serviceType || !serviceType.isRecurring || !serviceType.intervalMonths) {
        return; // Não é um serviço recorrente
      }

      // Calcula a próxima data de vencimento
      const serviceDate = new Date(service.scheduledDate || new Date());
      const nextDueDate = new Date(serviceDate);
      nextDueDate.setMonth(nextDueDate.getMonth() + serviceType.intervalMonths);

      // Verifica se já existe um tracking para este cliente, veículo e tipo de serviço
      const existingTracking = await db
        .select()
        .from(loyaltyTracking)
        .where(
          and(
            eq(loyaltyTracking.customerId, service.customerId),
            eq(loyaltyTracking.vehicleId, service.vehicleId),
            eq(loyaltyTracking.serviceTypeId, service.serviceTypeId)
          )
        );

      if (existingTracking.length > 0) {
        // Atualiza o tracking existente
        await this.updateLoyaltyTracking(existingTracking[0].id, {
          lastServiceDate: service.scheduledDate || new Date().toISOString().split('T')[0],
          nextDueDate: nextDueDate.toISOString().split('T')[0],
          status: 'active',
          notificationSent: false,
          updatedAt: new Date()
        });
      } else {
        // Cria um novo tracking
        await this.createLoyaltyTracking({
          customerId: service.customerId,
          vehicleId: service.vehicleId,
          serviceTypeId: service.serviceTypeId,
          lastServiceDate: service.scheduledDate || new Date().toISOString().split('T')[0],
          nextDueDate: nextDueDate.toISOString().split('T')[0],
          status: 'active',
          points: serviceType.loyaltyPoints || 0,
          notificationSent: false
        });
      }

      // Adiciona pontos de fidelidade ao cliente
      if (serviceType.loyaltyPoints && serviceType.loyaltyPoints > 0) {
        await this.addLoyaltyPoints(service.customerId, serviceType.loyaltyPoints);
      }
    } catch (error) {
      console.error('Error processing service for loyalty:', error);
    }
  }
}

export const storage = new DatabaseStorage();