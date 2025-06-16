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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, gte, lte, lt, count, sum, sql, isNotNull, or, ne } from "drizzle-orm";

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
  getRealizedRevenueByDays(days: number): Promise<{ date: string; revenue: number }[]>;
  getRevenueData(days: number): Promise<{ date: string; revenue: number }[]>;
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

  // Schedule-specific analytics
  getScheduleStats(): Promise<{
    today: number;
    thisWeek: number;
    completed: number;
    overdue: number;
  }>;
  getTodayAppointments(): Promise<any[]>;

  // Dashboard analytics
  getDashboardAnalytics(): Promise<{
    topCustomers: Array<{ customerName: string; serviceCount: number; totalValue: number }>;
    topServices: { 
      oneMonth: Array<{ serviceName: string; count: number }>;
      threeMonths: Array<{ serviceName: string; count: number }>;
      sixMonths: Array<{ serviceName: string; count: number }>;
    };
    canceledServices: number;
    weeklyAppointments: number;
    monthlyAppointments: number;
    weeklyEstimatedValue: number;
  }>;
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
          city: customers.city,
          state: customers.state,
          zipCode: customers.zipCode,
          observations: customers.observations,
          loyaltyPoints: customers.loyaltyPoints,
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
      console.log('Getting dashboard stats...');
      // Use current date in Brazilian timezone (UTC-3)
      const now = new Date();
      const brazilianTime = new Date(now.getTime() - (3 * 60 * 60 * 1000)); // UTC-3
      const today = brazilianTime.toISOString().split('T')[0];
      console.log('Today date (Brazilian timezone):', today);

      // Completed revenue (services with status 'completed' and their final value or estimated value)
      const completedRevenue = await db
        .select({ 
          total: sql<number>`COALESCE(SUM(CASE WHEN ${services.finalValue} IS NOT NULL THEN ${services.finalValue} ELSE ${services.estimatedValue} END), 0)` 
        })
        .from(services)
        .where(
          and(
            eq(services.scheduledDate, today),
            eq(services.status, 'completed')
          )
        );

      // Predicted revenue (services scheduled/in_progress with estimated value, excluding completed)
      const predictedRevenue = await db
        .select({ 
          total: sql<number>`COALESCE(SUM(${services.estimatedValue}), 0)` 
        })
        .from(services)
        .where(
          and(
            eq(services.scheduledDate, today),
            or(
              eq(services.status, 'scheduled'),
              eq(services.status, 'in_progress')
            ),
            isNotNull(services.estimatedValue)
          )
        );

      // Total daily revenue (completed + predicted for display purposes)
      const totalDailyRevenue = Number(completedRevenue[0]?.total || 0) + Number(predictedRevenue[0]?.total || 0);

      // Daily services count (all except cancelled)
      const dailyServices = await db
        .select({ count: sql<number>`count(*)` })
        .from(services)
        .where(
          and(
            eq(services.scheduledDate, today),
            ne(services.status, 'cancelled')
          )
        );
      console.log('Today services (non-cancelled):', Number(dailyServices[0]?.count) || 0);

      // Total appointments for today (all statuses)
      const appointments = await db
        .select({ count: sql<number>`count(*)` })
        .from(services)
        .where(eq(services.scheduledDate, today));

      // Active customers (customers with services in the last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

      const activeCustomers = await db
        .selectDistinct({ customerId: services.customerId })
        .from(services)
        .where(gte(services.scheduledDate, thirtyDaysAgoStr));

      const stats = {
        dailyRevenue: totalDailyRevenue,
        completedRevenue: Number(completedRevenue[0]?.total) || 0,
        predictedRevenue: Number(predictedRevenue[0]?.total) || 0,
        dailyServices: Number(dailyServices[0]?.count) || 0,
        appointments: Number(appointments[0]?.count) || 0,
        activeCustomers: activeCustomers.length || 0
      };

      console.log('Dashboard stats result:', stats);
      return stats;
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {
        dailyRevenue: 0,
        completedRevenue: 0,
        predictedRevenue: 0,
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

  async getRealizedRevenueByDays(days: number): Promise<{ date: string; revenue: number }[]> {
    try {
      console.log(`Getting realized revenue data for ${days} days (completed services only)`);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      console.log(`Querying completed services from ${startDateStr}`);

      const revenueData = await db
        .select({
          date: services.scheduledDate,
          finalValue: services.finalValue,
          estimatedValue: services.estimatedValue,
          status: services.status
        })
        .from(services)
        .where(
          and(
            gte(services.scheduledDate, startDateStr),
            eq(services.status, 'completed')
          )
        )
        .orderBy(services.scheduledDate);

      console.log(`Found ${revenueData.length} completed services in date range`);

      // Group by date and sum revenue (only from completed services)
      const revenueByDate: { [key: string]: number } = {};

      revenueData.forEach(service => {
        const date = service.date;
        if (!date) return; // Skip services without dates

        const revenue = service.finalValue 
          ? Number(service.finalValue) 
          : Number(service.estimatedValue || 0);

        if (revenue > 0) {
          revenueByDate[date] = (revenueByDate[date] || 0) + revenue;
        }
      });

      // Create array with all days in range
      const result = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        result.push({
          date: dateStr,
          revenue: revenueByDate[dateStr] || 0
        });
      }

      console.log(`Realized revenue data result:`, result);
      return result;
    } catch (error) {
      console.error('Error getting realized revenue by days:', error);
      throw error;
    }
  }

  async getRevenueByDays(days: number): Promise<{ date: string; revenue: number }[]> {
    try {
      console.log(`Getting revenue data for ${days} days`);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      console.log(`Querying services from ${startDateStr}`);

      const revenueData = await db
        .select({
          date: services.scheduledDate,
          finalValue: services.finalValue,
          estimatedValue: services.estimatedValue,
          status: services.status
        })
        .from(services)
        .where(gte(services.scheduledDate, startDateStr))
        .orderBy(services.scheduledDate);

      console.log(`Found ${revenueData.length} services in date range`);

      // Group by date and sum revenue
      const revenueByDate: { [key: string]: number } = {};

      revenueData.forEach(service => {
        const date = service.date;
        if (!date) return; // Skip services without dates

        const revenue = service.status === 'completed' && service.finalValue 
          ? Number(service.finalValue) 
          : Number(service.estimatedValue || 0);

        if (revenue > 0) {
          revenueByDate[date] = (revenueByDate[date] || 0) + revenue;
        }
      });

      // Create array with all days in range
      const result = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        result.push({
          date: dateStr,
          revenue: revenueByDate[dateStr] || 0
        });
      }

      console.log(`Revenue data result:`, result);
      return result;
    } catch (error) {
      console.error('Error getting revenue by days:', error);
      throw error;
    }
  }

  async getTopServices(): Promise<{ name: string; count: number; revenue: number }[]> {
    try {
      console.log('Storage: Getting top services...');

      // Primeiro, vamos verificar se temos serviços
      const totalServicesCheck = await db.select({ count: sql<number>`count(*)` }).from(services);
      console.log('Storage: Total services in database:', totalServicesCheck[0]?.count || 0);

      if (totalServicesCheck[0]?.count === 0) {
        console.log('Storage: No services found, returning empty array');
        return [];
      }

      const topServices = await db
        .select({
          serviceName: serviceTypes.name,
          count: sql<number>`count(${services.id})`,
          totalRevenue: sql<number>`COALESCE(sum(
            CASE 
              WHEN ${services.status} = 'completed' AND ${services.finalValue} IS NOT NULL 
              THEN CAST(${services.finalValue} AS NUMERIC)
              ELSE CAST(COALESCE(${services.estimatedValue}, 0) AS NUMERIC)
            END
          ), 0)`
        })
        .from(services)
        .innerJoin(serviceTypes, eq(services.serviceTypeId, serviceTypes.id))
        .groupBy(serviceTypes.id, serviceTypes.name)
        .orderBy(sql`count(${services.id}) desc`)
        .limit(5);

      console.log(`Storage: Found ${topServices.length} top services`);
      const result = topServices.map(service => ({
        name: service.serviceName,
        count: Number(service.count),
        revenue: Number(service.totalRevenue || 0)
      }));

      console.log('Storage: Top services result:', result);
      return result;
    } catch (error) {
      console.error('Storage: Error getting top services:', error);
      throw error; // Re-throw para que a API possa capturar o erro
    }
  }

  async getRecentServices(limit: number): Promise<any[]> {
    try {
      console.log('Storage: Getting recent services...');

      // Verificar se temos serviços
      const totalServicesCheck = await db.select({ count: sql<number>`count(*)` }).from(services);
      console.log('Storage: Total services for recent check:', totalServicesCheck[0]?.count || 0);

      if (totalServicesCheck[0]?.count === 0) {
        console.log('Storage: No services found for recent services');
        return [];
      }

      const recentServices = await db
        .select({
          id: services.id,
          customerName: customers.name,
          vehiclePlate: vehicles.licensePlate,
          vehicleBrand: vehicles.brand,
          vehicleModel: vehicles.model,
          serviceTypeName: serviceTypes.name,
          scheduledDate: services.scheduledDate,
          status: services.status,
          estimatedValue: services.estimatedValue,
          finalValue: services.finalValue
        })
        .from(services)
        .innerJoin(customers, eq(services.customerId, customers.id))
        .innerJoin(vehicles, eq(services.vehicleId, vehicles.id))
        .innerJoin(serviceTypes, eq(services.serviceTypeId, serviceTypes.id))
        .orderBy(desc(services.createdAt))
        .limit(limit);

      console.log(`Storage: Found ${recentServices.length} recent services`);
      return recentServices;
    } catch (error) {
      console.error('Storage: Error getting recent services:', error);
      throw error; // Re-throw para que a API possa capturar o erro
    }
  }

  async getUpcomingAppointments(limit: number): Promise<any[]> {
    try {
      console.log('Storage: Getting upcoming appointments...');
      // Use current date in Brazilian timezone (UTC-3)
      const now = new Date();
      const brazilianTime = new Date(now.getTime() - (3 * 60 * 60 * 1000)); // UTC-3
      const today = brazilianTime.toISOString().split('T')[0];
      console.log('Storage: Today date for appointments (Brazilian timezone):', today);

      // Verificar se temos agendamentos
      const scheduledServicesCheck = await db
        .select({ count: sql<number>`count(*)` })
        .from(services)
        .where(eq(services.status, 'scheduled'));

      console.log('Storage: Total scheduled services:', scheduledServicesCheck[0]?.count || 0);

      if (scheduledServicesCheck[0]?.count === 0) {
        console.log('Storage: No scheduled services found');
        return [];
      }

      const upcomingAppointments = await db
        .select({
          id: services.id,
          customerName: customers.name,
          vehiclePlate: vehicles.licensePlate,
          vehicleBrand: vehicles.brand,
          vehicleModel: vehicles.model,
          serviceTypeName: serviceTypes.name,
          scheduledDate: services.scheduledDate,
          scheduledTime: services.scheduledTime,
          status: services.status
        })
        .from(services)
        .innerJoin(customers, eq(services.customerId, customers.id))
        .innerJoin(vehicles, eq(services.vehicleId, vehicles.id))
        .innerJoin(serviceTypes, eq(services.serviceTypeId, serviceTypes.id))
        .where(
          and(
            gte(services.scheduledDate, today),
            eq(services.status, 'scheduled')
          )
        )
        .orderBy(services.scheduledDate, services.scheduledTime)
        .limit(limit);

      console.log(`Storage: Found ${upcomingAppointments.length} upcoming appointments`);
      return upcomingAppointments;
    } catch (error) {
      console.error('Storage: Error getting upcoming appointments:', error);
      throw error; // Re-throw para que a API possa capturar o erro
    }
  }



  // Vehicle analytics
  async getVehicleAnalytics() {
    const vehiclesData = await db.select().from(vehicles);

    // Brand distribution
    const brandCounts = vehiclesData.reduce((acc, vehicle) => {
      acc[vehicle.brand] = (acc[vehicle.brand] || 0) + 1;
      return acc;    }, {} as Record<string, number>);

    // Fuel type distribution  
    const fuelCounts = vehiclesData.reduce((acc, vehicle) => {
      const fuelType = vehicle.fuelType || 'Não informado';
      acc[fuelType] = (acc[fuelType] || 0) + 1;
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

  // Revenue data for charts - alias for getRevenueByDays
  async getRevenueData(days: number): Promise<{ date: string; revenue: number }[]> {
    return this.getRevenueByDays(days);
  }

  // Loyalty tracking functions
  async getLoyaltyTracking(): Promise<any[]> {
    try {
      const tracking = await db
        .select({
          customerId: customers.id,
          customerName: customers.name,
          loyaltyPoints: customers.loyaltyPoints,
          totalServices: sql<number>`count(${services.id})`,
          lastServiceDate: sql<string>`max(${services.scheduledDate})`
        })
        .from(customers)
        .leftJoin(services, eq(customers.id, services.customerId))
        .groupBy(customers.id, customers.name, customers.loyaltyPoints)
        .orderBy(desc(customers.loyaltyPoints));

      return tracking;
    } catch (error) {
      console.error('Error getting loyalty tracking:', error);
      return [];
    }
  }

  async getLoyaltyTrackingByCustomer(customerId: number): Promise<any[]> {
    try {
      const tracking = await db
        .select({
          serviceId: services.id,
          serviceTypeName: serviceTypes.name,
          scheduledDate: services.scheduledDate,
          status: services.status,
          pointsEarned: serviceTypes.loyaltyPoints
        })
        .from(services)
        .innerJoin(serviceTypes, eq(services.serviceTypeId, serviceTypes.id))
        .where(eq(services.customerId, customerId))
        .orderBy(desc(services.scheduledDate));

      return tracking;
    } catch (error) {
      console.error('Error getting customer loyalty tracking:', error);
      return [];
    }
  }

  async getOverdueLoyaltyServices(): Promise<any[]> {
    try {
      const today = new Date();
      const overdue = await db
        .select({
          customerId: customers.id,
          customerName: customers.name,
          serviceTypeName: serviceTypes.name,
          lastServiceDate: sql<string>`max(${services.scheduledDate})`,
          intervalMonths: serviceTypes.intervalMonths
        })
        .from(customers)
        .innerJoin(services, eq(customers.id, services.customerId))
        .innerJoin(serviceTypes, eq(services.serviceTypeId, serviceTypes.id))
        .where(
          and(
            eq(serviceTypes.isRecurring, true),
            isNotNull(serviceTypes.intervalMonths)
          )
        )
        .groupBy(customers.id, customers.name, serviceTypes.name, serviceTypes.intervalMonths)
        .having(
          sql`DATE_ADD(max(${services.scheduledDate}), INTERVAL ${serviceTypes.intervalMonths} MONTH) < CURDATE()`
        );

      return overdue;
    } catch (error) {
      console.error('Error getting overdue loyalty services:', error);
      return [];
    }
  }

  async getUpcomingLoyaltyServices(days: number): Promise<any[]> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const upcoming = await db
        .select({
          customerId: customers.id,
          customerName: customers.name,
          serviceTypeName: serviceTypes.name,
          lastServiceDate: sql<string>`max(${services.scheduledDate})`,
          intervalMonths: serviceTypes.intervalMonths,
          nextDueDate: sql<string>`DATE_ADD(max(${services.scheduledDate}), INTERVAL ${serviceTypes.intervalMonths} MONTH)`
        })
        .from(customers)
        .innerJoin(services, eq(customers.id, services.customerId))
        .innerJoin(serviceTypes, eq(services.serviceTypeId, serviceTypes.id))
        .where(
          and(
            eq(serviceTypes.isRecurring, true),
            isNotNull(serviceTypes.intervalMonths)
          )
        )
        .groupBy(customers.id, customers.name, serviceTypes.name, serviceTypes.intervalMonths)
        .having(
          sql`DATE_ADD(max(${services.scheduledDate}), INTERVAL ${serviceTypes.intervalMonths} MONTH) <= DATE_ADD(CURDATE(), INTERVAL ${days} DAY) 
              AND DATE_ADD(max(${services.scheduledDate}), INTERVAL ${serviceTypes.intervalMonths} MONTH) >= CURDATE()`
        );

      return upcoming;
    } catch (error) {
      console.error('Error getting upcoming loyalty services:', error);
      return [];
    }
  }

  // Basic loyalty points operation
  async addLoyaltyPoints(customerId: number, points: number): Promise<void> {
    await db
      .update(customers)
      .set({
        loyaltyPoints: sql`COALESCE(${customers.loyaltyPoints}, 0) + ${points}`,
        updatedAt: new Date()
      })
      .where(eq(customers.id, customerId));
  }

  // Dashboard analytics
  async getDashboardAnalytics() {
    try {
      const now = new Date();
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Clientes com mais serviços
      const topCustomers = await db
        .select({
          customerName: customers.name,
          serviceCount: sql<number>`count(*)`,
          totalValue: sql<number>`coalesce(sum(${services.finalValue}), 0)`
        })
        .from(services)
        .innerJoin(customers, eq(services.customerId, customers.id))
        .groupBy(customers.id, customers.name)
        .orderBy(sql`count(*) desc`)
        .limit(5);

      // Serviços mais utilizados - 1 mês
      const topServicesOneMonth = await db
        .select({
          serviceName: serviceTypes.name,
          count: sql<number>`count(*)`
        })
        .from(services)
        .innerJoin(serviceTypes, eq(services.serviceTypeId, serviceTypes.id))
        .where(gte(services.scheduledDate, oneMonthAgo.toISOString().split('T')[0]))
        .groupBy(serviceTypes.id, serviceTypes.name)
        .orderBy(sql`count(*) desc`)
        .limit(5);

      // Serviços mais utilizados - 3 meses
      const topServicesThreeMonths = await db
        .select({
          serviceName: serviceTypes.name,
          count: sql<number>`count(*)`
        })
        .from(services)
        .innerJoin(serviceTypes, eq(services.serviceTypeId, serviceTypes.id))
        .where(gte(services.scheduledDate, threeMonthsAgo.toISOString().split('T')[0]))
        .groupBy(serviceTypes.id, serviceTypes.name)
        .orderBy(sql`count(*) desc`)
        .limit(5);

      // Serviços mais utilizados - 6 meses
      const topServicesSixMonths = await db
        .select({
          serviceName: serviceTypes.name,
          count: sql<number>`count(*)`
        })
        .from(services)
        .innerJoin(serviceTypes, eq(services.serviceTypeId, serviceTypes.id))
        .where(gte(services.scheduledDate, sixMonthsAgo.toISOString().split('T')[0]))
        .groupBy(serviceTypes.id, serviceTypes.name)
        .orderBy(sql`count(*) desc`)
        .limit(5);

      // Quantidade de serviços cancelados
      const canceledServicesResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(services)
        .where(eq(services.status, 'cancelled'));

      // Agendamentos para próxima semana
      const weeklyAppointmentsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(services)
        .where(
          and(
            gte(services.scheduledDate, now.toISOString().split('T')[0]),
            lte(services.scheduledDate, oneWeekFromNow.toISOString().split('T')[0]),
            eq(services.status, 'scheduled')
          )
        );

      // Agendamentos para próximo mês
      const monthlyAppointmentsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(services)
        .where(
          and(
            gte(services.scheduledDate, now.toISOString().split('T')[0]),
            lte(services.scheduledDate, oneMonthFromNow.toISOString().split('T')[0]),
            eq(services.status, 'scheduled')
          )
        );

      // Valor semanal estimado (agendamentos concluídos/em andamento)
      const weeklyEstimatedValueResult = await db
        .select({
          totalValue: sql<number>`coalesce(sum(
            case 
              when ${services.finalValue} is not null then ${services.finalValue}
              else ${services.estimatedValue}
            end
          ), 0)`
        })
        .from(services)
        .where(
          and(
            gte(services.scheduledDate, now.toISOString().split('T')[0]),
            lte(services.scheduledDate, oneWeekFromNow.toISOString().split('T')[0]),
            sql`${services.status} IN ('completed', 'in_progress')`
          )
        );

      return {
        topCustomers,
        topServices: {
          oneMonth: topServicesOneMonth,
          threeMonths: topServicesThreeMonths,
          sixMonths: topServicesSixMonths
        },
        canceledServices: canceledServicesResult[0]?.count || 0,
        weeklyAppointments: weeklyAppointmentsResult[0]?.count || 0,
        monthlyAppointments: monthlyAppointmentsResult[0]?.count || 0,
        weeklyEstimatedValue: Number(weeklyEstimatedValueResult[0]?.totalValue || 0)
      };
    } catch (error) {
      console.error('Error getting dashboard analytics:', error);
      return {
        topCustomers: [],
        topServices: { oneMonth: [], threeMonths: [], sixMonths: [] },
        canceledServices: 0,
        weeklyAppointments: 0,
        monthlyAppointments: 0,
        weeklyEstimatedValue: 0
      };
    }
  }

  // Schedule-specific analytics
  async getScheduleStats() {
    try {
      // Use current date in Brazilian timezone (UTC-3)
      const now = new Date();
      const brazilianTime = new Date(now.getTime() - (3 * 60 * 60 * 1000)); // UTC-3
      const today = brazilianTime.toISOString().split('T')[0];
      const oneWeekAgo = new Date(brazilianTime.getTime() - (7 * 24 * 60 * 60 * 1000));
      const weekAgoStr = oneWeekAgo.toISOString().split('T')[0];

      console.log('Schedule stats - Today date:', today);
      console.log('Schedule stats - Week ago date:', weekAgoStr);

      // Today's appointments
      const todayCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(services)
        .where(eq(services.scheduledDate, today));

      // This week's appointments
      const thisWeekCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(services)
        .where(
          and(
            gte(services.scheduledDate, weekAgoStr),
            lte(services.scheduledDate, today)
          )
        );

      // Completed this week
      const completedCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(services)
        .where(
          and(
            gte(services.scheduledDate, weekAgoStr),
            lte(services.scheduledDate, today),
            eq(services.status, 'completed')
          )
        );

      // Overdue (scheduled in the past but not completed)
      const overdueCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(services)
        .where(
          and(
            lt(services.scheduledDate, today),
            eq(services.status, 'scheduled')
          )
        );

      const result = {
        today: Number(todayCount[0]?.count) || 0,
        thisWeek: Number(thisWeekCount[0]?.count) || 0,
        completed: Number(completedCount[0]?.count) || 0,
        overdue: Number(overdueCount[0]?.count) || 0
      };

      console.log('Schedule stats result:', result);
      return result;
    } catch (error) {
      console.error('Error getting schedule stats:', error);
      return {
        today: 0,
        thisWeek: 0,
        completed: 0,
        overdue: 0
      };
    }
  }

  async getTodayAppointments() {
    try {
      // Use current date in Brazilian timezone (UTC-3)
      const now = new Date();
      const brazilianTime = new Date(now.getTime() - (3 * 60 * 60 * 1000)); // UTC-3
      const today = brazilianTime.toISOString().split('T')[0];

      const todayAppointments = await db
        .select({
          id: services.id,
          customerName: customers.name,
          vehiclePlate: vehicles.licensePlate,
          serviceTypeName: serviceTypes.name,
          scheduledDate: services.scheduledDate,
          scheduledTime: services.scheduledTime,
          status: services.status
        })
        .from(services)
        .innerJoin(customers, eq(services.customerId, customers.id))
        .innerJoin(vehicles, eq(services.vehicleId, vehicles.id))
        .innerJoin(serviceTypes, eq(services.serviceTypeId, serviceTypes.id))
        .where(eq(services.scheduledDate, today))
        .orderBy(services.scheduledTime);

      return todayAppointments;
    } catch (error) {
      console.error('Error getting today appointments:', error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();