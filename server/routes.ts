import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertCustomerSchema,
  insertVehicleSchema,
  insertServiceSchema,
  insertServiceTypeSchema,
  insertPaymentSchema
} from "@shared/schema";

// Development authentication middleware
const isAuthenticatedDev: any = async (req: any, res: any, next: any) => {
  // For development, always allow access
  req.user = { claims: { sub: 'dev-user-123' } };
  return next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Development auth bypass - create test user
  await storage.upsertUser({
    id: 'dev-user-123',
    email: 'admin@carhub.com',
    firstName: 'Admin',
    lastName: 'CarHub',
    role: 'admin'
  });

  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Return test user for development
      const user = await storage.getUser('dev-user-123');
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Customer routes
  app.get("/api/customers", isAuthenticatedDev, async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", isAuthenticatedDev, async (req, res) => {
    try {
      const customer = await storage.getCustomer(parseInt(req.params.id));
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", isAuthenticatedDev, async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      
      // Check if document already exists
      const existingCustomer = await storage.getCustomerByDocument(customerData.document);
      if (existingCustomer) {
        return res.status(400).json({ message: "Document already registered" });
      }

      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.put("/api/customers/:id", isAuthenticatedDev, async (req, res) => {
    try {
      const customerData = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(parseInt(req.params.id), customerData);
      res.json(customer);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", isAuthenticatedDev, async (req, res) => {
    try {
      await storage.deleteCustomer(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  // Vehicle routes
  app.get("/api/vehicles", isAuthenticatedDev, async (req, res) => {
    try {
      const vehicles = await storage.getVehicles();
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vehicles" });
    }
  });

  app.get("/api/customers/:customerId/vehicles", isAuthenticatedDev, async (req, res) => {
    try {
      const vehicles = await storage.getVehiclesByCustomer(parseInt(req.params.customerId));
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vehicles" });
    }
  });

  app.post("/api/vehicles", isAuthenticatedDev, async (req, res) => {
    try {
      const vehicleData = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(vehicleData);
      res.status(201).json(vehicle);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create vehicle" });
    }
  });

  app.put("/api/vehicles/:id", isAuthenticatedDev, async (req, res) => {
    try {
      const vehicleData = insertVehicleSchema.partial().parse(req.body);
      const vehicle = await storage.updateVehicle(parseInt(req.params.id), vehicleData);
      res.json(vehicle);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update vehicle" });
    }
  });

  app.delete("/api/vehicles/:id", isAuthenticatedDev, async (req, res) => {
    try {
      await storage.deleteVehicle(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete vehicle" });
    }
  });

  // Service routes
  app.get("/api/services", isAuthenticatedDev, async (req, res) => {
    try {
      const services = await storage.getServices();
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.get("/api/services/:id", isAuthenticatedDev, async (req, res) => {
    try {
      const service = await storage.getService(parseInt(req.params.id));
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch service" });
    }
  });

  app.post("/api/services", isAuthenticatedDev, async (req, res) => {
    try {
      const serviceData = insertServiceSchema.parse(req.body);
      const service = await storage.createService(serviceData);
      res.status(201).json(service);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create service" });
    }
  });

  app.put("/api/services/:id", isAuthenticatedDev, async (req, res) => {
    try {
      const serviceData = insertServiceSchema.partial().parse(req.body);
      const service = await storage.updateService(parseInt(req.params.id), serviceData);
      res.json(service);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update service" });
    }
  });

  app.delete("/api/services/:id", isAuthenticatedDev, async (req, res) => {
    try {
      await storage.deleteService(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete service" });
    }
  });

  // Service type routes
  app.get("/api/service-types", isAuthenticatedDev, async (req, res) => {
    try {
      const serviceTypes = await storage.getServiceTypes();
      res.json(serviceTypes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch service types" });
    }
  });

  app.post("/api/service-types", isAuthenticatedDev, async (req, res) => {
    try {
      const serviceTypeData = insertServiceTypeSchema.parse(req.body);
      const serviceType = await storage.createServiceType(serviceTypeData);
      res.status(201).json(serviceType);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create service type" });
    }
  });

  // Payment routes
  app.get("/api/services/:serviceId/payments", isAuthenticatedDev, async (req, res) => {
    try {
      const payments = await storage.getPaymentsByService(parseInt(req.params.serviceId));
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.post("/api/payments", isAuthenticatedDev, async (req, res) => {
    try {
      const paymentData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(paymentData);
      res.status(201).json(payment);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/stats", isAuthenticatedDev, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/revenue", isAuthenticatedDev, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const revenue = await storage.getRevenueByDays(days);
      res.json(revenue);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch revenue data" });
    }
  });

  app.get("/api/dashboard/top-services", isAuthenticatedDev, async (req, res) => {
    try {
      const topServices = await storage.getTopServices();
      res.json(topServices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch top services" });
    }
  });

  app.get("/api/dashboard/recent-services", isAuthenticatedDev, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const recentServices = await storage.getRecentServices(limit);
      res.json(recentServices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent services" });
    }
  });

  app.get("/api/dashboard/upcoming-appointments", isAuthenticatedDev, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const appointments = await storage.getUpcomingAppointments(limit);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch upcoming appointments" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
