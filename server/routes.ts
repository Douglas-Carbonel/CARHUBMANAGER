import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { storage } from "./storage";
import type { User } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Configure multer for file uploads
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});
import { setupAuth, createInitialAdmin, hashPassword } from "./auth";
import { getFixedDashboardStats } from "./storage-dashboard-fix";

// Function to create initial service types
async function createInitialServiceTypes() {
  try {
    const existingTypes = await storage.getServiceTypes();

    // Lista completa de tipos de serviços (incluindo os novos)
    const allServiceTypes = [
      { 
        name: "Troca de Óleo", 
        description: "Troca de óleo do motor", 
        defaultPrice: "80.00",
        isRecurring: true,
        intervalMonths: 6,
        loyaltyPoints: 10
      },
      { 
        name: "Alinhamento", 
        description: "Alinhamento e balanceamento", 
        defaultPrice: "120.00",
        isRecurring: true,
        intervalMonths: 12,
        loyaltyPoints: 15
      },
      { 
        name: "Revisão Geral", 
        description: "Revisão completa do veículo", 
        defaultPrice: "300.00",
        isRecurring: true,
        intervalMonths: 12,
        loyaltyPoints: 30
      },
      { 
        name: "Troca de Pneus", 
        description: "Troca de pneus", 
        defaultPrice: "200.00",
        isRecurring: false,
        loyaltyPoints: 20
      },
      { 
        name: "Lavagem", 
        description: "Lavagem completa", 
        defaultPrice: "30.00",
        isRecurring: false,
        loyaltyPoints: 5
      },
      { 
        name: "Freios", 
        description: "Manutenção do sistema de freios", 
        defaultPrice: "150.00",
        isRecurring: true,
        intervalMonths: 18,
        loyaltyPoints: 18
      },
      { 
        name: "Higienização", 
        description: "Serviços de higienização e limpeza profunda", 
        defaultPrice: "100.00",
        isRecurring: true,
        intervalMonths: 1,
        loyaltyPoints: 8
      },
      { 
        name: "Reparo", 
        description: "Serviços de reparo e manutenção", 
        defaultPrice: "180.00",
        isRecurring: false,
        loyaltyPoints: 15
      },
      { 
        name: "Outros", 
        description: "Outros serviços não especificados", 
        defaultPrice: "50.00",
        isRecurring: false,
        loyaltyPoints: 5
      },
    ];

    // Verifica quais tipos já existem
    const existingNames = existingTypes.map(type => type.name);

    // Adiciona apenas os tipos que não existem
    for (const serviceType of allServiceTypes) {
      if (!existingNames.includes(serviceType.name)) {
        await storage.createServiceType(serviceType);
        console.log(`Tipo de serviço "${serviceType.name}" criado com sucesso`);
      }
    }

    if (existingTypes.length === 0) {
      console.log("Tipos de serviço iniciais criados com sucesso");
    } else {
      console.log("Novos tipos de serviço adicionados com sucesso");
    }
  } catch (error) {
    console.error("Erro ao criar tipos de serviço iniciais:", error);
  }
}
import { 
  insertCustomerSchema,
  insertVehicleSchema,
  insertServiceSchema,
  insertServiceTypeSchema,
  insertPaymentSchema,
  insertUserSchema
} from "@shared/schema";


// Authentication middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

// Admin middleware
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  const router = express.Router();

  // Set up authentication
  setupAuth(app);

  // Create initial admin user
  await createInitialAdmin();

  // Create initial service types if they don't exist
  await createInitialServiceTypes();

  // Customer routes
  app.get("/api/customers", requireAuth, async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", requireAuth, async (req, res) => {
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

  app.post("/api/customers", requireAuth, async (req, res) => {
    try {
      console.log('POST /api/customers - Request body:', JSON.stringify(req.body, null, 2));
      console.log('POST /api/customers - User:', req.user?.username);

      const customerData = insertCustomerSchema.parse(req.body);
      console.log('POST /api/customers - Parsed data:', JSON.stringify(customerData, null, 2));

      // Check if document already exists (only if document is provided)
      if (customerData.document && customerData.document.trim() !== '') {
        const existingCustomer = await storage.getCustomerByDocument(customerData.document);
        if (existingCustomer) {
          console.log('POST /api/customers - Document already exists:', customerData.document);
          return res.status(400).json({ message: "Document already registered" });
        }
      }

      console.log('POST /api/customers - Creating customer...');
      const customer = await storage.createCustomer(customerData);
      console.log('POST /api/customers - Customer created successfully:', customer);
      res.status(201).json(customer);
    } catch (error: any) {
      console.error('POST /api/customers - Error:', error);
      if (error.name === 'ZodError') {
        console.error('POST /api/customers - Validation errors:', error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create customer", error: error.message });
    }
  });

  app.put("/api/customers/:id", requireAuth, async (req, res) => {
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

  app.delete("/api/customers/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteCustomer(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  // Vehicle routes
  app.get("/api/vehicles", requireAuth, async (req, res) => {
    try {
      const vehicles = await storage.getVehiclesWithCustomers();
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vehicles" });
    }
  });

  app.get("/api/customers/:customerId/vehicles", requireAuth, async (req, res) => {
    try {
      const vehicles = await storage.getVehiclesByCustomer(parseInt(req.params.customerId));
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vehicles" });
    }
  });

  app.post("/api/vehicles", requireAuth, async (req, res) => {
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

  app.put("/api/vehicles/:id", requireAuth, async (req, res) => {
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

  app.delete("/api/vehicles/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteVehicle(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting vehicle:', error);
      if (error.message && error.message.includes('serviço(s) em aberto')) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete vehicle" });
    }
  });

  // Service routes
  app.get("/api/services", requireAuth, async (req, res) => {
    try {
      const services = await storage.getServices();
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.get("/api/services/:id", requireAuth, async (req, res) => {
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

  app.post("/api/services", requireAuth, async (req, res) => {
    try {
      console.log('Received service data:', JSON.stringify(req.body, null, 2));

      // Prepare the data for validation
      const cleanedData = {
        ...req.body,
        customerId: Number(req.body.customerId),
        vehicleId: Number(req.body.vehicleId),
        serviceTypeId: Number(req.body.serviceTypeId),
        estimatedValue: req.body.estimatedValue && req.body.estimatedValue !== "" ? req.body.estimatedValue : undefined,
        notes: req.body.notes || undefined,
        scheduledTime: req.body.scheduledTime || undefined,
      };

      const serviceData = insertServiceSchema.parse(cleanedData);
      console.log('Parsed service data:', JSON.stringify(serviceData, null, 2));

      // Se não foi informada data de agendamento, usar a data atual (sem conversão de timezone)
      if (!serviceData.scheduledDate || serviceData.scheduledDate === "") {
        const now = new Date();
        // Usar timezone local para evitar problemas de conversão
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        serviceData.scheduledDate = `${year}-${month}-${day}`;
      }

      // Se não foi informada hora de agendamento, usar a hora atual
      if (!serviceData.scheduledTime || serviceData.scheduledTime === "") {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        serviceData.scheduledTime = `${hours}:${minutes}:${seconds}`;
      }

      console.log('Creating service with data:', JSON.stringify(serviceData, null, 2));
      const service = await storage.createService(serviceData);
      console.log('Service created successfully:', service);
      res.status(201).json(service);
    } catch (error: any) {
      console.error('Error creating service:', error);
      if (error.name === 'ZodError') {
        console.error('Validation errors:', error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create service", error: error.message });
    }
  });

  app.put("/api/services/:id", requireAuth, async (req, res) => {
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

  app.delete("/api/services/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteService(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete service" });
    }
  });

  // Service type routes
  app.get("/api/service-types", requireAuth, async (req, res) => {
    try {
      const serviceTypes = await storage.getServiceTypes();
      console.log("Service types retornados:", serviceTypes.length, serviceTypes);
      res.json(serviceTypes);
    } catch (error) {
      console.error("Erro ao buscar tipos de serviço:", error);
      res.status(500).json({ message: "Failed to fetch service types" });
    }
  });

  app.post("/api/service-types", requireAuth, async (req, res) => {
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
  app.get("/api/services/:serviceId/payments", requireAuth, async (req, res) => {
    try {
      const payments = await storage.getPaymentsByService(parseInt(req.params.serviceId));
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.post("/api/payments", requireAuth, async (req, res) => {
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

  // Dashboard stats
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      console.log("Dashboard stats API - User:", user.role, user.id);
      const technicianId = user.role === 'admin' ? null : user.id;
      console.log("Dashboard stats API - Using technicianId:", technicianId);
      const stats = await getFixedDashboardStats(technicianId);
      console.log("Dashboard stats API - Result:", stats);
      res.json(stats);
    } catch (error) {
      console.error("Error getting dashboard stats:", error);
      res.status(500).json({ message: "Failed to get dashboard stats", error: error.message });
    }
  });

  // Dashboard new analytics
  app.get("/api/dashboard/analytics", requireAuth, async (req, res) => {
    try {
      const analytics = await storage.getDashboardAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error getting dashboard analytics:", error);
      res.status(500).json({ message: "Failed to get dashboard analytics" });
    }
  });

  // Dashboard revenue data
  app.get("/api/dashboard/revenue", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      console.log(`API: Getting revenue data for ${days} days`);
      const revenueData = await storage.getRevenueByDays(days);
      console.log('Revenue data retrieved:', revenueData);
      res.json(revenueData);
    } catch (error) {
      console.error('API Error getting revenue data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Dashboard realized revenue data (completed services only)
  app.get("/api/dashboard/realized-revenue", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      console.log(`API: Getting realized revenue data for ${days} days`);
      const realizedRevenueData = await storage.getRealizedRevenueByDays(days);
      console.log('Realized revenue data retrieved:', realizedRevenueData);
      res.json(realizedRevenueData);
    } catch (error) {
      console.error('API Error getting realized revenue data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Top services
  app.get("/api/dashboard/top-services", requireAuth, async (req, res) => {
    try {
      console.log("API: Getting top services...");
      const user = req.user!;
      const topServices = await storage.getTopServices(user.role === 'admin' ? null : user.id);
      console.log("API: Top services result:", topServices);
      res.json(topServices);
    } catch (error) {
      console.error("API Error getting top services:", error);
      res.status(500).json({ message: "Failed to get top services", error: error.message });
    }
  });

  // Recent services
  app.get("/api/dashboard/recent-services", requireAuth, async (req, res) => {
    try {
      console.log("API: Getting recent services...");
      const user = req.user!;
      const limit = parseInt(req.query.limit as string) || 5;
      const recentServices = await storage.getRecentServices(limit, user.role === 'admin' ? null : user.id);
      console.log("API: Recent services result:", recentServices.length, "services");
      res.json(recentServices);
    } catch (error) {
      console.error("API Error getting recent services:", error);
      res.status(500).json({ message: "Failed to get recent services", error: error.message });
    }
  });

  // Upcoming appointments
  app.get("/api/dashboard/upcoming-appointments", requireAuth, async (req, res) => {
    try {
      console.log("API: Getting upcoming appointments...");
      const user = req.user!;
      const limit = parseInt(req.query.limit as string) || 5;
      const appointments = await storage.getUpcomingAppointments(limit, user.role === 'admin' ? null : user.id);
      console.log("API: Upcoming appointments result:", appointments.length, "appointments");
      res.json(appointments);
    } catch (error) {
      console.error("API Error getting upcoming appointments:", error);
      res.status(500).json({ message: "Failed to get upcoming appointments", error: error.message });
    }
  });

  // Analytics routes - Admin only
  app.get("/api/analytics/services", requireAdmin, async (req, res) => {
    try {
      const analytics = await storage.getServiceAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error getting service analytics:", error);
      res.status(500).json({ message: "Failed to get service analytics" });
    }
  });

  app.get("/api/analytics/customers", requireAdmin, async (req, res) => {
    try {
      const analytics = await storage.getCustomerAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error getting customer analytics:", error);
      res.status(500).json({ message: "Failed to get customer analytics" });
    }
  });

app.get("/api/analytics/vehicles", requireAdmin, async (req, res) => {
    try {
      const analytics = await storage.getVehicleAnalytics();
      res.json(analytics);
    } catch (error: any) {
      console.error("Error fetching vehicle analytics:", error);
      res.status(500).json({ 
        error: "Failed to fetch vehicle analytics",
        details: error.message 
      });
    }
  });

  // Schedule-specific dashboard routes
  app.get("/api/dashboard/schedule-stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getScheduleStats();
      res.json(stats);
    } catch (error) {
      console.error("Error getting schedule stats:", error);
      res.status(500).json({ message: "Failed to get schedule stats" });
    }
  });

  app.get("/api/dashboard/today-appointments", requireAuth, async (req, res) => {
    try {
      console.log("API: Getting today appointments...");
      const user = req.user!;
      const appointments = await storage.getTodayAppointments(user.role === 'admin' ? null : user.id);
      console.log("API: Today appointments result:", appointments.length, "appointments");
      res.json(appointments);
    } catch (error) {
      console.error("API Error getting today appointments:", error);
      res.status(500).json({ message: "Failed to get today appointments", error: error.message });
    }
  });

  // Admin user management routes
  app.get("/api/admin/users", requireAuth, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      // Hash the password before storing
      if (userData.password) {
        userData.password = await hashPassword(userData.password);
      }

      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ message: "Invalid user data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create user" });
      }
    }
  });

  app.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userData = req.body;
      const user = await storage.updateUser(id, userData);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Loyalty tracking routes
  app.get("/api/loyalty/tracking", requireAuth, async (req, res) => {
    try {
      const tracking = await storage.getLoyaltyTracking();
      res.json(tracking);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch loyalty tracking" });
    }
  });

  app.get("/api/loyalty/customer/:customerId", requireAuth, async (req, res) => {
    try {
      const tracking = await storage.getLoyaltyTrackingByCustomer(parseInt(req.params.customerId));
      res.json(tracking);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer loyalty tracking" });
    }
  });

  app.get("/api/loyalty/overdue", requireAuth, async (req, res) => {
    try {
      const overdue = await storage.getOverdueLoyaltyServices();
      res.json(overdue);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch overdue loyalty services" });
    }
  });

  app.get("/api/loyalty/upcoming/:days", requireAuth, async (req, res) => {
    try {
      const days = parseInt(req.params.days) || 30;
      const upcoming = await storage.getUpcomingLoyaltyServices(days);
      res.json(upcoming);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch upcoming loyalty services" });
    }
  });

  app.get("/api/login", (req, res) => {
    // Redirect to auth page when accessing login via GET
    res.redirect("/auth");
  });

  // Photo routes
  router.get("/api/photos", requireAuth, async (req, res) => {
    try {
      const { customerId, vehicleId, serviceId, category } = req.query;
      const filters: any = {};

      if (customerId) filters.customerId = parseInt(customerId as string);
      if (vehicleId) filters.vehicleId = parseInt(vehicleId as string);
      if (serviceId) filters.serviceId = parseInt(serviceId as string);
      if (category) filters.category = category as string;

      const photos = await storage.getPhotos(filters);
      res.json(photos);
    } catch (error) {
      console.error("Error getting photos:", error);
      res.status(500).json({ message: "Failed to get photos" });
    }
  });

  router.get("/api/photos/:id", requireAuth, async (req, res) => {
    try {
      const photoId = parseInt(req.params.id);
      const photo = await storage.getPhoto(photoId);

      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }

      res.json(photo);
    } catch (error) {
      console.error("Error getting photo:", error);
      res.status(500).json({ message: "Failed to get photo" });
    }
  });

  router.post("/api/photos/upload", requireAuth, upload.single('photo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No photo file provided" });
      }

      const { customerId, vehicleId, serviceId, category, description } = req.body;

      const photoData = {
        customerId: customerId ? parseInt(customerId) : null,
        vehicleId: vehicleId ? parseInt(vehicleId) : null,
        serviceId: serviceId ? parseInt(serviceId) : null,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/${req.file.filename}`,
        description: description || null,
        category: category || 'other',
      };

      const photo = await storage.createPhoto(photoData);
      res.status(201).json(photo);
    } catch (error) {
      console.error("Error uploading photo:", error);
      res.status(500).json({ message: "Failed to upload photo" });
    }
  });

  router.put("/api/photos/:id", requireAuth, async (req, res) => {
    try {
      const photoId = parseInt(req.params.id);
      const updateData = req.body;

      const photo = await storage.updatePhoto(photoId, updateData);
      res.json(photo);
    } catch (error) {
      console.error("Error updating photo:", error);
      res.status(500).json({ message: "Failed to update photo" });
    }
  });

  router.delete("/api/photos/:id", requireAuth, async (req, res) => {
    try {
      const photoId = parseInt(req.params.id);

      // Get photo info to delete file
      const photo = await storage.getPhoto(photoId);
      if (photo) {
        const filePath = path.join(uploadsDir, photo.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await storage.deletePhoto(photoId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting photo:", error);
      res.status(500).json({ message: "Failed to delete photo" });
    }
  });

  // Serve uploaded files
  router.use('/uploads', express.static(uploadsDir));

  app.use('/', router);

  const httpServer = createServer(app);
  return httpServer;
}