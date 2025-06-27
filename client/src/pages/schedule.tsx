
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
import { Calendar, DollarSign, MoreHorizontal, Plus, Search, Edit, Trash2, Clock, User, Car, Wrench, CheckCircle, XCircle, Timer, BarChart3, FileText, Camera, Coins, Calculator, Smartphone, Banknote, CreditCard, Receipt, Bell, Grid3X3, CalendarDays } from "lucide-react";
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

// Service form schema
const serviceFormSchema = insertServiceSchema.extend({
  customerId: z.number().min(1, "Cliente é obrigatório"),
  vehicleId: z.number().min(1, "Veículo é obrigatório"),
  technicianId: z.number().optional(),
  serviceTypeId: z.number().optional(),
  scheduledTime: z.string().optional(),
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

// Calendar View Component
function CalendarView({ services, isLoading, onEdit, onDelete, isMobile, onDayClick }: {
  services: Service[];
  isLoading: boolean;
  onEdit: (service: Service) => void;
  onDelete: (id: number) => void;
  isMobile: boolean;
  onDayClick?: (date: Date, services: Service[]) => void;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get current month data
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // Get services by date
  const getServicesForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return services.filter(service => service.scheduledDate === dateString);
  };

  // Generate calendar days
  const days = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const today = new Date();
  const todayString = today.toISOString().split('T')[0];

  return (
    <Card className="bg-white/95 backdrop-blur-sm border border-teal-200 shadow-lg">
      <CardHeader className={cn("pb-4", isMobile ? "px-3 pt-3" : "p-6")}>
        <div className="flex items-center justify-between">
          <CardTitle className={cn("font-bold bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-transparent", isMobile ? "text-base" : "text-xl")}>
            {monthNames[month]} {year}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              className={cn("text-teal-600 hover:bg-teal-50", isMobile ? "h-8 w-8 p-0" : "px-3")}
            >
              ←
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              className={cn("text-teal-600 hover:bg-teal-50", isMobile ? "h-8 w-8 p-0" : "px-3")}
            >
              →
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn(isMobile ? "px-3 pb-3" : "p-6")}>
        <div className="grid grid-cols-7 gap-1">
          {/* Week day headers */}
          {weekDays.map((day) => (
            <div key={day} className={cn("text-center font-medium text-teal-700 py-2", isMobile ? "text-xs" : "text-sm")}>
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {days.map((date, index) => {
            if (!date) {
              return <div key={index} className={cn("aspect-square", isMobile ? "min-h-[80px]" : "min-h-[120px]")}></div>;
            }

            const dayServices = getServicesForDate(date);
            const isToday = date.toISOString().split('T')[0] === todayString;

            return (
              <div
                key={date.toISOString()}
                className={cn(
                  "aspect-square border border-gray-200 rounded-lg p-1 cursor-pointer transition-all duration-200 hover:bg-teal-50 hover:border-teal-300 hover:shadow-md relative overflow-hidden",
                  isToday ? "bg-teal-100 border-teal-400 shadow-md" : "bg-white",
                  isMobile ? "min-h-[80px]" : "min-h-[120px]"
                )}
                onClick={() => {
                  if (isMobile && dayServices.length > 2 && onDayClick) {
                    onDayClick(date, dayServices);
                  }
                }}
              >
                <div className={cn("text-center font-medium flex items-center justify-between", isMobile ? "text-xs mb-1" : "text-sm mb-2")}>
                  <span className={cn(isToday ? "text-teal-800 font-bold" : "text-gray-700")}>
                    {date.getDate()}
                  </span>
                  {dayServices.length > 0 && (
                    <span className={cn(
                      "bg-teal-500 text-white rounded-full flex items-center justify-center font-bold",
                      isMobile ? "w-4 h-4 text-xs" : "w-5 h-5 text-xs"
                    )}>
                      {dayServices.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1 overflow-y-auto" style={{ maxHeight: isMobile ? "60px" : "80px" }}>
                  {dayServices.length > 0 ? (
                    <>
                      {/* No mobile, mostrar até 2 agendamentos se houver espaço */}
                      {dayServices.slice(0, isMobile ? Math.min(2, dayServices.length) : 2).map((service) => (
                        <div
                          key={service.id}
                          className={cn(
                            "px-2 py-1 rounded-md text-white cursor-pointer transition-all duration-200 hover:scale-105 shadow-sm",
                            isMobile ? "text-xs leading-tight" : "text-xs",
                            service.status === "scheduled" ? "bg-blue-500 hover:bg-blue-600" :
                            service.status === "in_progress" ? "bg-yellow-500 hover:bg-yellow-600" :
                            service.status === "completed" ? "bg-green-500 hover:bg-green-600" :
                            "bg-red-500 hover:bg-red-600"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(service);
                          }}
                          title={`${service.customer?.name} - ${service.serviceType?.name} ${service.scheduledTime ? `às ${service.scheduledTime.slice(0, 5)}` : ''}`}
                        >
                          <div className="truncate font-medium">
                            {isMobile 
                              ? service.customer?.name?.split(' ')[0] || 'Cliente'
                              : service.customer?.name || 'Cliente'
                            }
                          </div>
                          {!isMobile && (
                            <div className="truncate text-xs opacity-90">
                              {service.serviceType?.name}
                            </div>
                          )}
                          {service.scheduledTime && (
                            <div className="text-xs opacity-80">
                              {service.scheduledTime.slice(0, 5)}
                            </div>
                          )}
                        </div>
                      ))}
                      {/* Botão "Ver todos" apenas se houver mais de 2 agendamentos */}
                      {dayServices.length > 2 && (
                        <div 
                          className={cn("text-center text-teal-600 font-medium cursor-pointer hover:text-teal-800 transition-colors bg-teal-50 rounded p-1", isMobile ? "text-xs" : "text-xs")}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isMobile && onDayClick) {
                              onDayClick(date, dayServices);
                            }
                          }}
                        >
                          +{dayServices.length - 2} mais
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-gray-400 text-xs text-center py-1">
                      {/* Espaço vazio para dias sem agendamentos */}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SchedulePage() {
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
  console.log('Schedule page - location:', location);
  console.log('Schedule page - window.location.search:', window.location.search);
  console.log('Schedule page - customerIdFilter:', customerIdFilter);
  console.log('Schedule page - customerFilter:', customerFilter);
  console.log('Schedule page - statusFilter:', statusFilter);

  const [searchTerm, setSearchTerm] = useState(customerFilter);
  const [filterStatus, setFilterStatus] = useState<string>(statusFilter);
  const [filterPayment, setFilterPayment] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("day");
  const [viewMode, setViewMode] = useState<"cards" | "calendar">("cards");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [currentServicePhotos, setCurrentServicePhotos] = useState<Photo[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [serviceExtras, setServiceExtras] = useState<any[]>([]);
  const [initialServiceExtras, setInitialServiceExtras] = useState<any[]>([]);
  const [serviceItems, setServiceItems] = useState<any[]>([]);
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
  const [dayServicesModal, setDayServicesModal] = useState<{
    isOpen: boolean;
    date: Date | null;
    services: Service[];
  }>({
    isOpen: false,
    date: null,
    services: []
  });
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
    message: "Você tem alterações não salvas no cadastro do agendamento. Deseja realmente sair?"
  });

  // Queries
  const { data: services = [], isLoading, refetch } = useQuery<(Service & { customer: Customer; vehicle: Vehicle; serviceType: ServiceType })[]>({
    queryKey: ['/api/services'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/services');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      console.log('Schedule page - Services data:', data);
      console.log('Schedule page - First service:', data[0]);
      return data;
    },
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/customers');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    },
  });

  const { data: vehicles = [] } = useQuery<(Vehicle & { customer: Customer })[]>({
    queryKey: ['/api/vehicles'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/vehicles');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    },
  });

  const { data: serviceTypes = [] } = useQuery<ServiceType[]>({
    queryKey: ['/api/service-types'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/service-types');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    },
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/users');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    },
  });

  // Clear form when closing modal without edit
  const resetForm = () => {
    setServiceExtras([]);
    setServiceItems([]);
    setInitialServiceExtras([]);
    setTemporaryPhotos([]);
    setCurrentServicePhotos([]);
    setFormInitialValues(null);
    
    // Reset form values
    form.reset({
      customerId: 0,
      vehicleId: 0,
      serviceTypeId: undefined,
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
    });

    // Reset payment methods
    setPaymentMethods({
      pix: "",
      dinheiro: "",
      cheque: "",
      cartao: ""
    });
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof serviceFormSchema>) => {
      console.log('Creating service with data:', data);
      console.log('Service items for creation:', serviceItems);

      // Calculate total value from service items
      const totalValue = calculateTotalValue();

      // Calculate total from payment methods
      const totalFromPaymentMethods = (
        Number(paymentMethods.pix || 0) +
        Number(paymentMethods.dinheiro || 0) +
        Number(paymentMethods.cheque || 0) +
        Number(paymentMethods.cartao || 0)
      ).toFixed(2);

      const payload = {
        ...data,
        estimatedValue: String(totalValue),
        finalValue: String(totalValue),
        valorPago: totalFromPaymentMethods,
        pixPago: paymentMethods.pix || "0.00",
        dinheiroPago: paymentMethods.dinheiro || "0.00",
        chequePago: paymentMethods.cheque || "0.00",
        cartaoPago: paymentMethods.cartao || "0.00",
        reminderEnabled: data.reminderEnabled || false,
        reminderMinutes: data.reminderMinutes || 30,
        serviceItems: serviceItems || [],
        // Remove serviceExtras from the payload as we're using serviceItems
        serviceExtras: undefined,
      };

      console.log('Final payload being sent:', payload);

      const response = await apiRequest('POST', '/api/services', payload);
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Server response:', errorData);
        throw new Error(`Failed to create service: ${response.status} ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: async (newService) => {
      // Handle photo uploads if there are any
      if (temporaryPhotos.length > 0) {
        try {
          for (const tempPhoto of temporaryPhotos) {
            await apiRequest('POST', '/api/photos', {
              entityType: 'service',
              entityId: newService.id,
              category: tempPhoto.category,
              photo: tempPhoto.photo,
              description: `Foto do agendamento`,
            });
          }
        } catch (error) {
          console.error('Error uploading photos:', error);
          toast({
            title: "Agendamento criado, mas erro ao salvar fotos",
            description: "O agendamento foi criado com sucesso, mas houve um erro ao salvar as fotos.",
            variant: "default",
          });
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      
      resetForm();
      setIsDialogOpen(false);
      
      toast({
        title: "Agendamento criado com sucesso!",
        description: `Agendamento #${newService.id} foi criado.`,
      });
    },
    onError: (error) => {
      console.error('Error creating service:', error);
      toast({
        title: "Erro ao criar agendamento",
        description: "Ocorreu um erro ao criar o agendamento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof serviceFormSchema> }) => {
      console.log('Updating service with data:', data);
      console.log('Service items for update:', serviceItems);

      // Calculate total value from service items
      const totalValue = calculateTotalValue();

      // Calculate total from payment methods
      const totalFromPaymentMethods = (
        Number(paymentMethods.pix || 0) +
        Number(paymentMethods.dinheiro || 0) +
        Number(paymentMethods.cheque || 0) +
        Number(paymentMethods.cartao || 0)
      ).toFixed(2);

      const payload = {
        ...data,
        estimatedValue: String(totalValue),
        finalValue: String(totalValue),
        valorPago: totalFromPaymentMethods,
        pixPago: paymentMethods.pix || "0.00",
        dinheiroPago: paymentMethods.dinheiro || "0.00",
        chequePago: paymentMethods.cheque || "0.00",
        cartaoPago: paymentMethods.cartao || "0.00",
        reminderEnabled: data.reminderEnabled || false,
        reminderMinutes: data.reminderMinutes || 30,
        serviceItems: serviceItems || [],
        // Remove serviceExtras from the payload as we're using serviceItems
        serviceExtras: undefined,
      };

      console.log('Final update payload being sent:', payload);

      const response = await apiRequest('PUT', `/api/services/${id}`, payload);
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Server response:', errorData);
        throw new Error(`Failed to update service: ${response.status} ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: async (updatedService) => {
      // Handle photo uploads if there are any
      if (temporaryPhotos.length > 0) {
        try {
          for (const tempPhoto of temporaryPhotos) {
            await apiRequest('POST', '/api/photos', {
              entityType: 'service',
              entityId: updatedService.id,
              category: tempPhoto.category,
              photo: tempPhoto.photo,
              description: `Foto do agendamento`,
            });
          }
        } catch (error) {
          console.error('Error uploading photos:', error);
          toast({
            title: "Agendamento atualizado, mas erro ao salvar fotos",
            description: "O agendamento foi atualizado com sucesso, mas houve um erro ao salvar as fotos.",
            variant: "default",
          });
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      
      resetForm();
      setIsDialogOpen(false);
      setEditingService(null);
      
      toast({
        title: "Agendamento atualizado com sucesso!",
        description: `Agendamento #${updatedService.id} foi atualizado.`,
      });
    },
    onError: (error) => {
      console.error('Error updating service:', error);
      toast({
        title: "Erro ao atualizar agendamento",
        description: "Ocorreu um erro ao atualizar o agendamento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/services/${id}`);
      if (!response.ok) {
        throw new Error('Failed to delete service');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      toast({
        title: "Agendamento excluído com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Error deleting service:', error);
      toast({
        title: "Erro ao excluir agendamento",
        description: "Ocorreu um erro ao excluir o agendamento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Calculate total value from services
  const calculateTotalValue = () => {
    let total = 0;

    // Add all selected services values
    serviceItems.forEach(item => {
      if (item.totalPrice && !isNaN(Number(item.totalPrice))) {
        total += Number(item.totalPrice);
      } else if (item.unitPrice && !isNaN(Number(item.unitPrice))) {
        total += Number(item.unitPrice);
      }
    });

    return total.toFixed(2);
  };

  // Form submission
  const onSubmit = (data: z.infer<typeof serviceFormSchema>) => {
    console.log('Form submitted with data:', data);
    console.log('Current service items:', serviceItems);
    
    if (editingService) {
      updateMutation.mutate({ id: editingService.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Open modal for new service
  const openAddModal = () => {
    resetForm();
    setEditingService(null);
    setIsDialogOpen(true);
    
    // Set form initial values for tracking changes
    const initialValues = form.getValues();
    setFormInitialValues(initialValues);
    
    // If there's a customer filter, pre-select the customer
    if (customerIdFilter) {
      const customerId = parseInt(customerIdFilter);
      if (customerId > 0) {
        form.setValue('customerId', customerId);
        
        // If there's also a vehicle filter, pre-select the vehicle
        if (vehicleIdFilter) {
          const vehicleId = parseInt(vehicleIdFilter);
          if (vehicleId > 0) {
            form.setValue('vehicleId', vehicleId);
          }
        }
      }
    }
  };

  // Open modal for editing service
  const openEditModal = async (service: Service) => {
    resetForm();
    setEditingService(service);
    
    // Load service photos
    try {
      const response = await apiRequest('GET', `/api/photos?entityType=service&entityId=${service.id}`);
      if (response.ok) {
        const photos = await response.json();
        setCurrentServicePhotos(photos);
      }
    } catch (error) {
      console.error('Error loading service photos:', error);
    }
    
    // Load service items
    if (service.serviceItems && service.serviceItems.length > 0) {
      setServiceItems(service.serviceItems);
    } else {
      setServiceItems([]);
    }
    
    // Populate form with service data
    const formData = {
      customerId: service.customerId,
      vehicleId: service.vehicleId,
      serviceTypeId: service.serviceTypeId,
      technicianId: service.technicianId || 0,
      scheduledDate: service.scheduledDate || "",
      scheduledTime: service.scheduledTime || "",
      status: service.status,
      estimatedValue: service.estimatedValue,
      finalValue: service.finalValue,
      notes: service.notes || "",
      valorPago: service.valorPago || "0",
      pixPago: service.pixPago || "0.00",
      dinheiroPago: service.dinheiroPago || "0.00",
      chequePago: service.chequePago || "0.00",
      cartaoPago: service.cartaoPago || "0.00",
    };
    
    form.reset(formData);
    setFormInitialValues(formData);
    
    // Load payment methods
    setPaymentMethods({
      pix: service.pixPago || "",
      dinheiro: service.dinheiroPago || "",
      cheque: service.chequePago || "",
      cartao: service.cartaoPago || "",
    });
    
    setIsDialogOpen(true);
  };

  // Handle delete
  const handleDelete = (service: Service) => {
    setConfirmDialog({
      isOpen: true,
      title: "Excluir Agendamento",
      description: `Tem certeza que deseja excluir o agendamento do cliente ${service.customer?.name}? Esta ação não pode ser desfeita.`,
      onConfirm: () => {
        deleteMutation.mutate(service.id);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Filter services
  const getDateRange = (period: string) => {
    // Get current date in Brazilian timezone (America/Sao_Paulo)
    const now = new Date();
    
    // Create a proper Brazilian date
    const brazilianDate = new Intl.DateTimeFormat('en-CA', { 
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit'
    }).format(now);
    
    console.log('getDateRange - period:', period, 'Brazilian date today:', brazilianDate, 'UTC now:', now.toISOString());

    switch (period) {
      case "day":
        console.log('getDateRange - day filter returning:', { start: brazilianDate, end: brazilianDate });
        return { start: brazilianDate, end: brazilianDate };
      case "week":
        // Get current date in Brazilian timezone as Date object
        const today = new Date();
        const brazilTime = new Date(today.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
        
        const startOfWeek = new Date(brazilTime);
        startOfWeek.setDate(brazilTime.getDate() - brazilTime.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        const weekStart = new Intl.DateTimeFormat('en-CA', { 
          timeZone: 'America/Sao_Paulo',
          year: 'numeric',
          month: '2-digit', 
          day: '2-digit'
        }).format(startOfWeek);
        
        const weekEnd = new Intl.DateTimeFormat('en-CA', { 
          timeZone: 'America/Sao_Paulo',
          year: 'numeric',
          month: '2-digit', 
          day: '2-digit'
        }).format(endOfWeek);
        
        return { start: weekStart, end: weekEnd };
        
      case "month":
        const currentMonth = new Date();
        
        // Get first day of current month in Brazilian timezone
        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const monthStart = new Intl.DateTimeFormat('en-CA', { 
          timeZone: 'America/Sao_Paulo',
          year: 'numeric',
          month: '2-digit', 
          day: '2-digit'
        }).format(firstDay);
        
        // Get last day of current month in Brazilian timezone
        const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        const monthEnd = new Intl.DateTimeFormat('en-CA', { 
          timeZone: 'America/Sao_Paulo',
          year: 'numeric',
          month: '2-digit', 
          day: '2-digit'
        }).format(lastDay);
        
        return { start: monthStart, end: monthEnd };
      default:
        return null;
    }
  };

  const filteredServices = services.filter((service) => {
    const matchesSearch = service.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.vehicle?.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.serviceType?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === "all" || service.status === filterStatus;

    const matchesPayment = (() => {
      if (filterPayment === "all") return true;
      
      const valorPago = parseFloat(service.valorPago || "0");
      const estimatedValue = parseFloat(service.estimatedValue || "0");
      const finalValue = parseFloat(service.finalValue || service.estimatedValue || "0");
      
      switch (filterPayment) {
        case "paid":
          return valorPago >= finalValue;
        case "pending":
          return valorPago === 0;
        case "partial":
          return valorPago > 0 && valorPago < finalValue;
        default:
          return true;
      }
    })();

    // Aplicar filtro de período em ambos os modos (cards e calendar)
    let matchesPeriod = true;
    if (periodFilter !== "all" && service.scheduledDate) {
      const dateRange = getDateRange(periodFilter);
      if (dateRange) {
        const serviceDate = service.scheduledDate;
        matchesPeriod = serviceDate >= dateRange.start && serviceDate <= dateRange.end;
        console.log('Period filter check:', {
          serviceDate,
          dateRange,
          matchesPeriod,
          periodFilter,
          serviceName: service.customer?.name
        });
      }
    }

    const result = matchesSearch && matchesStatus && matchesPayment && matchesPeriod;
    
    // Log para debug apenas para serviços do dia 26
    if (service.scheduledDate === '2025-06-26') {
      console.log('Service filter result for 2025-06-26:', {
        serviceName: service.customer?.name,
        scheduledDate: service.scheduledDate,
        matchesSearch,
        matchesStatus,
        matchesPayment,
        matchesPeriod,
        periodFilter,
        finalResult: result
      });
    }

    return result;
  });

  // Get selected customer's vehicles
  const selectedCustomerId = form.watch("customerId");
  const availableVehicles = vehicles.filter(vehicle => 
    selectedCustomerId ? vehicle.customerId === selectedCustomerId : true
  );

  // Open modal automatically if URL param is set
  useEffect(() => {
    if (openModalParam && !isDialogOpen) {
      openAddModal();
      // Remove the openModal parameter from URL without causing a page reload
      const newUrl = window.location.pathname + window.location.search.replace(/[?&]openModal=true/, '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [openModalParam, isDialogOpen]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={cn("flex bg-gradient-to-br from-slate-100 via-white to-blue-50/30", isMobile ? "h-screen flex-col" : "h-screen")}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title={isMobile ? "Agenda" : "Agenda"} 
          subtitle={isMobile ? "Agendamentos" : "Gerenciar agendamentos"}
        />

        <main className="flex-1 overflow-y-auto">
          <div className={cn(isMobile ? "p-3" : "p-8")}>
            {/* Filters */}
            <div className={cn("flex gap-4 mb-6", isMobile ? "flex-col space-y-3" : "flex-col lg:flex-row lg:items-center mb-8")}>
              <div className={cn("flex-1", isMobile ? "w-full" : "max-w-md")}>
                <div className="relative">
                  <Search className={cn("absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400", isMobile ? "h-4 w-4" : "h-4 w-4")} />
                  <Input
                    placeholder={isMobile ? "Buscar agendamentos..." : "Buscar por cliente, veículo ou observações..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={cn("pl-10 bg-white/90 backdrop-blur-sm border-gray-200/50 rounded-xl shadow-sm focus:shadow-md transition-all duration-200", isMobile ? "h-11 text-base" : "")}
                  />
                </div>
              </div>

              <div className={cn("flex gap-3", isMobile ? "flex-col" : "flex-row min-w-max")}>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className={cn("bg-white/90 backdrop-blur-sm border-gray-200/50 rounded-xl shadow-sm focus:shadow-md transition-all duration-200", isMobile ? "w-full h-11" : "w-48")}>
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="scheduled">Agendado</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterPayment} onValueChange={setFilterPayment}>
                  <SelectTrigger className={cn("bg-white/90 backdrop-blur-sm border-gray-200/50 rounded-xl shadow-sm focus:shadow-md transition-all duration-200", isMobile ? "w-full h-11" : "w-48")}>
                    <SelectValue placeholder="Filtrar por pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Pagamentos</SelectItem>
                    <SelectItem value="paid">Pagos</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="partial">Parcial</SelectItem>
                  </SelectContent>
                </Select>

                {viewMode === "cards" && (
                  <Select value={periodFilter} onValueChange={setPeriodFilter}>
                    <SelectTrigger className={cn("bg-white/90 backdrop-blur-sm border-gray-200/50 rounded-xl shadow-sm focus:shadow-md transition-all duration-200", isMobile ? "w-full h-11" : "w-48")}>
                      <SelectValue placeholder="Filtrar por período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Períodos</SelectItem>
                      <SelectItem value="day">Hoje</SelectItem>
                      <SelectItem value="week">Esta Semana</SelectItem>
                      <SelectItem value="month">Este Mês</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {/* View Mode Toggle */}
                <div className={cn("bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-xl p-1 shadow-sm", isMobile ? "w-full" : "")}>
                  <div className="flex gap-1">
                    <Button
                      variant={viewMode === "cards" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("cards")}
                      className={cn(
                        "transition-all duration-200 rounded-lg",
                        viewMode === "cards" 
                          ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md" 
                          : "text-teal-600 hover:bg-teal-50",
                        isMobile ? "flex-1 h-9" : "px-3"
                      )}
                    >
                      <Grid3X3 className={cn("mr-2", isMobile ? "h-4 w-4" : "h-4 w-4")} />
                      {!isMobile && "Cards"}
                    </Button>
                    <Button
                      variant={viewMode === "calendar" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("calendar")}
                      className={cn(
                        "transition-all duration-200 rounded-lg",
                        viewMode === "calendar" 
                          ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md" 
                          : "text-teal-600 hover:bg-teal-50",
                        isMobile ? "flex-1 h-9" : "px-3"
                      )}
                    >
                      <CalendarDays className={cn("mr-2", isMobile ? "h-4 w-4" : "h-4 w-4")} />
                      {!isMobile && "Calendário"}
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={openAddModal}
                  className={cn("bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 rounded-xl font-medium", isMobile ? "w-full h-11 px-4 text-sm justify-center" : "px-6 py-2")}
                >
                  <Plus className={cn("mr-2", isMobile ? "h-4 w-4" : "h-4 w-4")} />
                  {isMobile ? "Novo" : "Novo Agendamento"}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setIsAnalyticsModalOpen(true)}
                  className={cn("border-gray-300 text-gray-600 hover:bg-gray-50 rounded-xl shadow-sm", isMobile ? "w-full h-11" : "px-4")}
                >
                  <BarChart3 className={cn("mr-2", isMobile ? "h-4 w-4" : "h-4 w-4")} />
                  {!isMobile && "Analytics"}
                </Button>
              </div>
            </div>

            {/* Services Display */}
            {viewMode === "calendar" ? (
              <CalendarView
                services={filteredServices}
                isLoading={isLoading}
                onEdit={openEditModal}
                onDelete={handleDelete}
                isMobile={isMobile}
                onDayClick={(date, services) => {
                  setDayServicesModal({
                    isOpen: true,
                    date,
                    services
                  });
                }}
              />
            ) : (
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {filteredServices.map((service) => {
                  const paymentStatus = (() => {
                    const valorPago = parseFloat(service.valorPago || "0");
                    const finalValue = parseFloat(service.finalValue || service.estimatedValue || "0");
                    
                    if (valorPago >= finalValue) return "paid";
                    if (valorPago === 0) return "pending";
                    return "partial";
                  })();

                  return (
                    <Card key={service.id} className="bg-white/95 backdrop-blur-sm border border-teal-200 hover:shadow-lg transition-all duration-300 hover:border-emerald-300">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-bold text-teal-800 mb-1">
                              {service.customer?.name}
                            </CardTitle>
                            <p className="text-sm text-gray-600 mb-2">
                              {service.vehicle?.brand} {service.vehicle?.model} - {service.vehicle?.licensePlate}
                            </p>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge 
                                className={cn(
                                  "text-xs font-medium",
                                  service.status === "scheduled" ? "bg-blue-100 text-blue-800 border-blue-200" :
                                  service.status === "in_progress" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                                  service.status === "completed" ? "bg-green-100 text-green-800 border-green-200" :
                                  "bg-red-100 text-red-800 border-red-200"
                                )}
                              >
                                {translateStatus(service.status || "scheduled")}
                              </Badge>
                              <Badge 
                                className={cn(
                                  "text-xs font-medium",
                                  paymentStatus === "paid" ? "bg-green-100 text-green-800 border-green-200" :
                                  paymentStatus === "pending" ? "bg-red-100 text-red-800 border-red-200" :
                                  "bg-yellow-100 text-yellow-800 border-yellow-200"
                                )}
                              >
                                {paymentStatus === "paid" ? "Pago" : paymentStatus === "pending" ? "Pendente" : "Parcial"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(service)}
                              className="h-8 w-8 p-0 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(service)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="h-4 w-4 mr-2" />
                            {service.scheduledDate ? format(new Date(service.scheduledDate), 'dd/MM/yyyy') : "Data não definida"}
                            {service.scheduledTime && (
                              <>
                                <Clock className="h-4 w-4 ml-3 mr-1" />
                                {service.scheduledTime.slice(0, 5)}
                              </>
                            )}
                          </div>
                          
                          {service.serviceType && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Wrench className="h-4 w-4 mr-2" />
                              {service.serviceType.name}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Valor:</span>
                              <span className="ml-1 font-bold text-emerald-600">
                                R$ {Number(service.finalValue || service.estimatedValue || 0).toFixed(2)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Pago:</span>
                              <span className="ml-1 font-bold text-green-600">
                                R$ {Number(service.valorPago || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* No services message */}
            {!isLoading && filteredServices.length === 0 && (
              <div className="text-center py-12">
                <Card className="max-w-md mx-auto bg-white/80 backdrop-blur-sm border border-teal-200">
                  <CardContent className="pt-8 pb-6">
                    <Calendar className="h-16 w-16 text-teal-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      {searchTerm || filterStatus !== "all" || filterPayment !== "all" 
                        ? "Nenhum agendamento encontrado"
                        : "Nenhum agendamento cadastrado"
                      }
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {searchTerm || filterStatus !== "all" || filterPayment !== "all"
                        ? "Tente ajustar os filtros para ver mais resultados."
                        : "Comece criando o primeiro agendamento."
                      }
                    </p>
                    <Button
                      onClick={openAddModal}
                      className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeiro Agendamento
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>

        {/* Modal para mostrar todos os agendamentos do dia */}
        <Dialog open={dayServicesModal.isOpen} onOpenChange={(open) => setDayServicesModal(prev => ({ ...prev, isOpen: open }))}>
          <DialogContent className={cn("bg-gradient-to-br from-slate-50 to-blue-50/30", isMobile ? "max-w-[95vw] w-[95vw] h-auto max-h-[80vh] m-2 p-4" : "max-w-md")}>
            <DialogHeader className="pb-4">
              <DialogTitle className={cn("font-bold bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-transparent", isMobile ? "text-lg" : "text-xl")}>
                Agendamentos - {dayServicesModal.date?.toLocaleDateString('pt-BR')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {dayServicesModal.services.map((service) => (
                <div
                  key={service.id}
                  className={cn(
                    "p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md",
                    service.status === "scheduled" ? "bg-blue-50 border-blue-200 hover:bg-blue-100" :
                    service.status === "in_progress" ? "bg-yellow-50 border-yellow-200 hover:bg-yellow-100" :
                    service.status === "completed" ? "bg-green-50 border-green-200 hover:bg-green-100" :
                    "bg-red-50 border-red-200 hover:bg-red-100"
                  )}
                  onClick={() => {
                    openEditModal(service);
                    setDayServicesModal(prev => ({ ...prev, isOpen: false }));
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-gray-900">{service.customer?.name}</div>
                      <div className="text-sm text-gray-600">{service.vehicle?.licensePlate}</div>
                    </div>
                    {service.scheduledTime && (
                      <div className="text-sm font-medium text-gray-700">
                        {service.scheduledTime.slice(0, 5)}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {service.serviceType?.name}
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <Badge 
                      className={cn(
                        "text-xs",
                        service.status === "scheduled" ? "bg-blue-100 text-blue-800" :
                        service.status === "in_progress" ? "bg-yellow-100 text-yellow-800" :
                        service.status === "completed" ? "bg-green-100 text-green-800" :
                        "bg-red-100 text-red-800"
                      )}
                    >
                      {translateStatus(service.status || "scheduled")}
                    </Badge>
                    <div className="text-sm font-medium text-emerald-600">
                      R$ {Number(service.finalValue || service.estimatedValue || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Service Form Dialog - IGUAL AO DA PÁGINA DE SERVIÇOS */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open && hasUnsavedChanges) {
            unsavedChanges.triggerConfirmation(() => {
              setIsDialogOpen(false);
              resetForm();
              setEditingService(null);
            });
          } else {
            setIsDialogOpen(open);
            if (!open) {
              resetForm();
              setEditingService(null);
            }
          }
        }}>
          <DialogContent className={cn("max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50/30", isMobile ? "max-w-[95vw] w-[95vw] h-[90vh] m-2 p-4" : "max-w-4xl")}>
            <DialogHeader className={cn(isMobile ? "pb-4" : "pb-6")}>
              <DialogTitle className={cn("font-bold bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-transparent", isMobile ? "text-lg" : "text-2xl")}>
                {editingService ? (isMobile ? "Editar Agendamento" : "Editar Agendamento") : (isMobile ? "Novo Agendamento" : "Novo Agendamento")}
              </DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Customer and Vehicle Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center text-slate-700 font-semibold">
                          <User className="h-4 w-4 mr-2 text-teal-600" />
                          Cliente
                        </FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(Number(value));
                            form.setValue("vehicleId", 0);
                          }} 
                          value={field.value > 0 ? field.value.toString() : ""}
                        >
                          <FormControl>
                            <SelectTrigger className={cn("border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md", isMobile ? "h-12 text-base" : "h-11")}>
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
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center text-slate-700 font-semibold">
                          <Car className="h-4 w-4 mr-2 text-teal-600" />
                          Veículo
                        </FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(Number(value))} 
                          value={field.value > 0 ? field.value.toString() : ""}
                          disabled={!selectedCustomerId}
                        >
                          <FormControl>
                            <SelectTrigger className={cn("border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md disabled:opacity-50", isMobile ? "h-12 text-base" : "h-11")}>
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
                    )}
                  />
                </div>

                {/* Service Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="scheduledDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center text-slate-700 font-semibold">
                          <Calendar className="h-4 w-4 mr-2 text-teal-600" />
                          Data do Agendamento
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            className={cn("border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md", isMobile ? "h-12 text-base" : "h-11")}
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
                        <FormLabel className="flex items-center text-slate-700 font-semibold">
                          <Clock className="h-4 w-4 mr-2 text-teal-600" />
                          Horário
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            className={cn("border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md", isMobile ? "h-12 text-base" : "h-11")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center text-slate-700 font-semibold">
                          <CheckCircle className="h-4 w-4 mr-2 text-teal-600" />
                          Status
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className={cn("border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md", isMobile ? "h-12 text-base" : "h-11")}>
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
                </div>

                {/* Technician */}
                <FormField
                  control={form.control}
                  name="technicianId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center text-slate-700 font-semibold">
                        <User className="h-4 w-4 mr-2 text-teal-600" />
                        Técnico Responsável
                      </FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(Number(value))} 
                        value={field.value && field.value > 0 ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger className={cn("border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md", isMobile ? "h-12 text-base" : "h-11")}>
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

                {/* Service Items */}
                <ServiceItems 
                  serviceId={editingService?.id}
                  initialItems={serviceItems}
                  onChange={(items) => {
                    console.log('Schedule page - Received items from ServiceItems:', items);
                    setServiceItems(items);
                  }}
                />

                {/* Payment Manager */}
                <PaymentManager
                  form={form}
                  paymentMethods={paymentMethods}
                  onPaymentMethodsChange={setPaymentMethods}
                />

                {/* Photo Upload */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Fotos</h3>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsCameraOpen(true)}
                        className="flex items-center gap-2"
                      >
                        <Camera className="h-4 w-4" />
                        Câmera
                      </Button>
                    </div>
                  </div>

                  <PhotoUpload
                    entityType="service"
                    entityId={editingService?.id}
                    currentPhotos={currentServicePhotos}
                    temporaryPhotos={temporaryPhotos}
                    onPhotosChange={setCurrentServicePhotos}
                    onTemporaryPhotosChange={setTemporaryPhotos}
                  />
                </div>

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center text-slate-700 font-semibold">
                        <FileText className="h-4 w-4 mr-2 text-teal-600" />
                        Observações
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Observações sobre o agendamento..."
                          {...field}
                          className="border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md resize-none"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (hasUnsavedChanges) {
                        unsavedChanges.triggerConfirmation(() => {
                          setIsDialogOpen(false);
                          resetForm();
                          setEditingService(null);
                        });
                      } else {
                        setIsDialogOpen(false);
                        resetForm();
                        setEditingService(null);
                      }
                    }}
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg font-medium"
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <LoadingSpinner />
                    ) : editingService ? (
                      "Atualizar Agendamento"
                    ) : (
                      "Criar Agendamento"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Camera Capture */}
        {isCameraOpen && (
          <CameraCapture
            isOpen={isCameraOpen}
            onClose={() => setIsCameraOpen(false)}
            onCapture={(photo, category) => {
              setTemporaryPhotos(prev => [...prev, { photo, category }]);
              setIsCameraOpen(false);
            }}
          />
        )}

        {/* Analytics Modal */}
        <Dialog open={isAnalyticsModalOpen} onOpenChange={setIsAnalyticsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-transparent">
                Analytics de Agendamentos
              </DialogTitle>
            </DialogHeader>
            <ServiceAnalytics />
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          description={confirmDialog.description}
        />

        {/* Unsaved Changes Dialog */}
        <UnsavedChangesDialog 
          isOpen={unsavedChanges.isDialogOpen}
          onClose={() => unsavedChanges.closeDialog()}
          onDiscard={() => unsavedChanges.discardChanges()}
          onSave={() => unsavedChanges.saveChanges()}
          title="Alterações não salvas"
          description={unsavedChanges.message}
        />
      </div>
    </div>
  );
}
