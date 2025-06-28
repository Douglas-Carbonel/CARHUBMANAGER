
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
import { Calendar, DollarSign, MoreHorizontal, Plus, Search, Edit, Trash2, Clock, User, Car, Wrench, CheckCircle, XCircle, Timer, BarChart3, FileText, Camera, Coins, Calculator, Smartphone, Banknote, CreditCard, Receipt, Bell, ChevronLeft, ChevronRight, MapPin, Phone, Star, TrendingUp, Activity, AlertCircle } from "lucide-react";
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
      setSelectedDate(date);
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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Calendar Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-2 rounded-lg mr-3">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  Calendário
                </h2>
                {/* View Mode Selector */}
                <div className="flex bg-gray-100 rounded-xl p-1 shadow-inner">
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
                        "rounded-lg px-4 py-2 text-xs font-medium transition-all duration-200",
                        viewMode === mode.key 
                          ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md hover:from-teal-600 hover:to-emerald-600" 
                          : "text-gray-600 hover:text-gray-900 hover:bg-white"
                      )}
                    >
                      {mode.label}
                    </Button>
                  ))}
                </div>
              </div>

              <Card className="bg-gradient-to-br from-white via-gray-50 to-blue-50/30 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100/50 bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-t-lg">
                  <CardTitle className="text-gray-900 font-bold text-lg">
                    {format(currentDate, "MMMM yyyy", { locale: ptBR })}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePrevMonth}
                      className="text-gray-600 hover:text-gray-900 hover:bg-white/80 rounded-full h-9 w-9 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNextMonth}
                      className="text-gray-600 hover:text-gray-900 hover:bg-white/80 rounded-full h-9 w-9 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {viewMode === 'Month' && (
                    <div className="grid grid-cols-7 gap-2">
                      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
                        <div key={`header-${index}`} className="text-center text-sm font-semibold text-gray-700 p-3 bg-gradient-to-r from-slate-100 to-blue-100/50 rounded-lg mb-2">
                          {day}
                        </div>
                      ))}
                      {calendarDays.map((day, index) => (
                        <div
                          key={`day-${index}-${day.date.getTime()}`}
                          onClick={() => handleDayClick(day.date)}
                          className={cn(
                            "relative p-2 text-center cursor-pointer rounded-xl transition-all duration-200 min-h-[80px] flex flex-col justify-start hover:scale-105 hover:shadow-lg border-2",
                            day.isCurrentMonth 
                              ? "text-gray-900 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 border-gray-100" 
                              : "text-gray-400 hover:bg-gray-50 border-gray-100",
                            day.isToday && "bg-gradient-to-br from-teal-500 to-emerald-500 text-white hover:from-teal-600 hover:to-emerald-600 shadow-lg font-bold border-teal-300",
                            day.services.length > 0 && !day.isToday && "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300 shadow-md"
                          )}
                        >
                          <div className="flex items-center justify-between w-full mb-2">
                            <span className="text-sm font-medium">{format(day.date, "d")}</span>
                            {day.services.length > 0 && (
                              <div className={cn(
                                "rounded-full px-1.5 py-0.5 text-xs font-bold min-w-[18px] h-[18px] flex items-center justify-center",
                                day.isToday ? "bg-white/20 text-white" : "bg-teal-500 text-white"
                              )}>
                                {day.services.length}
                              </div>
                            )}
                          </div>
                          
                          {day.services.length > 0 && (
                            <div className="flex-1 w-full space-y-1">
                              {day.services.length <= 3 ? (
                                // Mostra até 3 agendamentos como barrinhas
                                day.services.map((service, i) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      "w-full h-1.5 rounded-full shadow-sm",
                                      day.isToday ? "bg-white/30" : 
                                      service.status === "completed" ? "bg-green-500" :
                                      service.status === "in_progress" ? "bg-yellow-500" :
                                      service.status === "cancelled" ? "bg-red-500" :
                                      "bg-blue-500"
                                    )}
                                    title={`${service.customer.name} - ${service.scheduledTime || 'Sem horário'}`}
                                  />
                                ))
                              ) : (
                                // Para mais de 3 agendamentos, mostra 2 barrinhas + indicador
                                <>
                                  {day.services.slice(0, 2).map((service, i) => (
                                    <div
                                      key={i}
                                      className={cn(
                                        "w-full h-1.5 rounded-full shadow-sm",
                                        day.isToday ? "bg-white/30" : 
                                        service.status === "completed" ? "bg-green-500" :
                                        service.status === "in_progress" ? "bg-yellow-500" :
                                        service.status === "cancelled" ? "bg-red-500" :
                                        "bg-blue-500"
                                      )}
                                      title={`${service.customer.name} - ${service.scheduledTime || 'Sem horário'}`}
                                    />
                                  ))}
                                  <div className={cn(
                                    "w-full h-1.5 rounded-full flex items-center justify-center text-[9px] font-bold",
                                    day.isToday ? "bg-white/20 text-white" : "bg-gray-400 text-white"
                                  )}>
                                    +{day.services.length - 2}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {viewMode === 'Week' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-7 gap-2 text-center text-sm font-semibold text-gray-700">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
                          <div key={`week-header-${index}`} className="bg-gradient-to-r from-slate-100 to-blue-100/50 rounded-lg p-2 font-bold">{day}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                        {(() => {
                          // Calcula a semana que contém a data atual, começando sempre no domingo
                          const today = new Date();
                          const startWeekDay = startOfWeek(today, { weekStartsOn: 0 });
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
                                  "p-2 rounded-xl cursor-pointer transition-all duration-200 min-h-[180px] border-2 hover:shadow-lg hover:scale-[1.01] flex flex-col",
                                  isToday(day) && "bg-gradient-to-br from-teal-500 to-emerald-500 text-white border-teal-300 shadow-lg",
                                  dayServices.length > 0 && !isToday(day) && "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300 shadow-md",
                                  !dayServices.length && !isToday(day) && "border-gray-200 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50"
                                )}
                              >
                                {/* Header do dia */}
                                <div className="flex items-center justify-between mb-2 pb-2 border-b border-opacity-20" style={{borderColor: isToday(day) ? 'white' : '#e5e7eb'}}>
                                  <div className="text-lg font-bold">{format(day, "d")}</div>
                                  {dayServices.length > 0 && (
                                    <div className={cn(
                                      "rounded-full px-2 py-1 text-xs font-bold min-w-[20px] h-[20px] flex items-center justify-center",
                                      isToday(day) ? "bg-white/30 text-white" : "bg-teal-500 text-white"
                                    )}>
                                      {dayServices.length}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Lista de agendamentos */}
                                <div className="flex-1 space-y-2 overflow-y-auto">
                                  {dayServices.length === 0 ? (
                                    <div className={cn(
                                      "text-xs text-center opacity-60 mt-4",
                                      isToday(day) ? "text-white" : "text-gray-500"
                                    )}>
                                      Sem agendamentos
                                    </div>
                                  ) : (
                                    dayServices.map((service, serviceIndex) => (
                                      <div 
                                        key={service.id} 
                                        className={cn(
                                          "text-xs p-2 rounded-lg border transition-all duration-200 hover:scale-105",
                                          isToday(day) 
                                            ? "bg-white/20 border-white/30 text-white" 
                                            : "bg-white border-blue-200 text-gray-700 shadow-sm hover:shadow-md"
                                        )}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setLocation(`/services?openModal=true&serviceId=${service.id}`);
                                        }}
                                      >
                                        {/* Horário destacado */}
                                        {service.scheduledTime && (
                                          <div className={cn(
                                            "text-xs font-bold mb-1 text-center py-1 px-2 rounded-md",
                                            isToday(day) 
                                              ? "bg-white/20 text-white" 
                                              : "bg-blue-100 text-blue-800"
                                          )}>
                                            {service.scheduledTime.substring(0, 5)}
                                          </div>
                                        )}
                                        
                                        {/* Nome do cliente */}
                                        <div className={cn(
                                          "font-semibold text-center mb-1 text-[11px]",
                                          isToday(day) ? "text-white" : "text-gray-900"
                                        )}>
                                          {service.customer.name}
                                        </div>
                                        
                                        {/* Tipo de serviço */}
                                        <div className={cn(
                                          "text-[10px] text-center opacity-80",
                                          isToday(day) ? "text-white" : "text-gray-600"
                                        )}>
                                          {service.serviceType?.name || 'Serviço Geral'}
                                        </div>
                                        
                                        {/* Veículo */}
                                        <div className={cn(
                                          "text-[9px] text-center opacity-70 mt-1",
                                          isToday(day) ? "text-white" : "text-gray-500"
                                        )}>
                                          {service.vehicle.brand} {service.vehicle.model}
                                        </div>
                                        
                                        {/* Status indicator */}
                                        <div className="flex justify-center mt-1">
                                          <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            service.status === "completed" ? "bg-green-400" :
                                            service.status === "in_progress" ? "bg-yellow-400" :
                                            service.status === "cancelled" ? "bg-red-400" :
                                            isToday(day) ? "bg-white/50" : "bg-blue-400"
                                          )} />
                                        </div>
                                      </div>
                                    ))
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
                    <div className="space-y-4">
                      <div className="text-center bg-gradient-to-r from-slate-100 to-blue-100/50 rounded-xl p-4">
                        <h3 className="text-lg font-bold text-gray-900">
                          {format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </h3>
                      </div>
                      <div className="space-y-3">
                        {(() => {
                          const dayServices = services.filter(service => 
                            service.scheduledDate && isSameDay(parseISO(service.scheduledDate), currentDate)
                          ).sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));
                          
                          if (dayServices.length === 0) {
                            return (
                              <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl">
                                <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-4 rounded-full w-16 h-16 mx-auto mb-4">
                                  <Calendar className="h-8 w-8 text-white mx-auto" />
                                </div>
                                <p className="text-gray-600 font-medium">Nenhum agendamento para este dia</p>
                              </div>
                            );
                          }

                          return dayServices.map(service => (
                            <Card 
                              key={service.id} 
                              className="bg-gradient-to-r from-white to-blue-50/30 border-0 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer transform hover:-translate-y-1"
                              onClick={() => setLocation(`/services?openModal=true&serviceId=${service.id}`)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-bold text-gray-900">{service.customer.name}</h4>
                                  <Badge className={cn(
                                    "text-xs font-medium",
                                    service.status === 'completed' && "bg-gradient-to-r from-emerald-500 to-green-500 text-white",
                                    service.status === 'in_progress' && "bg-gradient-to-r from-blue-500 to-indigo-500 text-white",
                                    service.status === 'scheduled' && "bg-gradient-to-r from-orange-500 to-yellow-500 text-white",
                                    service.status === 'cancelled' && "bg-gradient-to-r from-red-500 to-pink-500 text-white"
                                  )}>
                                    {translateStatus(service.status)}
                                  </Badge>
                                </div>
                                <p className="text-gray-600 text-sm mb-1 flex items-center">
                                  <Clock className="inline h-3 w-3 mr-2" />
                                  {service.scheduledTime || "Horário não definido"}
                                </p>
                                <p className="text-gray-600 text-sm flex items-center">
                                  <Car className="inline h-3 w-3 mr-2" />
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
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-2 rounded-lg mr-3">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  Agendamentos
                </h2>
                {/* Period Filter Dropdown */}
                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                  <SelectTrigger className="w-44 bg-white border-2 border-gray-200 text-gray-900 shadow-md hover:shadow-lg transition-all duration-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="hoje">Hoje ({getFilterCount("hoje")})</SelectItem>
                    <SelectItem value="semana">Esta Semana ({getFilterCount("semana")})</SelectItem>
                    <SelectItem value="mes">Este Mês ({getFilterCount("mes")})</SelectItem>
                    <SelectItem value="todos">Todos ({services.length})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {filteredServices.length === 0 ? (
                <Card className="bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/20 border-0 shadow-xl">
                  <CardContent className="p-12 text-center">
                    <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-6 rounded-full w-20 h-20 mx-auto mb-6">
                      <Calendar className="h-8 w-8 text-white mx-auto" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-700 mb-3">Nenhum agendamento</h3>
                    <p className="text-gray-500 mb-4">Não há agendamentos para o período selecionado</p>
                    <div className="flex justify-center">
                      <Button
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

                          form.reset(defaultValues);
                          setServiceExtras([]);
                          setInitialServiceExtras([]);
                          setFormInitialValues(defaultValues);
                          setPaymentMethods({
                            pix: "",
                            dinheiro: "",
                            cheque: "",
                            cartao: ""
                          });
                          setIsAddModalOpen(true);
                        }}
                        className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white px-6 py-2 shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Primeiro Agendamento
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {filteredServices.map(service => (
                    <Card 
                      key={service.id} 
                      className="bg-gradient-to-r from-white via-blue-50/30 to-purple-50/20 border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group transform hover:-translate-y-1"
                      onClick={() => setLocation(`/services?openModal=true&serviceId=${service.id}`)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 group-hover:text-teal-700 transition-colors text-lg mb-1">
                              {service.customer.name}
                            </h3>
                            <div className="flex items-center text-gray-600 text-sm mb-1">
                              <Clock className="h-4 w-4 mr-2 text-teal-500" />
                              {service.scheduledTime || "Horário não definido"}
                            </div>
                          </div>
                          <Badge 
                            className={cn(
                              "text-xs font-semibold shadow-md",
                              service.status === 'completed' && "bg-gradient-to-r from-emerald-500 to-green-500 text-white",
                              service.status === 'in_progress' && "bg-gradient-to-r from-blue-500 to-indigo-500 text-white",
                              service.status === 'scheduled' && "bg-gradient-to-r from-orange-500 to-yellow-500 text-white",
                              service.status === 'cancelled' && "bg-gradient-to-r from-red-500 to-pink-500 text-white"
                            )}
                          >
                            {translateStatus(service.status)}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <div className="flex items-center text-gray-600 text-sm">
                            <Car className="h-4 w-4 mr-2 text-indigo-500" />
                            <span className="font-medium">{service.vehicle.brand} {service.vehicle.model}</span>
                          </div>
                          <div className="flex items-center text-gray-600 text-sm">
                            <MapPin className="h-4 w-4 mr-2 text-purple-500" />
                            <span className="font-medium">{service.vehicle.licensePlate}</span>
                          </div>
                        </div>

                        {service.serviceType && (
                          <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-lg p-3 mb-3">
                            <div className="flex items-center text-teal-700 text-sm font-semibold">
                              <Wrench className="h-4 w-4 mr-2" />
                              {service.serviceType.name}
                            </div>
                          </div>
                        )}

                        {service.estimatedValue && (
                          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                            <span className="text-gray-600 text-sm">Valor Estimado:</span>
                            <span className="font-bold text-green-600">
                              R$ {Number(service.estimatedValue).toFixed(2)}
                            </span>
                          </div>
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
                className="fixed bottom-6 right-6 h-16 w-16 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 z-50 transform hover:scale-110"
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
                <Plus className="h-7 w-7" />
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-gradient-to-br from-slate-50 to-blue-50/30">
              <DialogHeader className="pb-6">
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-transparent">
                  Novo Serviço
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                const numValue = parseInt(value);
                                field.onChange(numValue);
                                form.setValue("vehicleId", 0);
                              }}
                              value={field.value ? field.value.toString() : ""}
                            >
                              <FormControl>
                                <SelectTrigger className="h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md">
                                  <SelectValue placeholder="Selecione um cliente" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {customersLoading ? (
                                  <SelectItem value="loading" disabled>Carregando...</SelectItem>
                                ) : customers && customers.length > 0 ? (
                                  customers.map((customer: Customer) => (
                                    <SelectItem key={customer.id} value={customer.id.toString()}>
                                      {customer.name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="empty" disabled>Nenhum cliente encontrado</SelectItem>
                                )}
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
                          const getCustomerVehicles = (customerId: number) => {
                            if (!customerId || !vehicles) return [];
                            const customerVehicles = vehicles.filter((v: any) => v.customerId === customerId);
                            return customerVehicles;
                          };

                          return (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                                <Car className="h-4 w-4 mr-2 text-teal-600" />
                                Veículo
                              </FormLabel>
                              <Select 
                                onValueChange={(value) => {
                                  const numValue = parseInt(value);
                                  field.onChange(numValue);
                                }}
                                value={field.value ? field.value.toString() : ""}
                                disabled={!selectedCustomerId}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md disabled:opacity-50">
                                    <SelectValue placeholder={!selectedCustomerId ? "Selecione um cliente primeiro" : "Selecione um veículo"} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {!selectedCustomerId ? (
                                    <SelectItem value="no-customer" disabled>Selecione um cliente primeiro</SelectItem>
                                  ) : vehiclesLoading ? (
                                    <SelectItem value="loading" disabled>Carregando...</SelectItem>
                                  ) : getCustomerVehicles(selectedCustomerId).length > 0 ? (
                                    getCustomerVehicles(selectedCustomerId).map((vehicle: any) => (
                                      <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                                        {vehicle.brand} {vehicle.model} - {vehicle.licensePlate}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="empty" disabled>Nenhum veículo encontrado para este cliente</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
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
                          <Select 
                            onValueChange={(value) => {
                              const numValue = parseInt(value);
                              field.onChange(numValue);
                            }}
                            value={field.value ? field.value.toString() : ""}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md">
                                <SelectValue placeholder="Selecione o técnico" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {techniciansLoading ? (
                                <SelectItem value="loading" disabled>Carregando...</SelectItem>
                              ) : users && users.length > 0 ? (
                                users.map((user: any) => (
                                  <SelectItem key={user.id} value={user.id.toString()}>
                                    {user.firstName} {user.lastName} ({user.username})
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="empty" disabled>Nenhum técnico encontrado</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="scheduledDate"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                              <Calendar className="h-4 w-4 mr-2 text-teal-600" />
                              Data Agendada
                            </FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="date" 
                                value={field.value || ""}
                                className="h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md text-base"
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
                          <FormItem className="space-y-2">
                            <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                              <Clock className="h-4 w-4 mr-2 text-teal-600" />
                              Horário
                            </FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="time" 
                                value={field.value || ""}
                                className="h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md text-base"
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
                        <FormItem className="space-y-2">
                          <FormLabel className="text-sm font-semibold text-slate-700">Observações</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              rows={3} 
                              placeholder="Observações sobre o serviço..." 
                              value={field.value || ""}
                              className="border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md resize-none"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Services Section */}
                    <div>
                      <Card className="border border-gray-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium text-gray-700">Serviços</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ServiceItems
                            onChange={(items) => {
                              setServiceExtras(items);
                            }}
                            initialItems={[]}
                          />
                        </CardContent>
                      </Card>
                    </div>

                    {/* Service Summary */}
                    {serviceExtras.length > 0 && (
                      <Card className="border border-emerald-200 bg-emerald-50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium text-emerald-800">Resumo do Serviço</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-emerald-800 mb-1">Serviços Selecionados:</div>
                            {serviceExtras.map((extra, index) => (
                              <div key={index} className="flex justify-between items-center text-xs">
                                <span className="text-emerald-700">{extra.serviceExtra?.name || extra.descricao}:</span>
                                <span className="font-medium text-emerald-700">
                                  R$ {Number(extra.valor || 0).toFixed(2)}
                                </span>
                              </div>
                            ))}
                            <div className="border-t border-emerald-400 mt-2 pt-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-emerald-800">Valor Total:</span>
                                <span className="text-sm font-bold text-emerald-800">
                                  R$ {calculateTotalValue()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

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
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit"
                        className="bg-primary hover:bg-primary/90"
                        disabled={createMutation.isPending || serviceExtras.length === 0}
                      >
                        {createMutation.isPending ? "Criando..." : "Criar Serviço"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </DialogContent>
          </Dialog>

          {/* Enhanced Multiple Appointments Modal */}
          <Dialog open={isDayAppointmentsModalOpen} onOpenChange={setIsDayAppointmentsModalOpen}>
            <DialogContent className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 border-0 shadow-2xl max-w-lg">
              <DialogHeader className="pb-4 border-b border-gray-100">
                <DialogTitle className="text-xl font-bold bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-transparent flex items-center">
                  <Calendar className="h-6 w-6 mr-3 text-teal-600" />
                  Agendamentos - {selectedDate && format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
                </DialogTitle>
                <p className="text-gray-600 text-sm mt-2">
                  {selectedDayServices.length} agendamento{selectedDayServices.length !== 1 ? 's' : ''} para este dia
                </p>
              </DialogHeader>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {selectedDayServices.map((service, index) => (
                  <Card 
                    key={service.id} 
                    className="bg-gradient-to-r from-white to-blue-50/50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group transform hover:-translate-y-1"
                    onClick={() => {
                      setIsDayAppointmentsModalOpen(false);
                      setLocation(`/services?openModal=true&serviceId=${service.id}`);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 group-hover:text-teal-700 transition-colors mb-1">
                            {service.customer.name}
                          </h3>
                          <div className="flex items-center text-gray-600 text-sm mb-1">
                            <Clock className="h-3 w-3 mr-2 text-teal-500" />
                            {service.scheduledTime || "Horário não definido"}
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <Badge 
                            className={cn(
                              "text-xs font-semibold",
                              service.status === 'completed' && "bg-gradient-to-r from-emerald-500 to-green-500 text-white",
                              service.status === 'in_progress' && "bg-gradient-to-r from-blue-500 to-indigo-500 text-white",
                              service.status === 'scheduled' && "bg-gradient-to-r from-orange-500 to-yellow-500 text-white",
                              service.status === 'cancelled' && "bg-gradient-to-r from-red-500 to-pink-500 text-white"
                            )}
                          >
                            {translateStatus(service.status)}
                          </Badge>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            #{index + 1}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2 mb-3">
                        <div className="flex items-center text-gray-600 text-sm">
                          <Car className="h-3 w-3 mr-2 text-indigo-500" />
                          <span className="font-medium">{service.vehicle.brand} {service.vehicle.model}</span>
                        </div>
                        <div className="flex items-center text-gray-600 text-sm">
                          <MapPin className="h-3 w-3 mr-2 text-purple-500" />
                          <span className="font-medium">{service.vehicle.licensePlate}</span>
                        </div>
                      </div>

                      {service.serviceType && (
                        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-lg p-2">
                          <div className="flex items-center text-teal-700 text-xs font-semibold">
                            <Wrench className="h-3 w-3 mr-2" />
                            {service.serviceType.name}
                          </div>
                        </div>
                      )}

                      {service.estimatedValue && (
                        <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-200">
                          <span className="text-gray-600 text-xs">Valor:</span>
                          <span className="font-bold text-green-600 text-sm">
                            R$ {Number(service.estimatedValue).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="pt-4 border-t border-gray-100">
                <Button
                  onClick={() => setIsDayAppointmentsModalOpen(false)}
                  className="w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white"
                >
                  Fechar
                </Button>
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
