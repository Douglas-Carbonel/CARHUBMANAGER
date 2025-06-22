import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, MoreHorizontal, Plus, Search, Edit, Trash2, Clock, User, Car, Wrench, CheckCircle, XCircle, Timer, BarChart3, FileText, Camera, Coins, Calculator, Smartphone, Banknote, CreditCard, Receipt } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceSchema, type Service, type Customer, type Vehicle, type ServiceType, type Photo } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import ServiceAnalytics from "@/components/dashboard/service-analytics";
import { useLocation } from "wouter";
import PhotoUpload from "@/components/photos/photo-upload";
import CameraCapture from "@/components/camera/camera-capture";
import ServiceExtras from "@/components/service/service-extras";
import PaymentManager from "@/components/service/payment-manager";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";

// Utility functions for currency formatting
const formatCurrency = (value: string): string => {
  if (!value) return '';

  // Remove tudo que não for número
  let numericValue = value.replace(/[^\d]/g, '');

  // Se for vazio, retorna vazio
  if (!numericValue) return '';

  // Converte para número e divide por 100 para ter centavos
  const numberValue = parseInt(numericValue) / 100;

  // Formata para moeda brasileira
  return numberValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const parseCurrency = (formattedValue: string): string => {
  if (!formattedValue) return '0.00';

  // Remove tudo que não for número
  const numericValue = formattedValue.replace(/[^\d]/g, '');

  if (!numericValue) return '0.00';

  // Converte para formato decimal americano
  const numberValue = parseInt(numericValue) / 100;

  return numberValue.toFixed(2);
};

interface PaymentMethods {
  pix: string;
  dinheiro: string;
  cheque: string;
  cartao: string;
}

const serviceFormSchema = insertServiceSchema.extend({
  customerId: z.number().min(1, "Cliente é obrigatório"),
  vehicleId: z.number().min(1, "Veículo é obrigatório"),
  serviceTypeId: z.number().min(1, "Tipo de serviço é obrigatório"),
  technicianId: z.number().min(1, "Técnico é obrigatório"),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
  notes: z.string().optional(),
  valorPago: z.string().optional(), // Campo de valor pago
  pixPago: z.string().optional(),
  dinheiroPago: z.string().optional(),
  chequePago: z.string().optional(),
  cartaoPago: z.string().optional(),
});

export default function Services() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();

  // Get filters from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const customerIdFilter = urlParams.get('customerId') || '';
  const customerFilter = urlParams.get('customer') || '';
  const customerNameFilter = urlParams.get('customerName') || '';
  const vehicleIdFilter = urlParams.get('vehicleId');
  const vehiclePlateFilter = urlParams.get('vehiclePlate');
  const statusFilter = urlParams.get('status') || 'all';
  const openModalParam = urlParams.get('openModal') === 'true';

  // Debug logging
  console.log('Services page - location:', location);
  console.log('Services page - window.location.search:', window.location.search);
  console.log('Services page - customerIdFilter:', customerIdFilter);
  console.log('Services page - customerFilter:', customerFilter);
  console.log('Services page - statusFilter:', statusFilter);

  const [searchTerm, setSearchTerm] = useState(customerFilter);
  const [filterStatus, setFilterStatus] = useState<string>(statusFilter);
  const [filterPayment, setFilterPayment] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [currentServicePhotos, setCurrentServicePhotos] = useState<Photo[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [serviceExtras, setServiceExtras] = useState<any[]>([]);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState({
    pix: "",
    dinheiro: "",
    cheque: "",
    cartao: ""
  });
  const [temporaryPhotos, setTemporaryPhotos] = useState<Array<{ photo: string; category: string }>>([]);
  const [formInitialValues, setFormInitialValues] = useState<z.infer<typeof serviceFormSchema> | null>(null);

  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof serviceFormSchema>>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      customerId: 0,
      vehicleId: 0,
      serviceTypeId: 0,
      technicianId: 0,
      scheduledDate: "",
      scheduledTime: "",
      status: "scheduled",
      notes: "",
      valorPago: "0", // Valor pago inicializado como string "0"
      pixPago: "0.00",
      dinheiroPago: "0.00",
      chequePago: "0.00",
      cartaoPago: "0.00",
    },
  });

  // Track form changes for unsaved changes detection
  const currentFormValues = form.watch();
  const hasUnsavedChanges = formInitialValues && isDialogOpen && JSON.stringify(currentFormValues) !== JSON.stringify(formInitialValues);
  
  console.log('Services - hasUnsavedChanges:', hasUnsavedChanges);
  console.log('Services - formInitialValues:', formInitialValues);
  console.log('Services - currentFormValues:', currentFormValues);
  console.log('Services - temporaryPhotos:', temporaryPhotos.length);
  console.log('Services - serviceExtras:', serviceExtras.length);
  console.log('Services - isDialogOpen:', isDialogOpen);

  const unsavedChanges = useUnsavedChanges({
    hasUnsavedChanges: !!hasUnsavedChanges || temporaryPhotos.length > 0 || serviceExtras.length > 0,
    message: "Você tem alterações não salvas no cadastro do serviço. Deseja realmente sair?"
  });

  const { data: services = [] } = useQuery<(Service & { customer: Customer; vehicle: Vehicle; serviceType: ServiceType })[]>({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const res = await fetch("/api/services", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return await res.json();
    },
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return await res.json();
    },
  });

  const { data: vehicles = [] } = useQuery<(Vehicle & { customer: Customer })[]>({
    queryKey: ["/api/vehicles"],
    queryFn: async () => {
      const res = await fetch("/api/vehicles", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return await res.json();
    },
  });

  const { data: serviceTypes = [] } = useQuery<ServiceType[]>({
    queryKey: ["/api/service-types"],
    queryFn: async () => {
      const res = await fetch("/api/service-types", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return await res.json();
    },
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return await res.json();
    },
  });

  // Auto-open modal when openModal=true in URL
  useEffect(() => {
    if (openModalParam && customers.length > 0 && vehicles.length > 0) {
      const timer = setTimeout(() => {
        setEditingService(null);
        form.reset();
        setTemporaryPhotos([]);
        setCurrentServicePhotos([]);
        setServiceExtras([]);
        setPaymentMethods({
          pix: "",
          dinheiro: "",
          cheque: "",
          cartao: ""
        });

        // Pre-fill form with URL parameters
        if (customerIdFilter) {
          const customerId = parseInt(customerIdFilter);
          console.log('Auto-opening service modal with customer:', customerId);
          form.setValue('customerId', customerId);
        }

        if (vehicleIdFilter) {
          const vehicleId = parseInt(vehicleIdFilter);
          console.log('Auto-opening service modal with vehicle:', vehicleId);
          form.setValue('vehicleId', vehicleId);
        }

        setIsDialogOpen(true);

        // Remove openModal parameter from URL to prevent re-opening
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('openModal');
        window.history.replaceState({}, '', newUrl.toString());
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [openModalParam, customers, vehicles, customerIdFilter, vehicleIdFilter, form]);

  const fetchServicePhotos = async (serviceId: number | undefined) => {
    if (!serviceId) {
      setCurrentServicePhotos([]);
      return;
    }

    try {
      console.log('Fetching photos for service ID:', serviceId);
      const res = await fetch(`/api/photos?serviceId=${serviceId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      const photos = await res.json();
      console.log('Photos found for service:', photos.length);
      setCurrentServicePhotos(photos);
    } catch (error: any) {
      console.error('Error fetching service photos:', error);
      toast({
        title: "Erro ao carregar fotos do serviço",
        description: error.message,
        variant: "destructive",
      });
      setCurrentServicePhotos([]);
    }
  };

  const fetchServiceExtras = async (serviceId: number) => {
    try {
      const response = await fetch(`/api/services/${serviceId}/extras`, {
        credentials: "include",
      });
      if (response.ok) {
        const existingExtras = await response.json();
        console.log('Loaded existing service extras:', existingExtras);

        // Convert existing extras to the format expected by serviceExtras state
        const mappedExtras = existingExtras.map((item: any) => ({
          serviceExtraId: item.serviceExtraId,
          valor: item.valor || "0.00",
          observacao: item.observacao || "",
          serviceExtra: item.serviceExtra,
        }));

        setServiceExtras(mappedExtras);
      }
    } catch (error) {
      console.error("Error fetching service extras:", error);
    }
  };

  const handlePhotoTaken = async (photoUrl?: string, category?: string) => {
    // For new services (no ID yet), store as temporary photo
    if (!editingService?.id) {
      if (photoUrl && category) {
        setTemporaryPhotos(prev => [...prev, { photo: photoUrl, category }]);
        toast({
          title: "Foto capturada!",
          description: "A foto será salva quando o serviço for cadastrado.",
        });
      }
      setIsCameraOpen(false);
      return;
    }

    // For existing services, fetch updated photos
    fetchServicePhotos(editingService.id);
    queryClient.invalidateQueries({ queryKey: ['/api/photos'] });
    toast({
      title: "Foto capturada",
      description: "Foto foi adicionada com sucesso.",
    });
    setIsCameraOpen(false);
  };

  // Define isLoading based on the main queries
  const isLoading = false; // Since we're using individual queries with default values, we don't need loading state

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/services", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsDialogOpen(false);
      form.reset();
      setTemporaryPhotos([]);
    },
    onError: (error: any) => {
      console.error("Error creating service:", error);
      toast({ title: "Erro ao criar serviço", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PUT", `/api/services/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsDialogOpen(false);
      setEditingService(null);
      form.reset();
      toast({ title: "Serviço atualizado com sucesso!" });
    },
    onError: (error: any) => {
      console.error("Error updating service:", error);
      toast({ title: "Erro ao atualizar serviço", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/services/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({ title: "Serviço excluído com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir serviço", variant: "destructive" });
    },
  });

  // Get service type price
  const getServiceTypePrice = () => {
    const selectedServiceTypeId = form.watch("serviceTypeId");
    if (selectedServiceTypeId && serviceTypes) {
      const selectedServiceType = serviceTypes.find(st => st.id === selectedServiceTypeId);
      return Number(selectedServiceType?.defaultPrice || 0).toFixed(2);
    }
    return "0.00";
  };

  // Calculate extras total
  const calculateExtrasTotal = () => {
    let extrasTotal = 0;
    serviceExtras.forEach(extra => {
      if (extra.valor && !isNaN(Number(extra.valor))) {
        extrasTotal += Number(extra.valor);
      }
    });
    return extrasTotal.toFixed(2);
  };

  // Calculate total value
  const calculateTotalValue = () => {
    let total = 0;

    // Add service type value
    const selectedServiceTypeId = form.watch("serviceTypeId");
    if (selectedServiceTypeId && serviceTypes) {
      const selectedServiceType = serviceTypes.find(st => st.id === selectedServiceTypeId);
      if (selectedServiceType?.defaultPrice) {
        total += Number(selectedServiceType.defaultPrice);
      }
    }

    // Add service extras values
    serviceExtras.forEach(extra => {
      if (extra.valor && !isNaN(Number(extra.valor))) {
        total += Number(extra.valor);
      }
    });

    return total.toFixed(2);
  };

  const onSubmit = async (data: z.infer<typeof serviceFormSchema>) => {
    // Calculate and add total value
    const totalValue = calculateTotalValue();

    // Calculate total from payment methods
    const totalFromPaymentMethods = (
      Number(paymentMethods.pix || 0) +
      Number(paymentMethods.dinheiro || 0) +
      Number(paymentMethods.cheque || 0) +
      Number(paymentMethods.cartao || 0)
    ).toFixed(2);

    const serviceData = {
      ...data,
      estimatedValue: String(totalValue), // Converte para string como esperado pelo schema
      valorPago: totalFromPaymentMethods, // Usar total calculado das formas de pagamento
      pixPago: paymentMethods.pix || "0.00",
      dinheiroPago: paymentMethods.dinheiro || "0.00",
      chequePago: paymentMethods.cheque || "0.00",
      cartaoPago: paymentMethods.cartao || "0.00",
      serviceExtras: serviceExtras, // Inclui os adicionais selecionados
    };

    console.log('Service data being submitted:', serviceData);
    console.log('Service extras:', serviceExtras);

    if (editingService) {
      updateMutation.mutate({ id: editingService.id, data: serviceData });
    } else {
      // For new services, we need to handle temporary photos after creation
      try {
        const result = await createMutation.mutateAsync(serviceData);

        // Save temporary photos to the created service
        if (result && result.id && temporaryPhotos.length > 0) {
          console.log('Saving temporary photos to service:', result.id);

          let photosSaved = 0;
          for (const tempPhoto of temporaryPhotos) {
            try {
              // Convert base64 to blob for upload
              const base64Data = tempPhoto.photo.split(',')[1];
              const byteCharacters = atob(base64Data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: 'image/jpeg' });

              const formData = new FormData();
              formData.append('photo', blob, `service_${result.id}_photo_${Date.now()}.jpg`);
              formData.append('category', tempPhoto.category);
              formData.append('serviceId', result.id.toString());

              const photoResponse = await fetch('/api/photos/upload', {
                method: 'POST',
                body: formData,
                credentials: 'include',
              });

              if (!photoResponse.ok) {
                const errorText = await photoResponse.text();
                console.error('Photo upload failed:', errorText);
                throw new Error(`Failed to upload photo: ${photoResponse.status}`);
              }

              const photoResult = await photoResponse.json();
              console.log('Photo saved successfully:', photoResult);
              photosSaved++;
            } catch (error) {
              console.error('Error saving temporary photo:', error);
            }
          }

          // Clear temporary photos
          setTemporaryPhotos([]);
          console.log(`${photosSaved} of ${temporaryPhotos.length} temporary photos processed`);

          // Show success message with photo count
          if (photosSaved > 0) {
            toast({
              title: "Serviço criado com sucesso!",
              description: `${photosSaved} foto(s) salva(s) junto com o serviço.`,
            });
          }
        } else {
          toast({
            title: "Serviço criado com sucesso!",
          });
        }
      } catch (error) {
        console.error('Error creating service:', error);
        toast({
          title: "Erro ao criar serviço",
          description: "Ocorreu um erro ao criar o serviço.",
          variant: "destructive",
        });
      }
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    const editValues = {
      customerId: service.customerId,
      vehicleId: service.vehicleId,
      serviceTypeId: service.serviceTypeId,
      technicianId: service.technicianId || 0,
      scheduledDate: service.scheduledDate || "",
      scheduledTime: service.scheduledTime || "",
      status: service.status || "scheduled",
      notes: service.notes || "",
      valorPago: service.valorPago || "0",
      pixPago: service.pixPago || "0.00",
      dinheiroPago: service.dinheiroPago || "0.00",
      chequePago: service.chequePago || "0.00",
      cartaoPago: service.cartaoPago || "0.00",
    };
    
    setFormInitialValues(editValues);
    form.reset(editValues);
    fetchServicePhotos(service.id);
    // Load existing service extras
    fetchServiceExtras(service.id);

    // Load existing payment methods from specific fields
    console.log('Loading service payment data:', {
      pixPago: service.pixPago,
      dinheiroPago: service.dinheiroPago, 
      chequePago: service.chequePago,
      cartaoPago: service.cartaoPago
    });

    setPaymentMethods({
      pix: service.pixPago || "0.00",
      dinheiro: service.dinheiroPago || "0.00",
      cheque: service.chequePago || "0.00",
      cartao: service.cartaoPago || "0.00"
    });

    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este serviço?")) {
      deleteMutation.mutate(id);
    }
  };

  const getPaymentCategory = (valorPago: string, totalValue: string) => {
    const pago = Number(valorPago);
    const total = Number(totalValue);

    if (pago === 0) return "pendentes";
    if (pago < total) return "parcial";
    return "pagos";
  };

  const filteredServices = services.filter((service) => {
    const searchLower = searchTerm.toLowerCase();

    // Payment filtering
    const totalValue = service.estimatedValue || "0";
    const paymentCategory = getPaymentCategory(service.valorPago || "0", totalValue);
    const matchesPayment = filterPayment === "all" || paymentCategory === filterPayment;

    // If we have a customerId filter from URL, only show that customer's services
    if (customerIdFilter) {
      const customerId = parseInt(customerIdFilter);
      const matchesCustomer = service.customerId === customerId;
      const matchesStatus = filterStatus === "all" || service.status === filterStatus;
      return matchesCustomer && matchesStatus && matchesPayment;
    }

    // If we have a customer name filter from URL and searchTerm matches it, only show that customer's services
    if (customerFilter && searchTerm === customerFilter) {
      const matchesCustomer = (service.customer?.name || "").toLowerCase() === searchLower;
      const matchesStatus = filterStatus === "all" || service.status === filterStatus;
      return matchesCustomer && matchesStatus && matchesPayment;
    }

    // Vehicle Filtering by ID (priority filter)
    if (vehicleIdFilter) {
      const vehicleId = parseInt(vehicleIdFilter);
      const matchesVehicle = service.vehicleId === vehicleId;
      const matchesStatus = filterStatus === "all" || service.status === filterStatus;
      return matchesVehicle && matchesStatus && matchesPayment;
    }

    // Otherwise, use the regular search logic
    const matchesSearch = (
      (service.customer?.name || "").toLowerCase().includes(searchLower) ||
      (service.vehicle?.licensePlate || "").toLowerCase().includes(searchLower) ||
      (service.serviceType?.name || "").toLowerCase().includes(searchLower) ||
      (service.notes || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesStatus = filterStatus === "all" || service.status === filterStatus;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  // Check if we're filtering by a specific vehicle and have no results
  const isFilteringByVehicle = !!vehicleIdFilter;
  const hasNoServicesForVehicle = isFilteringByVehicle && filteredServices.length === 0;

  // Pre-fill search with customer name or vehicle plate if provided
  useEffect(() => {
    if (customerFilter) {
      setSearchTerm(customerFilter);
    } else if (vehiclePlateFilter) {
      setSearchTerm(decodeURIComponent(vehiclePlateFilter));
    }
  }, [customerFilter, vehiclePlateFilter]);

  const getStatusBadge = (status: string) => {
    const colors = {
      scheduled: "bg-blue-100 text-blue-800",
      in_progress: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getPaymentStatus = (valorPago: string, totalValue: string) => {
    const pago = Number(valorPago);
    const total = Number(totalValue);

    if (pago === 0) {
      return { 
        label: "PENDENTE", 
        color: "text-red-700", 
        bgColor: "bg-red-100", 
        borderColor: "border-red-300",
        dotColor: "bg-red-500"
      };
    } else if (pago < total) {
      return { 
        label: "PARCIAL", 
        color: "text-yellow-700", 
        bgColor: "bg-yellow-100", 
        borderColor: "border-yellow-300",
        dotColor: "bg-yellow-500"
      };
    } else {
      return { 
        label: "PAGO", 
        color: "text-green-700", 
        bgColor: "bg-green-100", 
        borderColor: "border-green-300",
        dotColor: "bg-green-500"
      };
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header 
          title="Serviços"
          subtitle="Gerencie os serviços da sua oficina"
        />

        <main className="flex-1 p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-700 via-emerald-600 to-cyan-600 bg-clip-text text-transparent tracking-tight">
                Gestão de Serviços
              </h1>
              <p className="text-teal-700 mt-2 font-medium">Controle completo de ordens de serviço</p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              if (!open && (hasUnsavedChanges || temporaryPhotos.length > 0 || serviceExtras.length > 0)) {
                unsavedChanges.triggerConfirmation(() => {
                  setIsDialogOpen(false);
                  setFormInitialValues(null);
                  setCurrentServicePhotos([]);
                  setServiceExtras([]);
                  setEditingService(null);
                  form.reset();
                  setTemporaryPhotos([]);
                  setPaymentMethods({
                    pix: "",
                    dinheiro: "",
                    cheque: "",
                    cartao: ""
                  });
                });
              } else {
                setIsDialogOpen(open);
                if (!open) {
                  setFormInitialValues(null);
                  setCurrentServicePhotos([]);
                  setServiceExtras([]);
                  setEditingService(null);
                  form.reset();
                  setTemporaryPhotos([]);
                  setPaymentMethods({
                    pix: "",
                    dinheiro: "",
                    cheque: "",
                    cartao: ""
                  });
                }
              }
            }}>
              <DialogTrigger asChild>
                <Button 
                    className={cn(
                      "bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 font-semibold rounded-lg",
                      isMobile ? "px-4 py-2 text-sm transform-none" : "transform hover:scale-105 px-6 py-3"
                    )}
                    onClick={async () => {
                      setEditingService(null);
                      setCurrentServicePhotos([]);
                      setServiceExtras([]);
                      setTemporaryPhotos([]);

                      const defaultValues = {
                        customerId: 0,
                        vehicleId: 0,
                        serviceTypeId: 0,
                        technicianId: 0,
                        scheduledDate: "",
                        scheduledTime: "",
                        status: "scheduled",
                        notes: "",
                        valorPago: "0",
                        pixPago: "0.00",
                        dinheiroPago: "0.00",
                        chequePago: "0.00",
                        cartaoPago: "0.00",
                      };
                      
                      setFormInitialValues(defaultValues);
                      form.reset(defaultValues);

                      // Reset payment methods when creating new service
                      setPaymentMethods({
                        pix: "",
                        dinheiro: "",
                        cheque: "",
                        cartao: ""
                      });

                      // Check URL params to pre-select customer if coming from customer page
                      const urlParams = new URLSearchParams(window.location.search);

                      const customerIdFromUrl = urlParams.get('customerId');

                      if (customerIdFromUrl) {
                        const customerId = parseInt(customerIdFromUrl);
                        console.log('Services: Pre-selecting customer from URL:', customerId);
                        form.setValue('customerId', customerId);
                        // Reset vehicle when customer is pre-selected
                        form.setValue('vehicleId', 0);
                      }
                    }}
                  >
                    <Plus className={cn(isMobile ? "h-4 w-4 mr-1" : "h-5 w-5 mr-2")} />
                    {isMobile ? "Novo" : "Novo Serviço"}
                  </Button>
              </DialogTrigger>

              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50/30">
                <DialogHeader className="pb-6">
                  <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-transparent">
                    {editingService ? "Editar Serviço" : "Novo Serviço"}
                  </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="customerId"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                              <User className="h-4 w-4 mr-2 text-teal-600" />
                              Cliente
                            </FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(Number(value));
                                form.setValue("vehicleId", 0); // Reset vehicle when customer changes
                              }} 
                              value={field.value > 0 ? field.value.toString() : ""}
                            >
                              <FormControl>
                                <SelectTrigger className="h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md">
                                  <SelectValue placeholder="Selecione um cliente" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {customers.map((customer: Customer) => (
                                  <SelectItem key={customer.id} value={customer.id.toString()}>
                                    {customer.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="vehicleId"
                        render={({ field }) => {
                          const selectedCustomerId = form.watch("customerId");
                          const availableVehicles = vehicles.filter(vehicle => 
                            selectedCustomerId ? (vehicle.customerId === selectedCustomerId || vehicle.customer?.id === selectedCustomerId) : true
                          );

                          return (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                                <Car className="h-4 w-4 mr-2 text-teal-600" />
                                Veículo
                              </FormLabel>
                              <Select 
                                onValueChange={(value) => field.onChange(Number(value))} 
                                value={field.value > 0 ? field.value.toString() : ""}
                                disabled={!selectedCustomerId}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md disabled:opacity-50">
                                    <SelectValue placeholder={selectedCustomerId ? "Selecione um veículo" : "Primeiro selecione um cliente"} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {availableVehicles.map((vehicle) => (
                                    <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                                      {vehicle.licensePlate} - {vehicle.brand} {vehicle.model}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="serviceTypeId"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                              <Wrench className="h-4 w-4 mr-2 text-teal-600" />
                              Tipo de Serviço
                            </FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(Number(value))} 
                              value={field.value > 0 ? field.value.toString() : ""}
                            >
                              <FormControl>
                                <SelectTrigger className="h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md">
                                  <SelectValue placeholder="Selecione um tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {serviceTypes.map((type: ServiceType) => (
                                  <SelectItem key={type.id} value={type.id.toString()}>
                                    {type.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="technicianId"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                              <User className="h-4 w-4 mr-2 text-teal-600" />
                              Técnico Responsável
                            </FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(Number(value))} 
                              value={field.value > 0 ? field.value.toString() : ""}
                            >
                              <FormControl>
                                <SelectTrigger className="h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md">
                                  <SelectValue placeholder="Selecione o técnico" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {users.map((technician: any) => (
                                  <SelectItem key={technician.id} value={technician.id.toString()}>
                                    {technician.firstName} {technician.lastName} ({technician.username})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-sm font-semibold text-slate-700">Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger className="h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md">
                                <SelectValue placeholder="Selecione o status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="scheduled">Agendado</SelectItem>
                              <SelectItem value="in_progress">Em Andamento</SelectItem>
                              <SelectItem value="completed">Concluído</SelectItem>
                              <SelectItem value="cancelled">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-3")}>
                      <FormField
                        control={form.control}
                        name="scheduledDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="date" 
                                value={field.value || ""} 
                                className={cn(
                                  "h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg bg-white transition-all duration-200",
                                  isMobile && "text-base" // Prevent zoom on iOS
                                )}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="scheduledTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hora</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="time" 
                                value={field.value || ""} 
                                className={cn(
                                  "h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg bg-white transition-all duration-200",
                                  isMobile && "text-base" // Prevent zoom on iOS
                                )}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações</FormLabel>
                          <FormControl>
                            <Textarea {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Service Extras Section */}
                    <div className="col-span-2 border-t pt-4">
                      <ServiceExtras
                        serviceId={editingService?.id}
                        onChange={setServiceExtras}
                      />
                    </div>

                    {/* Service Budget Section */}
                    <div className="col-span-2 border-t pt-6">
                      <div className="space-y-4">
                        {/* Budget Summary */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                          <h3 className="text-lg font-semibold text-slate-700 mb-3 flex items-center">
                            <Calculator className="h-5 w-5 mr-2 text-slate-600" />
                            Valores do Serviço
                          </h3>
                          <div className="space-y-3">
                            {/* Services Summary */}
                            <div className="bg-white border border-slate-200 rounded-lg p-3">
                              <div className="text-sm fontbold text-slate-800 mb-3">Serviços:</div>
                              <div className="space-y-2">
                                {/* Serviço Base */}
                                <div className="text-sm text-slate-700">
                                  {(() => {
                                    const selectedServiceTypeId = form.watch("serviceTypeId");
                                    const selectedServiceType = serviceTypes.find(st => st.id === selectedServiceTypeId);
                                    return selectedServiceType?.description || "Nenhum serviço selecionado";
                                  })()}
                                </div>

                                {/* Adicionais - listados separadamente */}
                                {serviceExtras.length > 0 && serviceExtras.map((extra, index) => (
                                  <div key={index} className="text-sm text-slate-700">
                                    {extra.serviceExtra?.descricao}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="border-t border-slate-300 pt-2 mt-2">
                              <div className="flex justify-between items-center">
                                <span className="text-lg font-bold text-slate-800">Total do Serviço:</span>
                                <span className="text-xl font-bold text-slate-700">
                                  R$ {calculateTotalValue()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Payment Control Section */}
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                          <h3 className="text-lg font-semibold text-emerald-800 mb-3 flex items-center">
                            <DollarSign className="h-5 w-5 mr-2 text-emerald-600" />
                            Pagamentos
                          </h3>

                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="text-center">
                              <div className="text-xs text-slate-600 mb-1">Valor Total</div>
                              <div className="text-lg font-bold text-slate-700">R$ {calculateTotalValue()}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-slate-600 mb-1">Valor Pago</div>
                              <div className="text-lg font-bold text-emerald-600">
                                R$ {Number(form.watch("valorPago") || 0).toFixed(2)}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-slate-600 mb-1">Saldo</div>
                              <div className={`text-lg font-bold ${
                                (Number(calculateTotalValue()) - Number(form.watch("valorPago") || 0)) <= 0 
                                  ? 'text-green-600' 
                                  : 'text-red-600'
                              }`}>
                                R$ {(Number(calculateTotalValue()) - Number(form.watch("valorPago") || 0)).toFixed(2)}
                              </div>
                            </div>
                          </div>

                          {/* Payment Status */}
                          <div className="flex items-center justify-center mb-4">
                            <div className={`px-4 py-2 rounded-full flex items-center space-x-2 ${
                              Number(form.watch("valorPago") || 0) === 0 
                                ? 'bg-red-100 border-2 border-red-300' 
                                : Number(form.watch("valorPago") || 0) >= Number(calculateTotalValue())
                                  ? 'bg-green-100 border-2 border-green-300'
                                  : 'bg-yellow-100 border-2 border-yellow-300'
                            }`}>
                              <div className={`w-3 h-3 rounded-full ${
                                Number(form.watch("valorPago") || 0) === 0 
                                  ? 'bg-red-500' 
                                  : Number(form.watch("valorPago") || 0) >= Number(calculateTotalValue())
                                    ? 'bg-green-500'
                                    : 'bg-yellow-500'
                              }`}></div>
                              <span className={`text-sm font-bold ${
                                Number(form.watch("valorPago") || 0) === 0 
                                  ? 'text-red-700' 
                                  : Number(form.watch("valorPago") || 0) >= Number(calculateTotalValue())
                                    ? 'text-green-700'
                                    : 'text-yellow-700'
                              }`}>
                                {Number(form.watch("valorPago") || 0) === 0 
                                  ? 'PENDENTE' 
                                  : Number(form.watch("valorPago") || 0) >= Number(calculateTotalValue())
                                    ? 'PAGO'
                                    : 'PARCIAL'
                                }
                              </span>
                            </div>
                          </div>
                          <PaymentManager
                            totalValue={Number(calculateTotalValue())}
                            currentPaidValue={Number(form.watch("valorPago") || 0)}
                            pixPago={Number(form.watch("pixPago") || 0)}
                            dinheiroPago={Number(form.watch("dinheiroPago") || 0)}
                            chequePago={Number(form.watch("chequePago") || 0)}
                            cartaoPago={Number(form.watch("cartaoPago") || 0)}
                            onPaymentChange={(pixPago, dinheiroPago, chequePago, cartaoPago) => {
                              form.setValue("pixPago", pixPago.toFixed(2));
                              form.setValue("dinheiroPago", dinheiroPago.toFixed(2));
                              form.setValue("chequePago", chequePago.toFixed(2));
                              form.setValue("cartaoPago", cartaoPago.toFixed(2));

                              const totalPago = pixPago + dinheiroPago + chequePago + cartaoPago;
                              form.setValue("valorPago", totalPago.toFixed(2));
                            }}
                          />
                          {/* Payment Input */}
                          <FormField
                            control={form.control}
                            name="valorPago"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-emerald-700">
                                  Registrar Pagamento
                                </FormLabel>
                                <FormControl>
                                  <div className="flex space-x-2">
                                    <div className="relative flex-1">
                                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-600" />
                                      <Input
                                        {...field}
                                        type="text"
                                        placeholder="0.00"
                                        className="pl-10 h-11 border-2 border-emerald-200 focus:border-emerald-400 rounded-lg bg-white"
                                        value={formatCurrency(field.value || "0.00")}
                                        onChange={(e) => {
                                          const formattedValue = formatCurrency(e.target.value);
                                          field.onChange(parseCurrency(formattedValue));
                                        }}
                                      />
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setIsPaymentModalOpen(true)}
                                      className="h-11 px-4 border-2 border-emerald-200 hover:border-emerald-400 text-emerald-700 hover:text-emerald-800 transition-all duration-200"
                                    >
                                      <Coins className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsResumeModalOpen(true)}
                            className="bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:border-slate-400 font-medium px-4 py-2 text-sm transition-all duration-200"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Ver Resumo Completo
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Photos Section */}
                    <div className="col-span-2 border-t pt-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-700">Fotos</h4>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setIsCameraOpen(true)}
                              className="flex items-center gap-2"
                            >
                              <Camera className="h-4 w-4" />
                              Tirar Foto
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById('service-photo-upload')?.click()}
                              className="flex items-center gap-2"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Adicionar Fotos
                            </Button>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              className="hidden"
                              id="service-photo-upload"
                              onChange={async (event) => {
                                const files = event.target.files;
                                if (!files || files.length === 0) return;

                                // For new services without ID, add to temporary photos
                                if (!editingService?.id) {
                                  Array.from(files).forEach((file) => {
                                    const reader = new FileReader();
                                    reader.onload = (e) => {
                                      const photo = e.target?.result as string;
                                      setTemporaryPhotos(prev => [...prev, { photo, category: 'service' }]);
                                    };
                                    reader.readAsDataURL(file);
                                  });

                                  toast({
                                    title: "Fotos adicionadas!",
                                    description: "As fotos serão salvas quando o serviço for cadastrado.",
                                  });
                                  return;
                                }

                                // For existing services, upload directly
                                try {
                                  for (const file of Array.from(files)) {
                                    if (!file.type.startsWith('image/')) {
                                      toast({
                                        title: "Arquivo inválido",
                                        description: "Apenas imagens são permitidas.",
                                        variant: "destructive",
                                      });
                                      continue;
                                    }

                                    const formData = new FormData();
                                    formData.append('photo', file);
                                    formData.append('category', 'service');
                                    formData.append('serviceId', editingService.id.toString());

                                    const res = await fetch('/api/photos/upload', {
                                      method: 'POST',
                                      body: formData,
                                      credentials: 'include',
                                    });

                                    if (!res.ok) {
                                      throw new Error(`${res.status}: ${res.statusText}`);
                                    }
                                  }

                                  toast({
                                    title: "Fotos enviadas",
                                    description: "As fotos foram enviadas com sucesso.",
                                  });

                                  fetchServicePhotos(editingService.id);
                                } catch (error: any) {
                                  toast({
                                    title: "Erro",
                                    description: error.message,
                                    variant: "destructive",
                                  });
                                }

                                // Reset file input
                                event.target.value = '';
                              }}
                            />
                          </div>
                        </div>
                        <PhotoUpload
                          photos={editingService?.id ? currentServicePhotos : []}
                          onPhotoUploaded={async () => {
                            if (editingService?.id) {
                              fetchServicePhotos(editingService.id);
                            }
                          }}
                          serviceId={editingService?.id}
                          maxPhotos={7}
                          hideUploadButton={true}
                        />

                        {/* Show temporary photos for new services */}
                        {!editingService?.id && temporaryPhotos.length > 0 && (
                          <div className="mt-4">
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Fotos adicionadas:</h5>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {temporaryPhotos.map((tempPhoto, index) => (
                                <div key={index} className="relative group">
                                  <img 
                                    src={tempPhoto.photo} 
                                    alt={`Foto ${index + 1}`}
                                    className="w-full h-20 object-cover rounded-lg border"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setTemporaryPhotos(prev => prev.filter((_, i) => i !== index))}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          if (hasUnsavedChanges || temporaryPhotos.length > 0 || serviceExtras.length > 0) {
                            unsavedChanges.triggerConfirmation(() => {
                              setIsDialogOpen(false);
                              setFormInitialValues(null);
                              setCurrentServicePhotos([]);
                              setServiceExtras([]);
                              setEditingService(null);
                              form.reset();
                              setTemporaryPhotos([]);
                              setPaymentMethods({
                                pix: "",
                                dinheiro: "",
                                cheque: "",
                                cartao: ""
                              });
                            });
                          } else {
                            setIsDialogOpen(false);
                            setFormInitialValues(null);
                            setCurrentServicePhotos([]);
                            setServiceExtras([]);
                            setEditingService(null);
                            form.reset();
                            setTemporaryPhotos([]);
                            setPaymentMethods({
                              pix: "",
                              dinheiro: "",
                              cheque: "",
                              cartao: ""
                            });
                          }
                        }}
                        className="px-6 py-2 font-medium"
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-2 font-semibold"
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        {editingService ? "Atualizar Serviço" : "Criar Serviço"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Analytics Modal */}
            <Dialog open={isAnalyticsModalOpen} onOpenChange={setIsAnalyticsModalOpen}>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Relatório de Serviços
                  </DialogTitle>
                </DialogHeader>
                <ServiceAnalytics />
              </DialogContent>
            </Dialog>

            {/* Camera Capture Modal */}
            <CameraCapture
              isOpen={isCameraOpen}
              onClose={() => setIsCameraOpen(false)}
              onPhotoTaken={handlePhotoTaken}
              serviceId={editingService?.id}
            />

            {/* Service Resume Modal */}
            <Dialog open={isResumeModalOpen} onOpenChange={setIsResumeModalOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center text-emerald-800">
                    <FileText className="h-5 w-5 mr-2" />
                    Resumo Completo do Serviço
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Client and Vehicle Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <User className="h-5 w-5 text-blue-600 mr-2" />
                        <span className="font-medium text-blue-800">Cliente</span>
                      </div>
                      <div className="text-sm text-blue-700">
                        {(() => {
                          const selectedCustomerId = form.watch("customerId");
                          const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
                          return selectedCustomer?.name || "Nenhum cliente selecionado";
                        })()}
                      </div>
                    </div>

                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <Car className="h-5 w-5 text-indigo-600 mr-2" />
                        <span className="font-medium text-indigo-800">Veículo</span>
                      </div>
                      <div className="text-sm text-indigo-700">
                        {(() => {
                          const selectedVehicleId = form.watch("vehicleId");
                          const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
                          return selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model} - ${selectedVehicle.licensePlate}` : "Nenhum veículo selecionado";
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Service Details */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <Calendar className="h-5 w-5 text-slate-600 mr-2" />
                      <span className="font-medium text-slate-800">Agendamento</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600">Data:</span>
                        <span className="ml-2 font-medium">{form.watch("scheduledDate") || "Não definida"}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Hora:</span>
                        <span className="ml-2 font-medium">{form.watch("scheduledTime") || "Não definida"}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Status:</span>
                        <span className="ml-2 font-medium capitalize">{form.watch("status") || "agendado"}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Técnico:</span>
                        <span className="ml-2 font-medium">
                          {(() => {
                            const selectedTechnicianId = form.watch("technicianId");
                            const selectedTechnician = users.find(u => u.id === selectedTechnicianId);
                            return selectedTechnician ? `${selectedTechnician.firstName} ${selectedTechnician.lastName}` : "Não atribuído";
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Service Type */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <Wrench className="h-5 w-5 text-emerald-600 mr-2" />
                      <span className="font-medium text-emerald-800">Tipo de Serviço</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-emerald-700">
                            {(() => {
                              const selectedServiceTypeId = form.watch("serviceTypeId");
                              const selectedServiceType = serviceTypes.find(st => st.id === selectedServiceTypeId);
                              return selectedServiceType?.name || "Nenhum tipo selecionado";
                            })()}
                          </div>
                          <div className="text-sm text-emerald-600">
                            {(() => {
                              const selectedServiceTypeId = form.watch("serviceTypeId");
                              const selectedServiceType = serviceTypes.find(st => st.id === selectedServiceTypeId);
                              return selectedServiceType?.description || "";
                            })()}
                          </div>
                        </div>
                        <span className="font-bold text-emerald-800">R$ {getServiceTypePrice()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Service Extras */}
                  {serviceExtras.length > 0 && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <Plus className="h-5 w-5 text-purple-600 mr-2" />
                        <span className="font-medium text-purple-800">Adicionais Inclusos</span>
                      </div>
                      <div className="space-y-2">
                        {serviceExtras.map((extra, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="text-purple-700">{extra.serviceExtra?.descricao || `Adicional ${index + 1}`}</span>
                            <span className="font-medium text-purple-800">R$ {Number(extra.valor || 0).toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="border-t border-purple-300 pt-2 mt-2">
                          <div className="flex justify-between font-medium">
                            <span className="text-purple-700">Subtotal Extras:</span>
                            <span className="text-purple-800">R$ {calculateExtrasTotal()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Financial Summary */}
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <DollarSign className="h-5 w-5 text-emerald-600 mr-2" />
                      <span className="font-medium text-emerald-800">Resumo Financeiro</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-700">Valor do Serviço:</span>
                        <span className="font-medium">R$ {getServiceTypePrice()}</span>
                      </div>
                      {serviceExtras.length > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-emerald-700">Adicionais:</span>
                          <span className="font-medium">R$ {calculateExtrasTotal()}</span>
                        </div>
                      )}
                      <div className="border-t border-emerald-300 pt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-emerald-800">Total do Serviço:</span>
                          <span className="text-xl font-bold text-emerald-700">R$ {calculateTotalValue()}</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-700">Valor Pago:</span>
                        <span className="font-medium">R$ {Number(form.watch("valorPago") || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-700">Saldo:</span>
                        <span className={`font-medium ${
                          (Number(calculateTotalValue()) - Number(form.watch("valorPago") || 0)) <= 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          R$ {(Number(calculateTotalValue()) - Number(form.watch("valorPago") || 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {form.watch("notes") && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <FileText className="h-5 w-5 text-yellow-600 mr-2" />
                        <span className="font-medium text-yellow-800">Observações</span>
                      </div>
                      <div className="text-sm text-yellow-700">{form.watch("notes")}</div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Payment Methods Modal */}
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center text-emerald-800">
                    <Coins className="h-5 w-5 mr-2" />
                    Formas de Pagamento
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* PIX */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">PIX</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-600" />
                        <Input
                          type="text"
                          placeholder="0.00"
                          value={formatCurrency(paymentMethods.pix)}
                          onChange={(e) => {
                            const formattedValue = formatCurrency(e.target.value);
                            setPaymentMethods(prev => ({ ...prev, pix: parseCurrency(formattedValue) }));
                          }}
                          className="pl-10 h-11 border-2 border-emerald-200 focus:border-emerald-400 rounded-lg bg-white"
                        />
                      </div>
                    </div>

                    {/* Dinheiro */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Dinheiro</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-600" />
                        <Input
                          type="text"
                          placeholder="0.00"
                          value={formatCurrency(paymentMethods.dinheiro)}
                          onChange={(e) => {
                            const formattedValue = formatCurrency(e.target.value);
                            setPaymentMethods(prev => ({ ...prev, dinheiro: parseCurrency(formattedValue) }));
                          }}
                          className="pl-10 h-11 border-2 border-emerald-200 focus:border-emerald-400 rounded-lg bg-white"
                        />
                      </div>
                    </div>

                    {/* Cheque */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Cheque</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-600" />
                        <Input
                          type="text"
                          placeholder="0.00"
                          value={formatCurrency(paymentMethods.cheque)}
                          onChange={(e) => {
                            const formattedValue = formatCurrency(e.target.value);
                            setPaymentMethods(prev => ({ ...prev, cheque: parseCurrency(formattedValue) }));
                          }}
                          className="pl-10 h-11 border-2 border-emerald-200 focus:border-emerald-400 rounded-lg bg-white"
                        />
                      </div>
                    </div>

                    {/* Cartão */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Cartão</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-600" />
                        <Input
                          type="text"
                          placeholder="0.00"
                          value={formatCurrency(paymentMethods.cartao)}
                          onChange={(e) => {
                            const formattedValue = formatCurrency(e.target.value);
                            setPaymentMethods(prev => ({ ...prev, cartao: parseCurrency(formattedValue) }));
                          }}
                          className="pl-10 h-11 border-2 border-emerald-200 focus:border-emerald-400 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Total das formas de pagamento */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-emerald-700">Total:</span>
                      <span className="text-lg font-bold text-emerald-800">
                        R$ {(
                          Number(paymentMethods.pix || 0) +
                          Number(paymentMethods.dinheiro || 0) +
                          Number(paymentMethods.cheque || 0) +
                          Number(paymentMethods.cartao || 0)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsPaymentModalOpen(false)}
                      className="px-6 py-2 font-medium"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="button" 
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-2 font-semibold"
                      onClick={() => {
                        const totalPayment = (
                          Number(paymentMethods.pix || 0) +
                          Number(paymentMethods.dinheiro || 0) +
                          Number(paymentMethods.cheque || 0) +
                          Number(paymentMethods.cartao || 0)
                        ).toFixed(2);
                        form.setValue("valorPago", totalPayment);
                        setIsPaymentModalOpen(false);
                      }}
                    >
                      Aplicar Pagamento
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-500 h-4 w-4" />
              <Input
                placeholder="Buscar por cliente, veículo, tipo de serviço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 border-2 border-teal-200 focus:border-emerald-400 rounded-xl shadow-sm bg-white/90 backdrop-blur-sm"
              />
            </div>
            <div className="relative">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className={`w-48 h-12 border-2 ${filterStatus !== 'all' ? 'border-blue-400 bg-blue-50' : 'border-teal-200'} focus:border-emerald-400 rounded-xl shadow-sm bg-white/90 backdrop-blur-sm`}>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="scheduled">Agendado</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              {filterStatus !== 'all' && statusFilter !== 'all' && (
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">!</span>
                </div>
              )}
            </div>

            <Select value={filterPayment} onValueChange={setFilterPayment}>
              <SelectTrigger className="w-48 h-12 border-2 border-teal-200 focus:border-emerald-400 rounded-xl shadow-sm bg-white/90 backdrop-blur-sm">
                <SelectValue placeholder="Filtrar por pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os pagamentos</SelectItem>
                <SelectItem value="pagos">Pagos</SelectItem>
                <SelectItem value="pendentes">Pendentes</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setIsAnalyticsModalOpen(true)}
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                📊 Ver Relatórios
              </Button>
              <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-4 py-2 rounded-lg shadow-md">
                <span className="font-semibold">{filteredServices.length}</span>
                <span className="ml-1 text-sm">serviços</span>
              </div>
            </div>
          </div>

          {/* Services Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse bg-white/80 backdrop-blur-sm border border-teal-200">
                  <CardHeader>
                    <div className="h-5 bg-teal-200 rounded w-3/4"></div>
                    <div className="h-4 bg-teal-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="h-4 bg-teal-200 rounded"></div>
                      <div className="h-4 bg-teal-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredServices.length === 0 && vehicleIdFilter ? (
              // Specific case: vehicle has no services
              <div className="flex flex-col items-center justify-center py-12">
                <div className="bg-gradient-to-br from-blue-100 to-indigo-100 p-6 rounded-full mb-6 w-24 h-24 flex items-center justify-center">
                  <Wrench className="h-12 w-12 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Nenhum serviço encontrado para este veículo
                </h3>
                <p className="text-gray-600 mb-2 text-center">
                  O veículo <strong>{vehiclePlateFilter ? decodeURIComponent(vehiclePlateFilter) : 'selecionado'}</strong> ainda não possui serviços cadastrados.
                </p>
                <p className="text-gray-600 mb-6 text-center">
                  Deseja cadastrar o primeiro serviço para este veículo?
                </p>
                <Button
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  onClick={() => {
                    setEditingService(null);
                    form.reset();
                    setTemporaryPhotos([]);
                    setCurrentServicePhotos([]);
                    setServiceExtras([]);
                    setPaymentMethods({
                      pix: "",
                      dinheiro: "",
                      cheque: "",
                      cartao: ""
                    });

                    // Pre-fill vehicle data
                    if (vehicleIdFilter) {
                      const vehicleId = parseInt(vehicleIdFilter);
                      const selectedVehicle = vehicles.find(v => v.id === vehicleId);
                      if (selectedVehicle) {
                        form.setValue('customerId', selectedVehicle.customerId);
                        form.setValue('vehicleId', vehicleId);
                      }
                    }

                    setIsDialogOpen(true);
                  }}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Cadastrar Primeiro Serviço
                </Button>
              </div>
            ) : filteredServices.length === 0 ? (
              // General case: no services found
              <div className="flex flex-col items-center justify-center py-12">
                <div className="bg-gradient-to-br from-teal-100 to-emerald-100 p-6 rounded-full mb-6 w-24 h-24 flex items-center justify-center">
                  <Wrench className="h-12 w-12 text-teal-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {searchTerm ? "Nenhum serviço encontrado" : "Nenhum serviço cadastrado"}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm 
                    ? 'Tente ajustar os termos de busca ou filtros.' 
                    : 'Comece adicionando seu primeiro serviço.'
                  }
                </p>
                {!searchTerm && (
                  <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    if (!open && (hasUnsavedChanges || temporaryPhotos.length > 0 || serviceExtras.length > 0)) {
                      unsavedChanges.triggerConfirmation(() => {
                        setIsDialogOpen(false);
                        setFormInitialValues(null);
                        setCurrentServicePhotos([]);
                        setServiceExtras([]);
                        setEditingService(null);
                        form.reset();
                        setTemporaryPhotos([]);
                        setPaymentMethods({
                          pix: "",
                          dinheiro: "",
                          cheque: "",
                          cartao: ""
                        });
                      });
                      return;
                    }
                    
                    if (!open) {
                      setIsDialogOpen(false);
                      setFormInitialValues(null);
                      setCurrentServicePhotos([]);
                      setServiceExtras([]);
                      setEditingService(null);
                      form.reset();
                      setTemporaryPhotos([]);
                      setPaymentMethods({
                        pix: "",
                        dinheiro: "",
                        cheque: "",
                        cartao: ""
                      });
                    } else {
                      setIsDialogOpen(true);
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                        onClick={() => {
                          setEditingService(null);
                          form.reset();
                          setTemporaryPhotos([]);
                          setCurrentServicePhotos([]);
                          setServiceExtras([]);
                          setPaymentMethods({
                            pix: "",
                            dinheiro: "",
                            cheque: "",
                            cartao: ""
                          });
                        }}
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        Adicionar Primeiro Serviço
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                )}
              </div>
            ) : (
              <div className={cn(
                "grid gap-4",
                isMobile 
                  ? "grid-cols-1" 
                  : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              )}>
                {filteredServices.map((service) => {
                 const totalValue = service.estimatedValue || "0";
                 const paymentStatus = getPaymentStatus(service.valorPago || "0", totalValue);

                return (
                <Card key={service.id} className="bg-white/90 backdrop-blur-sm border border-teal-200 hover:shadow-lg transition-all duration-300 hover:border-emerald-300">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-bold text-teal-800 mb-1">
                          {service.serviceType?.name || 'Tipo não especificado'}
                        </CardTitle>
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <User className="h-4 w-4 mr-1" />
                          {service.customer?.name || 'Cliente não encontrado'}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Car className="h-4 w-4 mr-1" />
                          {service.vehicle?.licensePlate || 'Placa não informada'} - {service.vehicle?.brand} {service.vehicle?.model}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="relative">
                          <Coins className={`h-5 w-5 ${paymentStatus.color} cursor-pointer`} title={paymentStatus.label} />
                        </div>
                        <Badge className={`${getStatusBadge(service.status || 'scheduled')} font-medium`}>
                          {service.status === 'scheduled' && 'Agendado'}
                          {service.status === 'in_progress' && 'Em Andamento'}
                          {service.status === 'completed' && 'Concluído'}
                          {service.status === 'cancelled' && 'Cancelado'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLocation(`/service-photos?serviceId=${service.id}`)}
                          className="h-8 w-8 p-0 hover:bg-teal-100 text-teal-600"
                          title="Ver fotos do serviço"
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(service)}
                          className="h-8 w-8 p-0 hover:bg-teal-100"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(service.id)}
                          className="h-8 w-8 p-0 hover:bg-red-100 text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {service.scheduledDate && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="font-medium">
                            {new Date(service.scheduledDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                            {service.scheduledTime && ` às ${service.scheduledTime.slice(0, 5)}`}
                          </span>
                        </div>
                      )}
                      {service.estimatedValue && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center font-semibold text-emerald-600">
                              <DollarSign className="h-4 w-4 mr-2" />
                              R$ {Number(service.estimatedValue).toFixed(2)}
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-gray-500">Pago:</span>
                              <span className="text-xs font-semibold text-emerald-600">
                                R$ {Number(service.valorPago || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                          {/* Payment Status Badge */}
                          <div className="flex justify-end">
                            <div className={`px-3 py-1 rounded-full flex items-center space-x-1 border-2 ${paymentStatus.bgColor} ${paymentStatus.borderColor}`}>
                              <div className={`w-2 h-2 rounded-full ${paymentStatus.dotColor}`}></div>
                              <span className={`text-xs font-bold ${paymentStatus.color}`}>
                                {paymentStatus.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      {service.notes && (
                        <div className="flex items-start text-sm text-gray-600 mt-2">
                          <FileText className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{service.notes}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
              })}
            </div>
          )}
        </main>

        {/* Dialog de confirmação de alterações não salvas */}
        <UnsavedChangesDialog
          isOpen={unsavedChanges.showConfirmDialog}
          onConfirm={unsavedChanges.confirmNavigation}
          onCancel={unsavedChanges.cancelNavigation}
          message={unsavedChanges.message}
        />
      </div>
    </div>
  );
}