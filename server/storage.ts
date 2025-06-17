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
  getDashboardStats(technicianId?: number | null): Promise<{
    dailyRevenue: number;
    completedRevenue: number;
    predictedRevenue: number;
    dailyServices: number;
    appointments: number;
    activeCustomers: number;
  }>;
  getRevenueByDays(days: number): Promise<{ date: string; revenue: number }[]>;
  getRealizedRevenueByDays(days: number): Promise<{ date: string; revenue: number }[]>;
  getRevenueData(days: number): Promise<{ date: string; revenue: number }[]>;
  getTopServices(technicianId?: number | null): Promise<{ name: string; count: number; revenue: number }[]>;
  getRecentServices(limit?: number, technicianId?: number | null): Promise<any[]>;
  getUpcomingAppointments(limit?: number, technicianId?: number | null): Promise<any[]>;

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

  async getDashboardStats(technicianId?: number | null): Promise<{
    dailyRevenue: number;
    completedRevenue: number;
    predictedRevenue: number;
    dailyServices: number;
    appointments: number;
    activeCustomers: number;
  }> {
    console.log("Getting dashboard stats...", technicianId ? `for technician ${technicianId}` : "for admin");

    // Usar timezone brasileiro para todas as consultas
    const today = new Date().toLocaleDateString('pt-BR');
    console.log("Today date (Brazilian timezone):", today);

    const [year, month, day] = today.split('/').reverse();
    const todayString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    // Base condition for filtering by technician
    const technicianCondition = technicianId ? sql`AND technician_id = ${technicianId}` : sql``;

    try {
      // Receita diária (serviços agendados para hoje)
      const dailyRevenueResult = await db.execute(sql`
        SELECT COALESCE(SUM(CASE 
          WHEN estimated_value IS NOT NULL AND estimated_value != '' AND estimated_value ~ '^[0-9]+\.?[0-9]*$'
          THEN estimated_value::decimal 
          ELSE 0 
        END), 0) as revenue
        FROM services 
        WHERE scheduled_date = ${todayString} 
        AND status != 'cancelled'
        ${technicianCondition}
      `);

      // Receita realizada (serviços concluídos)
      const completedRevenueResult = await db.execute(sql`
        SELECT COALESCE(SUM(CASE 
          WHEN final_value IS NOT NULL AND final_value != '' AND final_value ~ '^[0-9]+\.?[0-9]*$'
          THEN final_value::decimal 
          WHEN estimated_value IS NOT NULL AND estimated_value != '' AND estimated_value ~ '^[0-9]+\.?[0-9]*$'
          THEN estimated_value::decimal 
          ELSE 0 
        END), 0) as revenue
        FROM services 
        WHERE status = 'completed'
        ${technicianCondition}
      `);

      // Receita prevista (todos os serviços não cancelados)
      const predictedRevenueResult = await db.execute(sql`
        SELECT COALESCE(SUM(CASE 
          WHEN estimated_value IS NOT NULL AND estimated_value != '' AND estimated_value ~ '^[0-9]+\.?[0-9]*$'
          THEN estimated_value::decimal 
          ELSE 0 
        END), 0) as revenue
        FROM services 
        WHERE status != 'cancelled'
        ${technicianCondition}
      `);

      // Serviços do dia
      const dailyServicesResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM services 
        WHERE scheduled_date = ${todayString} 
        AND status != 'cancelled'
        ${technicianCondition}
      `);

      console.log("Today services (non-cancelled):", dailyServicesResult.rows[0]?.count);

      // Agendamentos futuros
      const appointmentsResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM services 
        WHERE scheduled_date > ${todayString}
        AND status = 'scheduled'
        ${technicianCondition}
      `);

      // Clientes ativos (com serviços nos últimos 30 dias)
      const activeCustomersResult = await db.execute(sql`
        SELECT COUNT(DISTINCT customer_id) as count
        FROM services 
        WHERE scheduled_date >= (CURRENT_DATE - INTERVAL '30 days')
        ${technicianCondition}
      `);

      const stats = {
        dailyRevenue: Number(dailyRevenueResult.rows[0]?.revenue || 0),
        completedRevenue: Number(completedRevenueResult.rows[0]?.revenue || 0),
        predictedRevenue: Number(predictedRevenueResult.rows[0]?.revenue || 0),
        dailyServices: Number(dailyServicesResult.rows[0]?.count || 0),
        appointments: Number(appointmentsResult.rows[0]?.count || 0),
        activeCustomers: Number(activeCustomersResult.rows[0]?.count || 0),
      };

      console.log("Dashboard stats result:", stats);
      return stats;
    } catch (error) {
      console.error("Error in getDashboardStats:", error);
      throw error;
    }
  }

  async getRecentServices(limit: number = 5, technicianId?: number | null): Promise<any[]> {
    console.log("Storage: Getting recent services...", technicianId ? `for technician ${technicianId}` : "for admin");

    try {
      const technicianCondition = technicianId ? sql`WHERE s.technician_id = ${technicianId}` : sql``;

      const result = await db.execute(sql`
        SELECT 
          s.id,
          c.name as customer_name,
          v.license_plate as vehicle_plate,
          v.brand as vehicle_brand,
          v.model as vehicle_model,
          st.name as service_type_name,
          s.scheduled_date,
          s.status,
          s.estimated_value,
          s.final_value
        FROM services s
        JOIN customers c ON s.customer_id = c.id
        JOIN vehicles v ON s.vehicle_id = v.id
        JOIN service_types st ON s.service_type_id = st.id
        ${technicianCondition}
        ORDER BY s.created_at DESC
        LIMIT ${limit}
      `);

      console.log("Storage: Total services for recent check:", result.rows.length);
      const services = result.rows.map(row => ({
        id: row.id,
        customerName: row.customer_name,
        vehiclePlate: row.vehicle_plate,
        vehicleBrand: row.vehicle_brand,
        vehicleModel: row.vehicle_model,
        serviceTypeName: row.service_type_name,
        scheduledDate: row.scheduled_date,
        status: row.status,
        estimatedValue: row.estimated_value,
        finalValue: row.final_value,
      }));

      console.log("Storage: Found", services.length, "recent services");
      return services;
    } catch (error) {
      console.error("Error getting recent services:", error);
      throw error;
    }
  }

  async getUpcomingAppointments(limit: number = 5, technicianId?: number | null): Promise<any[]> {
    console.log("Storage: Getting upcoming appointments...", technicianId ? `for technician ${technicianId}` : "for admin");

    // Get current date in Brazilian timezone
    const today = new Date();
    const brazilianDate = today.toLocaleDateString('en-CA'); // YYYY-MM-DD format
    console.log("Storage: Today date for appointments (Brazilian timezone):", brazilianDate);

    try {
      const technicianCondition = technicianId ? sql`AND s.technician_id = ${technicianId}` : sql``;

      const result = await db.execute(sql`
        SELECT 
          s.id,
          c.name as customer_name,
          v.license_plate as vehicle_plate,
          v.brand as vehicle_brand,
          v.model as vehicle_model,
          st.name as service_type_name,
          s.scheduled_date,
          s.scheduled_time,
          s.status
        FROM services s
        JOIN customers c ON s.customer_id = c.id
        JOIN vehicles v ON s.vehicle_id = v.id
        JOIN service_types st ON s.service_type_id = st.id
        WHERE s.scheduled_date >= ${brazilianDate}
        AND s.status = 'scheduled'
        ${technicianCondition}
        ORDER BY s.scheduled_date ASC, s.scheduled_time ASC
        LIMIT ${limit}
      `);

      console.log("Storage: Total scheduled services:", result.rows.length);
      const appointments = result.rows.map(row => ({
        id: row.id,
        customerName: row.customer_name,
        vehiclePlate: row.vehicle_plate,
        vehicleBrand: row.vehicle_brand,
        vehicleModel: row.vehicle_model,
        serviceTypeName: row.service_type_name,
        scheduledDate: row.scheduled_date,
        scheduledTime: row.scheduled_time,
        status: row.status,
      }));

      console.log("Storage: Found", appointments.length, "upcoming appointments");
      return appointments;
    } catch (error) {
      console.error("Error getting upcoming appointments:", error);
      throw error;
    }
  }

  async getTopServices(technicianId?: number | null): Promise<any[]> {
    console.log("Storage: Getting top services...", technicianId ? `for technician ${technicianId}` : "for admin");

    try {
      const technicianCondition = technicianId ? sql`AND s.technician_id = ${technicianId}` : sql``;

      const result = await db.execute(sql`
        SELECT 
          st.name,
          COUNT(s.id) as count,
          COALESCE(SUM(CASE 
            WHEN s.final_value IS NOT NULL AND s.final_value != '' AND s.final_value ~ '^[0-9]+\.?[0-9]*$'
            THEN s.final_value::decimal 
            WHEN s.estimated_value IS NOT NULL AND s.estimated_value != '' AND s.estimated_value ~ '^[0-9]+\.?[0-9]*$'
            THEN s.estimated_value::decimal 
            ELSE 0 
          END), 0) as revenue
        FROM service_types st
        LEFT JOIN services s ON st.id = s.service_type_id AND s.status != 'cancelled' ${technicianCondition}
        GROUP BY st.id, st.name
        HAVING COUNT(s.id) > 0
        ORDER BY count DESC, revenue DESC
        LIMIT 5
      `);

      console.log("Storage: Found", result.rows.length, "top services");
      const topServices = result.rows.map(row => ({
        name: row.name,
        count: Number(row.count),
        revenue: Number(row.revenue),
      }));

      console.log("Storage: Top services result:", topServices);
      return topServices;
    } catch (error) {
      console.error("Error getting top services:", error);
      throw error;
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

        let revenue = 0;
        if (service.finalValue && String(service.finalValue).match(/^[0-9]+\.?[0-9]*$/)) {
          revenue = Number(service.finalValue);
        } else if (service.estimatedValue && 
                   String(service.estimatedValue).match(/^[0-9]+\.?[0-9]*$/)) {
          revenue = Number(service.estimatedValue);
        }

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

        let revenue = 0;
        if (service.status === 'completed' && service.finalValue && 
            String(service.finalValue).match(/^[0-9]+\.?[0-9]*$/)) {
          revenue = Number(service.finalValue);
        } else if (service.estimatedValue && 
                   String(service.estimatedValue).match(/^[0-9]+\.?[0-9]*$/)) {
          revenue = Number(service.estimatedValue);
        }

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
        .innerJoin(serviceTypes, eq(serviceTypes.id, services.serviceTypeId))
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
}

export const storage = new DatabaseStorage();