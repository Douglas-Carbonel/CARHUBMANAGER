import express, { type Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { storage } from "./storage";
import { photosStorage } from "./photos-storage.js";
import type { User } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
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
import { db } from "./db";
import { sql } from "drizzle-orm";

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
  insertUserSchema,
  insertServiceExtraSchema,
  insertServiceExtraItemSchema
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
      const user = req.user!;
      const services = await storage.getServices(user.role === 'admin' ? undefined : user.id);
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.get("/api/services/:id", requireAuth, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const user = req.user!;
      const service = await storage.getServiceById(serviceId, user.role === 'admin' ? undefined : user.id);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      console.error("Error fetching service:", error);
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
        estimatedValue: req.body.estimatedValue && req.body.estimatedValue !== "" ? String(req.body.estimatedValue) : undefined,
        valorPago: req.body.valorPago && req.body.valorPago !== "" ? String(req.body.valorPago) : "0.00",
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

      // Process service extras if they exist
      if (req.body.serviceExtras && Array.isArray(req.body.serviceExtras) && req.body.serviceExtras.length > 0) {
        console.log('Processing service extras:', req.body.serviceExtras);

        for (const extra of req.body.serviceExtras) {
          const extraItem = {
            serviceId: service.id,
            serviceExtraId: extra.serviceExtraId,
            valor: extra.valor || "0.00",
            observacao: extra.observacao || "",
          };

          console.log('Creating service extra item:', extraItem);
          await storage.createServiceExtraItem(extraItem);
        }

        console.log('All service extras processed successfully');
      }

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
      const serviceId = parseInt(req.params.id);
      const serviceData = insertServiceSchema.partial().parse(req.body);
      const service = await storage.updateService(serviceId, serviceData);

      // Process service extras if they exist
      if (req.body.serviceExtras && Array.isArray(req.body.serviceExtras)) {
        console.log('Updating service extras for service ID:', serviceId);
        console.log('Service extras data:', req.body.serviceExtras);

        // First, remove existing service extras for this service
        await storage.deleteServiceExtraItemsByServiceId(serviceId);

        // Then add the new ones
        for (const extra of req.body.serviceExtras) {
          const extraItem = {
            serviceId: serviceId,
            serviceExtraId: extra.serviceExtraId,
            valor: extra.valor || "0.00",
            observacao: extra.observacao || "",
          };

          console.log('Creating updated service extra item:', extraItem);
          await storage.createServiceExtraItem(extraItem);
        }

        console.log('Service extras updated successfully');
      }

      res.json(service);
    } catch (error: any) {
      console.error('Error updating service:', error);
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

  // Dashboard stats com lógica correta
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const technicianId = user.role === 'admin' ? null : user.id;

      // Buscar todos os serviços
      const allServices = await storage.getServices();

      let receitaRealizada = 0;  // Serviços com valorPago > 0
      let receitaPendente = 0;   // Serviços com valorPago = 0
      let servicosConcluidos = 0; // Status = 'completed'
      let pagamentosPendentes = 0; // valorPago = 0
      let servicosComPagamentoParcial = 0; // 0 < valorPago < estimatedValue

      allServices.forEach((service: any) => {
        const estimatedValue = parseFloat(service.estimatedValue || 0);
        const valorPago = parseFloat(service.valorPago || 0);
        const status = service.status;

        // Receita realizada (serviços que receberam algum pagamento)
        if (valorPago > 0) {
          receitaRealizada += valorPago;
        }

        // Receita pendente (valor estimado menos o que foi pago)
        if (valorPago < estimatedValue) {
          receitaPendente += (estimatedValue - valorPago);
        }

        // Serviços concluídos
        if (status === 'completed') {
          servicosConcluidos++;
        }

        // Pagamentos pendentes (serviços sem nenhum pagamento)
        if (valorPago === 0) {
          pagamentosPendentes++;
        }

        // Pagamentos parciais
        if (valorPago > 0 && valorPago < estimatedValue) {
          servicosComPagamentoParcial++;
        }
      });

      const stats = {
        receitaRealizada: Math.round(receitaRealizada * 100) / 100,
        receitaPendente: Math.round(receitaPendente * 100) / 100,
        servicosConcluidos,
        pagamentosPendentes,
        servicosComPagamentoParcial,
        totalServicos: allServices.length,
        // Manter compatibilidade com cards antigos
        completedRevenue: Math.round(receitaRealizada * 100) / 100,
        predictedRevenue: Math.round((receitaRealizada + receitaPendente) * 100) / 100,
        activeCustomers: pagamentosPendentes,
        weeklyServices: servicosConcluidos
      };

      console.log("Dashboard stats (nova lógica):", stats);
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

  // Dashboard realized revenue data (serviços com pagamento)
  app.get("/api/dashboard/realized-revenue", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      console.log(`API: Getting realized revenue data for ${days} days (paid services only)`);

      // Buscar todos os serviços dos últimos X dias
      const allServices = await storage.getServices();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days + 1);

      const revenueByDate: Record<string, number> = {};

      // Inicializar todos os dias com 0
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        revenueByDate[dateStr] = 0;
      }

      // Calcular receita apenas de serviços com pagamento
      allServices.forEach((service: any) => {
        const serviceDate = service.scheduledDate;
        const valorPago = parseFloat(service.valorPago || 0);

        if (valorPago > 0 && serviceDate in revenueByDate) {
          revenueByDate[serviceDate] += valorPago;
        }
      });

      // Converter para formato esperado pelo gráfico
      const chartData = Object.entries(revenueByDate).map(([date, revenue]) => {
        const dateObj = new Date(date);
        const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');

        return {
          date: dayName,
          fullDate: date,
          revenue: Math.round((revenue as number) * 100) / 100
        };
      });

      console.log('Realized revenue data (paid services):', chartData);
      res.json(chartData);
    } catch (error) {
      console.error('API Error getting realized revenue data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get("/api/dashboard/top-services", async (req, res) => {
    try {
      const topServices = await storage.getTopServices();
      console.log("API: Top services result:", topServices);
      res.json(topServices);
    } catch (error) {
      console.error("API: Error getting top services:", error);
      res.status(500).json({ error: "Failed to get top services" });
    }
  });

  app.get("/api/dashboard/service-status", async (req, res) => {
    try {
      const statusData = await storage.getServiceStatusData();
      console.log("API: Service status result:", statusData);
      res.json(statusData);
    } catch (error) {
      console.error("API: Error getting service status:", error);
      res.status(500).json({ error: "Failed to get service status data" });
    }
  });

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.status(200).send("OK");
  });

  // Use the router
  app.use(router);

  // Handle 404 errors
  app.use((req, res) => {
    res.status(404).json({ message: "Not Found" });
  });

  const httpServer = createServer(app);
  return httpServer;
}