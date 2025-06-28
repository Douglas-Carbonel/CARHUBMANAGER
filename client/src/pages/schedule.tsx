
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Calendar, DollarSign, MoreHorizontal, Plus, Search, Edit, Trash2, Clock, User, Car, Wrench, CheckCircle, XCircle, Timer, BarChart3, FileText, Camera, Coins, Calculator, Smartphone, Banknote, CreditCard, Receipt, Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceSchema, type Service, type Customer, type Vehicle, type ServiceType, type Photo } from "@shared/schema";
import { z } from "zod";
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isToday, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import ServiceItems from "@/components/service/service-items";
import PaymentManager from "@/components/service/payment-manager";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
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

export default function SchedulePage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'Month' | 'Week' | 'Day'>('Month');
  const [periodFilter, setPeriodFilter] = useState<string>("todos");
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDayAppointmentsModalOpen, setIsDayAppointmentsModalOpen] = useState(false);
  const [selectedDayServices, setSelectedDayServices] = useState<any[]>([]);
  const [serviceExtras, setServiceExtras] = useState<any[]>([]);
  const [initialServiceExtras, setInitialServiceExtras] = useState<any[]>([]);
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
  const hasFormChanges = formInitialValues && isAddModalOpen && JSON.stringify(currentFormValues) !== JSON.stringify(formInitialValues);
  const hasServiceExtrasChanges = JSON.stringify(serviceExtras) !== JSON.stringify(initialServiceExtras);
  const hasUnsavedChanges = hasFormChanges || temporaryPhotos.length > 0 || hasServiceExtrasChanges;

  const unsavedChanges = useUnsavedChanges({
    hasUnsavedChanges: !!hasUnsavedChanges,
    message: "Você tem alterações não salvas no cadastro do serviço. Deseja realmente sair?"
  });

  // Fetch data
  const { data: services = [], isLoading: servicesLoading } = useQuery<(Service & { customer: Customer; vehicle: Vehicle; serviceType: ServiceType })[]>({
    queryKey: ["/api/services"],
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

  // Filter services by period
  const getFilteredServices = () => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    return services.filter(service => {
      if (!service.scheduledDate) return false;
      
      const serviceDate = parseISO(service.scheduledDate);
      
      switch (periodFilter) {
        case "hoje":
          return serviceDate >= startOfToday && serviceDate <= endOfToday;
        case "semana":
          const startWeek = startOfWeek(today, { weekStartsOn: 1 });
          const endWeek = endOfWeek(today, { weekStartsOn: 1 });
          return serviceDate >= startWeek && serviceDate <= endWeek;
        case "mes":
          const startMonth = startOfMonth(today);
          const endMonth = endOfMonth(today);
          return serviceDate >= startMonth && serviceDate <= endMonth;
        default:
          return true;
      }
    });
  };

  const filteredServices = getFilteredServices();

  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const startDate = startOfMonth(currentDate);
    const endDate = endOfMonth(currentDate);
    const startCalendar = startOfWeek(startDate, { weekStartsOn: 1 });
    const endCalendar = endOfWeek(endDate, { weekStartsOn: 1 });

    const days = [];
    let day = startCalendar;

    while (day <= endCalendar) {
      const dayServices = services.filter(service => 
        service.scheduledDate && isSameDay(parseISO(service.scheduledDate), day)
      );
      
      days.push({
        date: new Date(day),
        services: dayServices,
        isCurrentMonth: day.getMonth() === currentDate.getMonth(),
        isToday: isToday(day)
      });
      
      day = addDays(day, 1);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  // Get services for selected date
  const getServicesForDate = (date: Date) => {
    return services.filter(service => 
      service.scheduledDate && isSameDay(parseISO(service.scheduledDate), date)
    );
  };

  // Handle day click
  const handleDayClick = (date: Date) => {
    const dayServices = getServicesForDate(date);
    if (dayServices.length > 1) {
      setSelectedDayServices(dayServices);
      setIsDayAppointmentsModalOpen(true);
    } else if (dayServices.length === 1) {
      setLocation(`/services?openModal=true&serviceId=${dayServices[0].id}`);
    }
    setSelectedDate(date);
  };

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/services", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsAddModalOpen(false);
      form.reset();
      setTemporaryPhotos([]);
      toast({ title: "Serviço criado com sucesso!" });
    },
    onError: (error: any) => {
      console.error("Error creating service:", error);
      toast({ title: "Erro ao criar serviço", variant: "destructive" });
    },
  });

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
  };

  // Get count for period filters
  const getFilterCount = (period: string) => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    return services.filter(service => {
      if (!service.scheduledDate) return false;
      
      const serviceDate = parseISO(service.scheduledDate);
      
      switch (period) {
        case "hoje":
          return serviceDate >= startOfToday && serviceDate <= endOfToday;
        case "semana":
          const startWeek = startOfWeek(today, { weekStartsOn: 1 });
          const endWeek = endOfWeek(today, { weekStartsOn: 1 });
          return serviceDate >= startWeek && serviceDate <= endWeek;
        case "mes":
          const startMonth = startOfMonth(today);
          const endMonth = endOfMonth(today);
          return serviceDate >= startMonth && serviceDate <= endMonth;
        default:
          return services.length;
      }
    }).length;
  };

  

  if (servicesLoading || customersLoading || vehiclesLoading || techniciansLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
        <LoadingSpinner size="lg" text="Carregando dados do sistema..." />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header title="Agenda" />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {/* Top Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
              <p className="text-gray-600 text-sm mt-1">Gerencie seus agendamentos</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Calendar Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Calendário</h2>
                {/* View Mode Selector */}
                <div className="flex bg-gray-100 rounded-full p-1">
                  {[
                    { key: 'Month', label: 'Mês' },
                    { key: 'Week', label: 'Semana' },
                    { key: 'Day', label: 'Dia' }
                  ].map(mode => (
                    <Button
                      key={mode.key}
                      variant={viewMode === mode.key ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode(mode.key as any)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs",
                        viewMode === mode.key 
                          ? "bg-teal-600 text-white hover:bg-teal-700" 
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                      )}
                    >
                      {mode.label}
                    </Button>
                  ))}
                </div>
              </div>

              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-gray-900">
                    {format(currentDate, "MMMM yyyy", { locale: ptBR })}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePrevMonth}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNextMonth}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {viewMode === 'Month' && (
                    <div className="grid grid-cols-7 gap-1">
                      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
                        <div key={`header-${index}`} className="text-center text-sm font-medium text-gray-600 p-2">
                          {day}
                        </div>
                      ))}
                      {calendarDays.map((day, index) => (
                        <div
                          key={`day-${index}-${day.date.getTime()}`}
                          onClick={() => handleDayClick(day.date)}
                          className={cn(
                            "relative p-2 text-center cursor-pointer rounded-lg transition-colors min-h-[40px] flex items-center justify-center",
                            day.isCurrentMonth 
                              ? "text-gray-900 hover:bg-gray-100" 
                              : "text-gray-400",
                            day.isToday && "bg-teal-600 text-white hover:bg-teal-700",
                            day.services.length > 0 && !day.isToday && "bg-blue-50 border border-blue-200"
                          )}
                        >
                          <span className="text-sm">{format(day.date, "d")}</span>
                          {day.services.length > 0 && (
                            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-1">
                              {day.services.slice(0, 3).map((_, i) => (
                                <div key={i} className="w-1 h-1 bg-teal-500 rounded-full" />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {viewMode === 'Week' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-gray-600 pb-2">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
                          <div key={`week-header-${index}`}>{day}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                        {(() => {
                          const startWeekDay = startOfWeek(currentDate, { weekStartsOn: 0 });
                          const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startWeekDay, i));
                          return weekDays.map((day, index) => {
                            const dayServices = services.filter(service => 
                              service.scheduledDate && isSameDay(parseISO(service.scheduledDate), day)
                            );
                            return (
                              <div
                                key={`week-day-${index}`}
                                onClick={() => handleDayClick(day)}
                                className={cn(
                                  "p-3 rounded-lg cursor-pointer transition-colors min-h-[80px] border border-gray-200",
                                  isToday(day) && "bg-teal-600 text-white",
                                  dayServices.length > 0 && !isToday(day) && "bg-blue-50 border-blue-200",
                                  !dayServices.length && !isToday(day) && "hover:bg-gray-50"
                                )}
                              >
                                <div className="text-sm font-medium mb-1">{format(day, "d")}</div>
                                <div className="space-y-1">
                                  {dayServices.slice(0, 2).map(service => (
                                    <div key={service.id} className="text-xs bg-teal-500 text-white px-1 py-0.5 rounded truncate">
                                      {service.customer.name}
                                    </div>
                                  ))}
                                  {dayServices.length > 2 && (
                                    <div className="text-xs text-gray-500">+{dayServices.length - 2} mais</div>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}

                  {viewMode === 'Day' && (
                    <div className="space-y-3">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {(() => {
                          const dayServices = services.filter(service => 
                            service.scheduledDate && isSameDay(parseISO(service.scheduledDate), currentDate)
                          ).sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));
                          
                          if (dayServices.length === 0) {
                            return (
                              <div className="text-center py-8 text-gray-500">
                                <Calendar className="h-12 w-12 mx-auto mb-3" />
                                <p>Nenhum agendamento para este dia</p>
                              </div>
                            );
                          }

                          return dayServices.map(service => (
                            <Card 
                              key={service.id} 
                              className="bg-white border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                              onClick={() => setLocation(`/services?openModal=true&serviceId=${service.id}`)}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="font-medium text-gray-900 text-sm">{service.customer.name}</h4>
                                  <Badge className={cn(
                                    "text-xs",
                                    service.status === 'completed' && "bg-emerald-100 text-emerald-800",
                                    service.status === 'in_progress' && "bg-blue-100 text-blue-800",
                                    service.status === 'scheduled' && "bg-orange-100 text-orange-800",
                                    service.status === 'cancelled' && "bg-red-100 text-red-800"
                                  )}>
                                    {translateStatus(service.status)}
                                  </Badge>
                                </div>
                                <p className="text-gray-600 text-xs">
                                  <Clock className="inline h-3 w-3 mr-1" />
                                  {service.scheduledTime || "Horário não definido"}
                                </p>
                                <p className="text-gray-600 text-xs">
                                  <Car className="inline h-3 w-3 mr-1" />
                                  {service.vehicle.brand} {service.vehicle.model}
                                </p>
                              </CardContent>
                            </Card>
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Appointments List Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Agendamentos</h2>
                {/* Period Filter Dropdown */}
                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                  <SelectTrigger className="w-40 bg-white border-gray-300 text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300">
                    <SelectItem value="hoje">Hoje ({getFilterCount("hoje")})</SelectItem>
                    <SelectItem value="semana">Esta Semana ({getFilterCount("semana")})</SelectItem>
                    <SelectItem value="mes">Este Mês ({getFilterCount("mes")})</SelectItem>
                    <SelectItem value="todos">Todos ({services.length})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {filteredServices.length === 0 ? (
                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardContent className="p-6 text-center">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhum agendamento encontrado</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredServices.map(service => (
                    <Card 
                      key={service.id} 
                      className="bg-white border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer shadow-sm"
                      onClick={() => setLocation(`/services?openModal=true&serviceId=${service.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900">
                            {service.customer.name}
                          </h3>
                          <Badge 
                            className={cn(
                              "text-xs",
                              service.status === 'completed' && "bg-emerald-100 text-emerald-800",
                              service.status === 'in_progress' && "bg-blue-100 text-blue-800",
                              service.status === 'scheduled' && "bg-orange-100 text-orange-800",
                              service.status === 'cancelled' && "bg-red-100 text-red-800"
                            )}
                          >
                            {translateStatus(service.status)}
                          </Badge>
                        </div>
                        <p className="text-gray-600 text-sm mb-1">
                          <Clock className="inline h-3 w-3 mr-1" />
                          {service.scheduledTime || "Horário não definido"}
                        </p>
                        <p className="text-gray-600 text-sm">
                          <Car className="inline h-3 w-3 mr-1" />
                          {service.vehicle.brand} {service.vehicle.model} - {service.vehicle.licensePlate}
                        </p>
                        {service.serviceType && (
                          <p className="text-teal-600 text-sm mt-1">
                            {service.serviceType.name}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Floating Action Button */}
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
              }
            }
          }}>
            <DialogTrigger asChild>
              <Button
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-teal-600 hover:bg-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 z-50"
                size="sm"
                onClick={() => {
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
                <Plus className="h-6 w-6" />
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50/30">
              <DialogHeader className="pb-6">
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-transparent">
                  Nova Ordem de Serviço
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
                          {customersLoading ? (
                            <div className="py-8">
                              <LoadingSpinner size="md" text="Carregando clientes..." />
                            </div>
                          ) : (
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
                          )}
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
                            {vehiclesLoading ? (
                              <div className="py-8">
                                <LoadingSpinner size="md" text="Carregando veículos..." />
                              </div>
                            ) : (
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
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="technicianId"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                          <User className="h-4 w-4 mr-2 text-teal-600" />
                          Técnico Responsável
                        </FormLabel>
                        {techniciansLoading ? (
                          <div className="py-8">
                            <LoadingSpinner size="md" text="Carregando técnicos..." />
                          </div>
                        ) : (
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
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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

                  {/* Services Section */}
                  <div className="col-span-2 border-t pt-4">
                    <h4 className="text-lg font-semibold text-slate-700 mb-4 flex items-center">
                      <Wrench className="h-5 w-5 mr-2 text-teal-600" />
                      Serviços
                    </h4>
                    <ServiceItems
                      onChange={(items) => {
                        console.log('Schedule page - Received items from ServiceItems:', items);
                        setServiceExtras(items);
                      }}
                      initialItems={serviceExtras}
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
                            <div className="text-sm font-bold text-slate-800 mb-3">Serviços:</div>
                            <div className="space-y-2">
                              {/* Serviços selecionados */}
                              {serviceExtras.length > 0 ? serviceExtras.map((extra, index) => {
                                // Buscar o nome do tipo de serviço no array serviceTypes
                                const serviceType = serviceTypes.find(st => st.id === extra.serviceTypeId);
                                const serviceName = serviceType?.name || `Serviço ${index + 1}`;
                                const servicePrice = extra.totalPrice || extra.unitPrice || "0.00";

                                return (
                                  <div key={extra.tempId || index} className="flex justify-between items-center text-sm">
                                    <span className="text-slate-700">{serviceName}</span>
                                    <span className="font-medium text-slate-800">R$ {Number(servicePrice).toFixed(2)}</span>
                                  </div>
                                );
                              }) : (
                                <div className="text-sm text-slate-500 italic">
                                  Nenhum serviço selecionado
                                </div>
                              )}
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
                      </div>

                      {/* Reminder Section */}
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center mb-3">
                          <Bell className="h-5 w-5 text-yellow-600 mr-2" />
                          <span className="font-medium text-yellow-800">Lembrete de Serviço</span>
                        </div>

                        <FormField
                          control={form.control}
                          name="reminderEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border border-yellow-300 p-3 shadow-sm">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm font-medium">
                                  Ativar lembrete de notificação
                                </FormLabel>
                                <div className="text-xs text-yellow-700">
                                  Receba uma notificação antes do horário do serviço
                                </div>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value || false}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        {form.watch("reminderEnabled") && (
                          <FormField
                            control={form.control}
                            name="reminderMinutes"
                            render={({ field }) => (
                              <FormItem className="mt-3">
                                <FormLabel>Enviar lembrete (minutos antes)</FormLabel>
                                <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString() || "30"}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione quando enviar o lembrete" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="15">15 minutos antes</SelectItem>
                                    <SelectItem value="30">30 minutos antes</SelectItem>
                                    <SelectItem value="60">1 hora antes</SelectItem>
                                    <SelectItem value="120">2 horas antes</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        if (hasUnsavedChanges || temporaryPhotos.length > 0 || serviceExtras.length > 0) {
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
                          });
                        } else {
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
                        }
                      }}
                      className="px-6 py-2 font-medium"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-2 font-semibold"
                      disabled={createMutation.isPending}
                    >
                      Criar Serviço
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Multiple Appointments Modal */}
          <Dialog open={isDayAppointmentsModalOpen} onOpenChange={setIsDayAppointmentsModalOpen}>
            <DialogContent className="bg-white border-gray-300 text-gray-900 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-gray-900">
                  Agendamentos para {selectedDate && format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {selectedDayServices.map(service => (
                  <Card 
                    key={service.id} 
                    className="bg-gray-50 border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => {
                      setIsDayAppointmentsModalOpen(false);
                      setLocation(`/services?openModal=true&serviceId=${service.id}`);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">
                          {service.customer.name}
                        </h3>
                        <Badge 
                          className={cn(
                            "text-xs",
                            service.status === 'completed' && "bg-emerald-100 text-emerald-800",
                            service.status === 'in_progress' && "bg-blue-100 text-blue-800",
                            service.status === 'scheduled' && "bg-orange-100 text-orange-800",
                            service.status === 'cancelled' && "bg-red-100 text-red-800"
                          )}
                        >
                          {translateStatus(service.status)}
                        </Badge>
                      </div>
                      <p className="text-gray-600 text-sm mb-1">
                        <Clock className="inline h-3 w-3 mr-1" />
                        {service.scheduledTime || "Horário não definido"}
                      </p>
                      <p className="text-gray-600 text-sm">
                        <Car className="inline h-3 w-3 mr-1" />
                        {service.vehicle.brand} {service.vehicle.model} - {service.vehicle.licensePlate}
                      </p>
                      {service.serviceType && (
                        <p className="text-teal-600 text-sm mt-1">
                          {service.serviceType.name}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          {/* Dialog de confirmação de alterações não salvas */}
          <UnsavedChangesDialog
            isOpen={unsavedChanges.showConfirmDialog}
            onConfirm={unsavedChanges.confirmNavigation}
            onCancel={unsavedChanges.cancelNavigation}
            message={unsavedChanges.message}
          />
        </main>
      </div>
    </div>
  );
}
