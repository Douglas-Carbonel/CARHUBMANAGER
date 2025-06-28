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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, MoreHorizontal, Plus, Search, Edit, Trash2, Clock, User, Car, Wrench, CheckCircle, XCircle, Timer, BarChart3, FileText, Camera, Coins, Calculator, Smartphone, Banknote, CreditCard, Receipt, Bell } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceSchema, type Service, type Customer, type Vehicle, type ServiceType, type Photo } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import ServiceAnalytics from "@/components/dashboard/service-analytics";
import { useLocation } from "wouter";
import PhotoUpload from "@/components/photos/photo-upload";
import CameraCapture from "@/components/camera/camera-capture";
import ServiceItems from "@/components/service/service-items";
import PaymentManager from "@/components/service/payment-manager";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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

// Utility function to translate status from English to Portuguese
const translateStatus = (status: string): string => {
  const statusTranslations: Record<string, string> = {
    'scheduled': 'Agendado',
    'in_progress': 'Em Andamento',
    'completed': 'Concluído',
    'cancelled': 'Cancelado'
  };

  return statusTranslations[status] || status;
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
  serviceTypeId: z.number().optional(),
  technicianId: z.number().min(1, "Técnico é obrigatório"),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
  notes: z.string().optional(),
  valorPago: z.string().optional(),
  pixPago: z.string().optional(),
  dinheiroPago: z.string().optional(),
  chequePago: z.string().optional(),
  cartaoPago: z.string().optional(),
  reminderEnabled: z.boolean().optional(),
  reminderMinutes: z.number().optional(),
  serviceExtras: z.array(z.object({
    unifiedServiceId: z.number(),
    valor: z.string(),
    observacao: z.string().optional(),
  })).optional(),
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
  const [initialServiceExtras, setInitialServiceExtras] = useState<any[]>([]);
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
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof serviceFormSchema>>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      customerId: 0,
      vehicleId: 0,
      serviceTypeId: undefined,
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
  const hasFormChanges = formInitialValues && isDialogOpen && JSON.stringify(currentFormValues) !== JSON.stringify(formInitialValues);
  const hasServiceExtrasChanges = JSON.stringify(serviceExtras) !== JSON.stringify(initialServiceExtras);
  const hasUnsavedChanges = hasFormChanges || temporaryPhotos.length > 0 || hasServiceExtrasChanges;



  const unsavedChanges = useUnsavedChanges({
    hasUnsavedChanges: !!hasUnsavedChanges,
    message: "Você tem alterações não salvas no cadastro do serviço. Deseja realmente sair?"
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery<(Service & { customer: Customer; vehicle: Vehicle; serviceType: ServiceType })[]>({
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

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
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

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery<(Vehicle & { customer: Customer })[]>({
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

  const { data: users = [], isLoading: techniciansLoading } = useQuery<any[]>({
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
      console.log('Fetching service items for service:', serviceId);

      // Buscar service_items do serviço
      const response = await fetch(`/api/services/${serviceId}`, {
        credentials: "include",
      });

      if (response.ok) {
        const serviceData = await response.json();
        console.log('Loaded service data:', serviceData);
        // Map service items to ServiceItems format
        console.log('Service data received:', serviceData);
        console.log('Service items from API:', serviceData.serviceItems);

        if (serviceData.serviceItems && serviceData.serviceItems.length > 0) {
          const mappedExtras = serviceData.serviceItems.map((item: any, index: number) => ({
            tempId: `existing_${item.id || index}`,
            serviceTypeId: Number(item.serviceTypeId || item.service_type_id),
            unitPrice: String(item.unitPrice || item.unit_price || "0.00"),
            totalPrice: String(item.totalPrice || item.total_price || "0.00"),
            quantity: Number(item.quantity) || 1,
            notes: item.notes || "",
          }));

          console.log('Mapped service items to ServiceItems format:', mappedExtras);

          // Set service items immediately for editing
          setServiceExtras(mappedExtras);
          setInitialServiceExtras(mappedExtras);
        } else {
          console.log('No service items found for this service');
          // For services without items, set empty array immediately
          setServiceExtras([]);
          setInitialServiceExtras([]);
        }
      } else {
        console.error('Failed to fetch service data:', response.status);
        setServiceExtras([]);
        setInitialServiceExtras([]);
      }
    } catch (error) {
      console.error("Error fetching service items:", error);
      setServiceExtras([]);
      setInitialServiceExtras([]);
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
    mutationFn: async (id: number) => {
      console.log(`Frontend: Attempting to delete service ${id}`);
      const response = await apiRequest("DELETE", `/api/services/${id}`);
      console.log(`Frontend: Delete successful for service ${id}`);
      return response;
    },
    onSuccess: () => {
      console.log("Frontend: Delete mutation success callback");
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({ title: "Serviço excluído com sucesso!" });
    },
    onError: (error) => {
      console.error("Frontend: Delete mutation error:", error);
      toast({ title: "Erro ao excluir serviço", variant: "destructive" });
    },
  });

  // Get service type price
  const getServiceTypePrice = () => {
    const selectedServiceTypeId = form.watch("serviceTypeId");
    if (!selectedServiceTypeId) return "0.00";
    const selectedServiceType = serviceTypes.find(st => st.id === selectedServiceTypeId);
    return selectedServiceType?.defaultPrice ? Number(selectedServiceType.defaultPrice).toFixed(2) : "0.00";
  };

  // Calculate extras total
  const calculateExtrasTotal = () => {
    let total = 0;
    serviceExtras.forEach(extra => {
      if (extra.valor && !isNaN(Number(extra.valor))) {
        total += Number(extra.valor);
      }
    });
    return total.toFixed(2);
  };

  // Calculate total value from services
  const calculateTotalValue = () => {
    let total = 0;

    // Add all selected services values
    serviceExtras.forEach(extra => {
      if (extra.totalPrice && !isNaN(Number(extra.totalPrice))) {
        total += Number(extra.totalPrice);
      } else if (extra.valor && !isNaN(Number(extra.valor))) {
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

    // Convert serviceExtras to serviceItems format
    const serviceItemsData = serviceExtras.map((extra: any) => ({
      serviceTypeId: extra.serviceTypeId || extra.serviceExtra?.id,
      quantity: extra.quantity || 1,
      unitPrice: extra.unitPrice || extra.valor || "0.00",
      totalPrice: extra.totalPrice || extra.valor || "0.00",
      notes: extra.notes || extra.observacao || null,
    }));

    const serviceData = {
      ...data,
      estimatedValue: String(totalValue),
      valorPago: totalFromPaymentMethods,
      pixPago: paymentMethods.pix || "0.00",
      dinheiroPago: paymentMethods.dinheiro || "0.00",
      chequePago: paymentMethods.cheque || "0.00",
      cartaoPago: paymentMethods.cartao || "0.00",
      reminderEnabled: data.reminderEnabled || false,
      reminderMinutes: data.reminderMinutes || 30,
      serviceItems: serviceItemsData,
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
      serviceTypeId: service.serviceTypeId || undefined,
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

    // Load photos and service items - fetch service items first to ensure they load properly
    fetchServicePhotos(service.id);
    fetchServiceExtras(service.id);

    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: "Excluir Serviço",
      description: "Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.",
      onConfirm: () => {
        deleteMutation.mutate(id);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
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

  if (servicesLoading || customersLoading || vehiclesLoading || techniciansLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
        <LoadingSpinner size="lg" text="Carregando dados do sistema..." />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header 
          title="Serviços"
          subtitle="Gerencie os serviços da sua oficina"
        />

        <main className="flex-1 overflow-auto p-4 md:p-6 pt-20 md:pt-24">
          <div className="mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-2 rounded-lg mr-3">
                  <Wrench className="h-6 w-6 text-white" />
                </div>
                Ordens de Serviço
              </h1>
              <p className="text-gray-600 mt-1">Gerencie todas as ordens de serviço</p>
            </div>

            <Dialog open={isAddModalOpen} onOpenChange={(open) => {
              if (!open && (hasUnsavedChanges || temporaryPhotos.length > 0 || serviceExtras.length > 0)) {
                unsavedChanges.triggerConfirmation(() => {
                  setIsAddModalOpen(false);
                  setFormInitialValues(null);
                  setServiceExtras([]);
                  form.reset();
                  setTemporaryPhotos([]);
                  setPaymentMethods({
                    pix: "",
                    dinheiro: "",
                    cheque: "",
                    cartao: ""
                  });
                  setEditingService(null);
                });
              } else {
                setIsAddModalOpen(open);
                if (!open) {
                  setFormInitialValues(null);
                  setServiceExtras([]);
                  setInitialServiceExtras([]);
                  form.reset();
                  setTemporaryPhotos([]);
                  setPaymentMethods({
                    pix: "",
                    dinheiro: "",
                    cheque: "",
                    cartao: ""
                  });
                  setEditingService(null);
                }
              }
            }}>
              <DialogTrigger asChild>
                <Button
                  className="fixed bottom-6 right-6 h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 z-50 transform hover:scale-110"
                  size="sm"
                  onClick={() => {
                    setEditingService(null);
                    const defaultValues = {
                      customerId: 0,
                      vehicleId: 0,
                      serviceTypeId: undefined,
                      technicianId: 0,
                      scheduledDate: "",
                      scheduledTime: "",
                      status: "scheduled" as "scheduled" | "in_progress" | "completed" | "cancelled",
                      notes: "",
                      valorPago: "0",
                      pixPago: "0.00",
                      dinheiroPago: "0.00",
                      chequePago: "0.00",
                      cartaoPago: "0.00",
                    };

                    // Reset form with correct values FIRST
                    form.reset(defaultValues);

                    // Clear service extras immediately for new service and reset the component
                    setServiceExtras([]);
                    setInitialServiceExtras([]);

                    // THEN set initial values for comparison
                    setFormInitialValues(defaultValues);

                    // Reset payment methods when creating new service
                    setPaymentMethods({
                      pix: "",
                      dinheiro: "",
                      cheque: "",
                      cartao: ""
                    });
                  }}
                >
                  <Plus className="h-7 w-7" />
                </Button>
              </DialogTrigger>

          {/* Search and Filter */}
          <div className="space-y-4 mb-6">
            {/* Search Input - Full width on mobile */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-500 h-4 w-4" />
              <Input
                placeholder="Buscar por cliente, veículo, tipo de serviço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 border-2 border-teal-200 focus:border-emerald-400 rounded-xl shadow-sm bg-white/90 backdrop-blur-sm"
              />
            </div>

            {/* Filters Row - Responsive layout */}
            <div className={cn("grid gap-3", isMobile ? "grid-cols-2" : "flex flex-row gap-4")}>
              {/* Status Filter */}
              <div className="relative">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className={cn(
                    "h-12 border-2 focus:border-emerald-400 rounded-xl shadow-sm bg-white/90 backdrop-blur-sm",
                    filterStatus !== 'all' ? 'border-blue-400 bg-blue-50' : 'border-teal-200',
                    isMobile ? "w-full" : "w-48"
                  )}>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="scheduled">Agendado</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                {filterStatus !== 'all' && (
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold">!</span>
                  </div>
                )}
              </div>

              {/* Payment Filter */}
              <Select value={filterPayment} onValueChange={setFilterPayment}>
                <SelectTrigger className={cn(
                  "h-12 border-2 border-teal-200 focus:border-emerald-400 rounded-xl shadow-sm bg-white/90 backdrop-blur-sm",
                  isMobile ? "w-full" : "w-48"
                )}>
                  <SelectValue placeholder="Todos os pagamentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os pagamentos</SelectItem>
                  <SelectItem value="pagos">Pagos</SelectItem>
                  <SelectItem value="pendentes">Pendentes</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reports and Counter Row - Optimized for mobile */}
            <div className={cn("flex items-center", isMobile ? "justify-between" : "justify-end gap-4")}>
              <Button
                variant="outline"
                onClick={() => setIsAnalyticsModalOpen(true)}
                className={cn(
                  "border-emerald-200 text-emerald-700 hover:bg-emerald-50 flex items-center gap-2",
                  isMobile ? "px-3 py-2 text-sm" : "px-4 py-2"
                )}
              >
                <BarChart3 className={cn("h-4 w-4", isMobile && "h-3 w-3")} />
                <span className={isMobile ? "text-xs" : "text-sm"}>Ver Relatórios</span>
              </Button>
              <div className={cn(
                "bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg shadow-md flex items-center",
                isMobile ? "px-3 py-2 text-sm" : "px-4 py-2"
              )}>
                <span className="font-semibold">{filteredServices.length}</span>
                <span className={cn("ml-1", isMobile ? "text-xs" : "text-sm")}>serviços</span>
              </div>
            </div>
          </div>

          {/* Services Grid */}
          {servicesLoading ? (
              <div className="grid grid-cols-1 gap-6">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse border-0 shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="h-6 bg-gradient-to-r from-teal-200 to-teal-300 rounded-lg w-3/4"></div>
                      <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
                        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-2/3"></div>
                        <div className="h-8 bg-gradient-to-r from-teal-100 to-teal-200 rounded-lg w-full"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredServices.length === 0 ? (
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
                      setInitialServiceExtras([]); // Reset service extras iniciais
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
                <Card key={service.id} className="bg-white/95 backdrop-blur-sm border-0 shadow-md hover:shadow-xl transition-all duration-300 rounded-xl overflow-hidden">
                  {/* Header com data/hora e status */}
                  <div className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                          <Wrench className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="text-lg font-bold">
                            OS #{String(service.id).padStart(6, '0')}
                          </div>
                          <div className="text-xs opacity-90">
                            {service.serviceItems && service.serviceItems.length > 0 
                              ? service.serviceItems.length === 1 
                                ? service.serviceItems[0].serviceTypeName || 'Serviço'
                                : `${service.serviceItems.length} serviços`
                              : 'Ordem de Serviço'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={cn(
                          "text-xs font-medium border-0 shadow-sm",
                          service.status === 'scheduled' && 'bg-blue-500 text-white',
                          service.status === 'in_progress' && 'bg-orange-500 text-white',
                          service.status === 'completed' && 'bg-green-600 text-white',
                          service.status === 'cancelled' && 'bg-red-500 text-white'
                        )}>
                          {service.status === 'scheduled' && 'Agendado'}
                          {service.status === 'in_progress' && 'Em Andamento'}
                          {service.status === 'completed' && 'Concluído'}
                          {service.status === 'cancelled' && 'Cancelado'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    {/* Informações de Agendamento */}
                    {(service.scheduledDate || service.scheduledTime) && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-blue-800">
                              {service.scheduledDate && new Date(service.scheduledDate + 'T00:00:00').toLocaleDateString('pt-BR', {
                                weekday: 'long',
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                timeZone: 'America/Sao_Paulo'
                              })}
                            </div>
                            <div className="text-sm text-blue-600">
                              {service.scheduledTime ? `${service.scheduledTime.slice(0, 5)}h` : 'Horário não definido'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Cliente e Veículo */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800 truncate">
                            {service.customer?.name || 'Cliente não encontrado'}
                          </div>
                          <div className="text-sm text-gray-500">Cliente</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
                          <Car className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800">
                            {service.vehicle?.licensePlate || service.vehicleLicensePlate || 'Placa não informada'}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {service.vehicle?.brand || service.vehicleBrand} {service.vehicle?.model || service.vehicleModel}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detalhes dos Serviços */}
                    {service.serviceItems && service.serviceItems.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Wrench className="h-4 w-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-700">Serviços Inclusos</span>
                        </div>
                        <div className="space-y-1">
                          {service.serviceItems.slice(0, 2).map((item: any, index: number) => (
                            <div key={index} className="text-sm text-gray-800">
                              • {item.serviceTypeName || 'Serviço não especificado'}
                            </div>
                          ))}
                          {service.serviceItems.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{service.serviceItems.length - 2} outros serviços
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Valor e Status do Pagamento */}
                    {service.estimatedValue && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4 text-emerald-600" />
                            <span className="text-sm font-medium text-emerald-700">Valor Total</span>
                          </div>
                          <span className="text-lg font-bold text-emerald-700">
                            R$ {Number(service.estimatedValue).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-emerald-600">
                            Pago: R$ {Number(service.valorPago || 0).toFixed(2)}
                          </span>
                          <div className={`px-2 py-1 rounded-full flex items-center space-x-1 ${paymentStatus.bgColor} border ${paymentStatus.borderColor}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${paymentStatus.dotColor}`}></div>
                            <span className={`text-xs font-medium ${paymentStatus.color}`}>
                              {paymentStatus.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Observações */}
                    {service.notes && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                        <div className="flex items-start space-x-2">
                          <FileText className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-xs font-medium text-yellow-700 mb-1">Observações</div>
                            <div className="text-sm text-yellow-800 line-clamp-2">{service.notes}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Ações */}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLocation(`/service-photos?serviceId=${service.id}`)}
                          className="h-8 w-8 p-0 hover:bg-teal-100 text-teal-600"
                          title="Ver fotos"
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(service)}
                          className="h-8 w-8 p-0 hover:bg-blue-100 text-blue-600"
                          title="Editar serviço"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(service.id)}
                          className="h-8 w-8 p-0 hover:bg-red-100 text-red-600"
                          title="Excluir serviço"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Indicador de técnico responsável */}
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <User className="h-3 w-3" />
                        <span className="truncate max-w-20">
                          {(() => {
                            const technician = users.find(u => u.id === service.technicianId);
                            return technician ? technician.firstName : 'N/A';
                          })()}
                        </span>
                      </div>
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

        {/* Dialog de confirmação para exclusões */}
        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmText="Excluir"
          cancelText="Cancelar"
          variant="destructive"
        />
      </div>
    </div>
  );
}