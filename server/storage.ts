import {
  users,
  customers,
  vehicles,
  services,
  serviceTypes,
  serviceItems,
  payments,
  photos,
  pushSubscriptions,
  serviceReminders,
  type InsertCustomer,
  type InsertVehicle,
  type InsertService,
  type InsertServiceType,
  type InsertServiceItem,
  type InsertPayment,
  type InsertUser,
  type InsertPhoto,
  type Customer,
  type Vehicle,
  type Service,
  type ServiceType,
  type ServiceItem,
  type Payment,
  type User,
  type Photo,
  type InsertPushSubscription,
  type PushSubscription,
  type InsertServiceReminder,
  type ServiceReminder,
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
  getServices(technicianId?: number): Promise<any[]>;
  getService(id: number): Promise<Service | undefined>;
  getServicesByCustomer(customerId: number): Promise<Service[]>;
  getServicesByVehicle(vehicleId: number): Promise<Service[]>;
  getServicesByDateRange(startDate: string, endDate: string): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, service: Partial<InsertService>): Promise<Service>;
  deleteService(id: number): Promise<void>;
  getServiceById(serviceId: number, userId?: number): Promise<(Service & { customer: Customer; vehicle: Vehicle; serviceType: ServiceType }) | undefined>;

  // Service type operations
  getServiceTypes(): Promise<ServiceType[]>;
  getServiceType(id: number): Promise<ServiceType | undefined>;
  createServiceType(service: InsertServiceType): Promise<ServiceType>;
  updateServiceType(id: number, service: Partial<InsertServiceType>): Promise<ServiceType>;
  deleteServiceType(id: number): Promise<void>;


  // Payment operations
  getPaymentsByService(serviceId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;

  // Dashboard statistics
  getDashboardStats(technicianId?: number | null): Promise<{
    dailyRevenue: number;
    completedRevenue: number;
    predictedRevenue: number;
    dailyServices: number;
    weeklyServices: number;
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

  // Photo operations
  getPhotos(filters?: { customerId?: number; vehicleId?: number; serviceId?: number; category?: string }): Promise<Photo[]>;
  getPhoto(id: number): Promise<Photo | undefined>;
  createPhoto(photo: InsertPhoto): Promise<Photo>;
  updatePhoto(id: number, photo: Partial<InsertPhoto>): Promise<Photo>;
  deletePhoto(id: number): Promise<void>;

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
      // If document is empty or null, don't search for it
      if (!document || document.trim() === '') {
        return undefined;
      }
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
  async getServices(technicianId?: number): Promise<any[]> {
    try {
          let query = db
          .select({
            id: services.id,
            customerId: services.customerId,
            vehicleId: services.vehicleId,
            serviceTypeId: services.serviceTypeId,
            technicianId: services.technicianId,
            status: services.status,
            scheduledDate: services.scheduledDate,
            scheduledTime: services.scheduledTime,
            startedAt: services.startedAt,
            completedAt: services.completedAt,
            estimatedValue: services.estimatedValue,
            finalValue: services.finalValue,
            valorPago: services.valorPago,
            pixPago: services.pixPago,
            dinheiroPago: services.dinheiroPago,
            chequePago: services.chequePago,
            cartaoPago: services.cartaoPago,
            notes: services.notes,
            createdAt: services.createdAt,
            updatedAt: services.updatedAt,
            customerName: customers.name,
            vehicleBrand: vehicles.brand,
            vehicleModel: vehicles.model,
            vehicleLicensePlate: vehicles.licensePlate,
            serviceTypeName: serviceTypes.name,
            technicianName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`.as('technician_name'),
          })
          .from(services)
          .leftJoin(customers, eq(services.customerId, customers.id))
          .leftJoin(vehicles, eq(services.vehicleId, vehicles.id))
          .leftJoin(serviceTypes, eq(services.serviceTypeId, serviceTypes.id))
          .leftJoin(users, eq(services.technicianId, users.id))
          .orderBy(desc(services.createdAt));
  
        if (technicianId) {
          query = query.where(eq(services.technicianId, technicianId));
        }
  
        const servicesData = await query;
  
        for (const service of servicesData) {
          const items = await db
            .select({
              id: serviceItems.id,
              serviceId: serviceItems.serviceId,
              serviceTypeId: serviceItems.serviceTypeId,
              quantity: serviceItems.quantity,
              unitPrice: serviceItems.unitPrice,
              totalPrice: serviceItems.totalPrice,
              notes: serviceItems.notes,
              serviceTypeName: serviceTypes.name,
              serviceTypeDescription: serviceTypes.description,
            })
            .from(serviceItems)
            .leftJoin(serviceTypes, eq(serviceItems.serviceTypeId, serviceTypes.id))
            .where(eq(serviceItems.serviceId, service.id));
  
            service.serviceItems = items;
        }
        return servicesData;

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
    try {
      console.log('Storage: Creating service with data:', JSON.stringify(service, null, 2));

      // Separate service items from service data
      const serviceItems = service.serviceItems;
      const serviceData = { ...service };
      delete serviceData.serviceItems;

      // Create the service first
      const [newService] = await db.insert(services).values(serviceData).returning();
      console.log('Storage: Service created successfully:', newService);

      // Create service items if they exist
      if (serviceItems && serviceItems.length > 0) {
        const serviceItemsData = serviceItems.map(item => ({
          serviceId: newService.id,
          serviceTypeId: item.serviceTypeId,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          notes: item.notes,
        }));

        await db.insert(serviceItems).values(serviceItemsData);
        console.log('Storage: Service items created successfully:', serviceItemsData.length, 'items');
      }

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
      return await db.select().from(serviceTypes).where(eq(serviceTypes.isActive, true)).orderBy(asc(serviceTypes.name));
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
    const [newServiceType] = await db.insert(serviceTypes).values({
      ...serviceType,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return newServiceType;
  }

  async updateServiceType(id: number, serviceType: Partial<InsertServiceType>): Promise<ServiceType> {
    const [updatedServiceType] = await db
      .update(serviceTypes)
      .set({ ...serviceType, updatedAt: new Date() })
      .where(eq(serviceTypes.id, id))
      .returning();
    return updatedServiceType;
  }

  async deleteServiceType(id: number): Promise<void> {
    await db.update(serviceTypes).set({ isActive: false }).where(eq(serviceTypes.id, id));
  }

  // Service extras operations (now redirects to unified services)

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
    weeklyServices: number;
    appointments: number;
    activeCustomers: number;
  }> {
    console.log("Getting dashboard stats...", technicianId ? `for technician ${technicianId}` : "for admin");

    // Use Brazilian timezone (UTC-3)
    const today = new Date();
    const brazilTime = new Date(today.getTime() - (3 * 60 * 60 * 1000));
    const todayStr = brazilTime.toISOString().split('T')[0];
    console.log("Today date (Brazilian timezone):", todayStr);

    try {
      // Get all services and process in JavaScript to avoid SQL conversion errors
      const whereCondition = technicianId 
        ? sql`WHERE technician_id = ${technicianId}` 
        : sql`WHERE 1=1`;

      const allServicesResult = await db.execute(sql`
        SELECT 
          estimated_value, 
          final_value, 
          status, 
          scheduled_date,
          customer_id
        FROM services 
        ${whereCondition}
      `);

      console.log("Total services found:", allServicesResult.rows.length);

      // Helper function to safely parse numeric values
      const parseValue = (value: any): number => {
        if (value === null || value === undefined || value === '') return 0;
        const parsed = parseFloat(String(value));
        return isNaN(parsed) ? 0 : parsed;
      };

      let dailyRevenue = 0;
      let completedRevenue = 0;
      let predictedRevenue = 0;
      let dailyServices = 0;
      let weeklyServices = 0;
      let appointments = 0;
      const uniqueCustomers = new Set();

      // Calculate actual week start (Monday) in Brazilian timezone
      const currentDay = brazilTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // If Sunday, go back 6 days
      const weekStart = new Date(brazilTime.getTime() - (daysFromMonday * 24 * 60 * 60 * 1000));
      const weekStartStr = weekStart.toISOString().split('T')[0];

      allServicesResult.rows.forEach((service: any) => {
        const estimatedValue = parseValue(service.estimated_value);
        const finalValue = parseValue(service.final_value);
        const serviceDate = service.scheduled_date;
        const status = service.status;

        // Add to unique customers set
        if (service.customer_id) {
          uniqueCustomers.add(service.customer_id);
        }

        // Calculate daily revenue (today's services)
        if (serviceDate === todayStr && status !== 'cancelled') {
          dailyRevenue += estimatedValue;
          dailyServices++;
          console.log(`Daily service found: ID ${service.id}, Date: ${serviceDate}, Value: ${estimatedValue}, Status: ${status}`);
        }

        // Calculate weekly services (this week's services from Monday to today)
        if (serviceDate >= weekStartStr && serviceDate <= todayStr && status !== 'cancelled') {
          weeklyServices++;
        }

        // Calculate completed revenue
        if (status === 'completed') {
          completedRevenue += finalValue > 0 ? finalValue : estimatedValue;
        }

        // Calculate predicted revenue (all non-cancelled)
        if (status !== 'cancelled') {
          predictedRevenue += estimatedValue;
        }

        // Count future appointments
        if (serviceDate > todayStr && status === 'scheduled') {
          appointments++;
        }
      });



      const result = {
        dailyRevenue: Math.round(dailyRevenue * 100) / 100,
        completedRevenue: Math.round(completedRevenue * 100) / 100,
        predictedRevenue: Math.round(predictedRevenue * 100) / 100,
        dailyServices,
        weeklyServices,
        appointments,
        activeCustomers: uniqueCustomers.size
      };

      console.log("Dashboard stats result:", result);
      return result;

    } catch (error) {
      console.error('Error in getDashboardStats:', error);
      return {
        dailyRevenue: 0,
        completedRevenue: 0,
        predictedRevenue: 0,
        dailyServices: 0,
        weeklyServices: 0,
        appointments: 0,
        activeCustomers: 0
      };
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

    // Get current date in Brazilian timezone (UTC-3)
    const today = new Date();
    const brazilTime = new Date(today.getTime() - (3 * 60 * 60 * 1000));
    const brazilianDate = brazilTime.toISOString().split('T')[0];
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
      let query = sql`
        SELECT 
          st.name,
          COUNT(s.id) as count,
          COALESCE(SUM(CASE 
            WHEN s.final_value IS NOT NULL 
            AND s.final_value != '' 
            AND s.final_value != '0'
            AND s.final_value != '0.00'
            AND s.final_value ~ '^[0-9]+(\.[0-9]+)?$'
            THEN CAST(s.final_value AS NUMERIC)
            WHEN s.estimated_value IS NOT NULL 
            AND s.estimated_value != '' 
            AND s.estimated_value != '0'
            AND s.estimated_value != '0.00'
            AND s.estimated_value ~ '^[0-9]+(\.[0-9]+)?$'
            THEN CAST(s.estimated_value AS NUMERIC)
            ELSE 0 
          END), 0) as revenue
        FROM service_types st
        LEFT JOIN services s ON st.id = s.service_type_id 
        WHERE (s.id IS NULL OR s.status != 'cancelled')
      `;

      if (technicianId) {
        query = sql`${query} AND s.technician_id = ${technicianId}`;
      }

      query = sql`${query}
        GROUP BY st.id, st.name
        HAVING COUNT(s.id) > 0
        ORDER BY count DESC, revenue DESC
        LIMIT 5
      `;

      const result = await db.execute(query);

      console.log("Storage: Found", result.rows.length, "top services");
      const topServices = result.rows.map(row => ({
        name: row.name,
        count: Number(row.count),
        revenue: Number(row.revenue || 0),
      }));

      console.log("Storage: Top services result:", topServices);
      return topServices;
    } catch (error) {
      console.error("Error getting top services:", error);
      return []; // Return empty array instead of throwing
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
      const newCustomersMonth= await db
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

      console.log(`Found ${revenueData.length} completed services in date range`);      // Group by date and sum revenue (only from completed services)
      const revenueByDate: { [key: string]: number } = {};

      revenueData.forEach(service => {
        const date = service.date;
        if (!date) return; // Skip services without dates

        let revenue = 0;
        if (service.finalValue && service.finalValue !== '' && String(service.finalValue).match(/^[0-9]+(\.[0-9]+)?$/)) {
          revenue = Number(service.finalValue);
        } else if (service.estimatedValue && service.estimatedValue !== '' &&
                   String(service.estimatedValue).match(/^[0-9]+(\.[0-9]+)?$/)) {
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
        if (service.status === 'completed' && service.finalValue && service.finalValue !== '' &&
            String(service.finalValue).match(/^[0-9]+(\.[0-9]+)?$/)) {
          revenue = Number(service.finalValue);
        } else if (service.estimatedValue && service.estimatedValue !== '' &&
                   String(service.estimatedValue).match(/^[0-9]+(\.[0-9]+)?$/)) {
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





  // Photo operations
  async getPhotos(filters?: { customerId?: number; vehicleId?: number; serviceId?: number; category?: string }): Promise<Photo[]> {
    try {
      let query = db.select().from(photos);

      if (filters) {
        const conditions = [];
        if (filters.customerId) {
          conditions.push(and(eq(photos.entityType, 'customer'), eq(photos.entityId, filters.customerId)));
        }
        if (filters.vehicleId) {
          conditions.push(and(eq(photos.entityType, 'vehicle'), eq(photos.entityId, filters.vehicleId)));
        }
        if (filters.serviceId) {
          console.log('Storage: Looking for photos with service ID:', filters.serviceId);
          conditions.push(and(eq(photos.entityType, 'service'), eq(photos.entityId, filters.serviceId)));
        }
        if (filters.category) conditions.push(eq(photos.category, filters.category));

        if (conditions.length > 0) {
          if (conditions.length === 1) {
            query = query.where(conditions[0]);
          } else {
            query = query.where(or(...conditions));
          }
        }
      }

      const result = await query.orderBy(desc(photos.createdAt));
      console.log('Storage: Found photos:', result.length);
      return result;
    } catch (error) {
      console.error('Error fetching photos:', error);
      throw error;
    }
  }

  async getPhoto(id: number): Promise<Photo | undefined> {
    try {
      const [photo] = await db.select().from(photos).where(eq(photos.id, id));
      return photo;
    } catch (error) {
      console.error('Error fetching photo:', error);
      throw error;
    }
  }

  async createPhoto(photo: InsertPhoto): Promise<Photo> {
    try {
      const [newPhoto] = await db.insert(photos).values({
        ...photo,
        createdAt: new Date(),
      }).returning();
      return newPhoto;
    } catch (error) {
      console.error('Error creating photo:', error);
      throw error;
    }
  }

  async updatePhoto(id: number, photo: Partial<InsertPhoto>): Promise<Photo> {
    try {
      const [updatedPhoto] = await db
        .update(photos)
        .set({ ...photo, updatedAt: new Date() })
        .where(eq(photos.id, id))
        .returning();
      return updatedPhoto;
    } catch (error) {
      console.error('Error updating photo:', error);
      throw error;
    }
  }

  async deletePhoto(id: number): Promise<void> {
    try {
      await db.delete(photos).where(eq(photos.id, id));
    } catch (error) {
      console.error('Error deleting photo:', error);
      throw error;
    }
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
  async getScheduleStats(technicianId?: number | null) {
    try {
      // Use current date in Brazilian timezone (UTC-3)
      const now = new Date();
      const brazilianTime = new Date(now.getTime() - (3 * 60 * 60 * 1000)); // UTC-3
      const today = brazilianTime.toISOString().split('T')[0];
      // Calculate actual week start (Monday) in Brazilian timezone
      const currentDay = brazilianTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // If Sunday, go back 6 days
      const weekStart = new Date(brazilianTime.getTime() - (daysFromMonday * 24 * 60 * 60 * 1000));
      const weekStartStr = weekStart.toISOString().split('T')[0];

      console.log('Schedule stats - Today date:', today);
      console.log('Schedule stats - Week ago date:', weekAgoStr);

      const technicianCondition = technicianId ? sql`AND technician_id = ${technicianId}` : sql``;

      // Today's appointments
      const todayResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM services 
        WHERE scheduled_date = ${today}
        ${technicianCondition}
      `);

      // This week's appointments
      const thisWeekResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM services 
        WHERE scheduled_date >= ${weekStartStr}
        AND scheduled_date <= ${today}
        ${technicianCondition}
      `);

      // Completed this week
      const completedResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM services 
        WHERE scheduled_date >= ${weekStartStr}
        AND scheduled_date <= ${today}
        AND status = 'completed'
        ${technicianCondition}
      `);

      // Overdue (scheduled in the past but not completed)
      const overdueResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM services 
        WHERE scheduled_date < ${today}
        AND status = 'scheduled'
        ${technicianCondition}
      `);

      const result = {
        today: Number(todayResult.rows[0]?.count) || 0,
        thisWeek: Number(thisWeekResult.rows[0]?.count) || 0,
        completed: Number(completedResult.rows[0]?.count) || 0,
        overdue: Number(overdueResult.rows[0]?.count) || 0
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

  // Get today's appointments
  async getTodayAppointments(technicianId?: number | null): Promise<any[]> {
    console.log("Storage: Getting today's appointments...", technicianId ? `for technician ${technicianId}` : "for admin");

    // Get current date in Brazilian timezone (UTC-3)
    const today = new Date();
    const brazilTime = new Date(today.getTime() - (3 * 60 * 60 * 1000));
    const brazilianDate = brazilTime.toISOString().split('T')[0];
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
        WHERE s.scheduled_date = ${brazilianDate}
        ${technicianCondition}
        ORDER BY COALESCE(s.scheduled_time, '00:00:00') ASC
      `);

      console.log("Storage: Total today's appointments:", result.rows.length);
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

      console.log("Storage: Found", appointments.length, "today's appointments");
      return appointments;
    } catch (error) {
      console.error("Error getting today's appointments:", error);
      throw error;
    }
  }


  async getServiceById(serviceId: number, userId?: number): Promise<(Service & { customer: Customer; vehicle: Vehicle; serviceType: ServiceType }) | undefined> {
    try {
      const [service] = await db
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
        .where(eq(services.id, serviceId));

      if (!service) {
        return undefined;
      }

      return {
        ...service.service,
        customer: service.customer!,
        vehicle: service.vehicle!,
        serviceType: service.serviceType!,
      };
    } catch (error) {
      console.error('Error fetching service:', error);
      throw error;
    }
  }

  async createServiceWithItems(data: InsertService): Promise<Service> {
    // const client = await this.pool.connect();

    try {
      // await client.query('BEGIN');

      // Create the service first
      const serviceData = { ...data };
      delete serviceData.serviceItems; // Remove serviceItems from service data

      const [service] = await db.insert(services).values(serviceData).returning();
      // const service = serviceResult[0];

      // Create service items if they exist
      if (data.serviceItems && data.serviceItems.length > 0) {
        const serviceItemsData = data.serviceItems.map(item => ({
          serviceId: service.id,
          serviceTypeId: item.serviceTypeId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          notes: item.notes,
        }));

        await db.insert(serviceItems).values(serviceItemsData).returning();
      }

      // await client.query('COMMIT');
      return service;
    } catch (error) {
      // await client.query('ROLLBACK');
      console.error('Storage: Error creating service with items:', error);
      throw error;
    } finally {
      // client.release();
    }
  }
}

export const storage = new DatabaseStorage();