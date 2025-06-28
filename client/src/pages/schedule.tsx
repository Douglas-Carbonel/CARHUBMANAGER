
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, User, Car, Camera, Bell, DollarSign, Calculator, Smartphone, Banknote, CreditCard, Receipt } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceSchema, type Service, type Customer, type Vehicle, type ServiceType, type Photo } from "@shared/schema";
import { z } from "zod";
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isToday, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import ServiceItems from "@/components/service/service-items";
import PaymentManager from "@/components/service/payment-manager";
import PhotoUpload from "@/components/photos/photo-upload";
import CameraCapture from "@/components/camera/camera-capture";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

// Utility functions
const formatCurrency = (value: string): string => {
  if (!value) return '';
  let numericValue = value.replace(/[^\d]/g, '');
  if (!numericValue) return '';
  const numberValue = parseInt(numericValue) / 100;
  return numberValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

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
  const numericValue = formattedValue.replace(/[^\d]/g, '');
  if (!numericValue) return '0.00';
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
  const [temporaryPhotos, setTemporaryPhotos] = useState<Array<{ photo: string; category: string }>>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethods>({
    pix: "",
    dinheiro: "",
    cheque: "",
    cartao: ""
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
      valorPago: "0.00",
      pixPago: "0.00",
      dinheiroPago: "0.00",
      chequePago: "0.00",
      cartaoPago: "0.00",
      reminderEnabled: false,
      reminderMinutes: 15,
    },
  });

  // Fetch data
  const { data: services = [], isLoading: servicesLoading } = useQuery<(Service & { customer: Customer; vehicle: Vehicle; serviceType: ServiceType })[]>({
    queryKey: ["/api/services"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: vehicles = [] } = useQuery<(Vehicle & { customer: Customer })[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: serviceTypes = [] } = useQuery<ServiceType[]>({
    queryKey: ["/api/service-types"],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
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

  const createServiceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof serviceFormSchema>) => {
      const formattedData = {
        ...data,
        valorPago: parseCurrency(data.valorPago || "0"),
        serviceExtras: serviceExtras.map(extra => ({
          unifiedServiceId: extra.unifiedServiceId,
          valor: parseCurrency(extra.valor || "0"),
          observacao: extra.observacao || "",
        }))
      };

      return await apiRequest('/api/services', 'POST', formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsAddModalOpen(false);
      form.reset();
      setServiceExtras([]);
      toast({
        title: "Sucesso",
        description: "Ordem de serviço criada com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar ordem de serviço",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: z.infer<typeof serviceFormSchema>) => {
    createServiceMutation.mutate(data);
  };

  if (servicesLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-900">Carregando...</div>
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
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-teal-600 hover:bg-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 z-50"
            size="sm"
          >
            <Plus className="h-6 w-6" />
          </Button>

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

          {/* Add Service Modal */}
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogContent className="bg-white border-gray-300 text-gray-900 max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-gray-900">Nova Ordem de Serviço</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Informações Básicas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="customerId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700">Cliente</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                              <FormControl>
                                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                                  <SelectValue placeholder="Selecione um cliente" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-white border-gray-300">
                                {customers.map((customer) => (
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
                            <FormLabel className="text-gray-700">Veículo</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                              <FormControl>
                                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                                  <SelectValue placeholder="Selecione um veículo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-white border-gray-300">
                                {vehicles.map((vehicle) => (
                                  <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                                    {vehicle.brand} {vehicle.model} - {vehicle.licensePlate}
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
                        name="scheduledDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700">Data</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field} 
                                className="bg-white border-gray-300 text-gray-900"
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
                            <FormLabel className="text-gray-700">Horário</FormLabel>
                            <FormControl>
                              <Input 
                                type="time" 
                                {...field} 
                                className="bg-white border-gray-300 text-gray-900"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="technicianId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700">Técnico</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                              <FormControl>
                                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                                  <SelectValue placeholder="Selecione um técnico" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-white border-gray-300">
                                {users.map((user) => (
                                  <SelectItem key={user.id} value={user.id.toString()}>
                                    {user.firstName} {user.lastName}
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
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700">Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue="scheduled">
                              <FormControl>
                                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-white border-gray-300">
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

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Observações</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Observações sobre o serviço"
                              className="bg-white border-gray-300 text-gray-900"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Service Items */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Serviços</h3>
                    <ServiceItems 
                      serviceExtras={serviceExtras}
                      setServiceExtras={setServiceExtras}
                    />
                  </div>

                  {/* Photos Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Fotos</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCameraOpen(true)}
                        className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Câmera
                      </Button>
                      <PhotoUpload
                        onPhotoCapture={(photo, category) => {
                          setTemporaryPhotos(prev => [...prev, { photo, category }]);
                        }}
                      />
                    </div>
                    
                    {temporaryPhotos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {temporaryPhotos.map((photo, index) => (
                          <div key={index} className="relative">
                            <img src={photo.photo} alt={`Foto ${index + 1}`} className="w-full h-20 object-cover rounded" />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 h-6 w-6 p-0"
                              onClick={() => setTemporaryPhotos(prev => prev.filter((_, i) => i !== index))}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Payment Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Pagamento</h3>
                    <PaymentManager
                      pixPago={form.watch('pixPago') || '0.00'}
                      dinheiroPago={form.watch('dinheiroPago') || '0.00'}
                      chequePago={form.watch('chequePago') || '0.00'}
                      cartaoPago={form.watch('cartaoPago') || '0.00'}
                      onPaymentChange={(field, value) => {
                        form.setValue(field as any, value);
                      }}
                      isPaymentModalOpen={isPaymentModalOpen}
                      setIsPaymentModalOpen={setIsPaymentModalOpen}
                    />
                  </div>

                  {/* Notifications Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Notificações</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="reminderEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200 p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base text-gray-900">Lembrete</FormLabel>
                              <div className="text-sm text-gray-600">
                                Receber notificação antes do agendamento
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {form.watch('reminderEnabled') && (
                        <FormField
                          control={form.control}
                          name="reminderMinutes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700">Minutos de antecedência</FormLabel>
                              <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue="15">
                                <FormControl>
                                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-white border-gray-300">
                                  <SelectItem value="15">15 minutos</SelectItem>
                                  <SelectItem value="30">30 minutos</SelectItem>
                                  <SelectItem value="60">1 hora</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => setIsAddModalOpen(false)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createServiceMutation.isPending}
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      {createServiceMutation.isPending ? "Salvando..." : "Salvar Agendamento"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Camera Modal */}
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
        </main>
      </div>
    </div>
  );
}
