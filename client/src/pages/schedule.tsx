import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { Label } from "@/components/ui/label";
import { Plus, Search, Edit, Trash2, Calendar, Clock, User, Car, Wrench, Calculator, Grid3X3, CalendarDays } from "lucide-react";
import ServiceExtras from "@/components/service/service-extras-new";
import { cn } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceSchema, type Service, type Customer, type Vehicle, type ServiceType } from "@shared/schema";
import { z } from "zod";

async function apiRequest(method: string, url: string, data?: any): Promise<Response> {
  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(url, config);
  return response;
}

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

type ServiceFormData = z.infer<typeof serviceFormSchema>;

const statusColors = {
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-yellow-100 text-yellow-800 border-yellow-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const statusLabels = {
  scheduled: "Agendado",
  in_progress: "Em Andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
};

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

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border border-teal-200">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-teal-200 rounded w-1/3"></div>
            <div className="grid grid-cols-7 gap-2">
              {[...Array(42)].map((_, i) => (
                <div key={i} className="h-20 bg-teal-100 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/95 backdrop-blur-sm border border-teal-200/50 shadow-lg">
      <CardHeader className="border-b border-teal-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-teal-800">
            {monthNames[month]} {year}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              className="border-teal-200 text-teal-600 hover:bg-teal-50"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              className="border-teal-200 text-teal-600 hover:bg-teal-50"
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              className="border-teal-200 text-teal-600 hover:bg-teal-50"
            >
              Próximo
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {/* Calendar Grid */}
        <div className="space-y-4">
          {/* Day headers */}
          <div className={cn("grid grid-cols-7 gap-2", isMobile ? "text-xs" : "text-sm")}>
            {dayNames.map((day) => (
              <div key={day} className="text-center font-semibold text-teal-700 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className={cn("grid grid-cols-7 gap-2", isMobile ? "gap-1" : "gap-2")}>
            {days.map((date, index) => {
              if (!date) {
                return <div key={index} className={cn("", isMobile ? "h-16" : "h-24")}></div>;
              }

              const dayServices = getServicesForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <div
                  key={index}
                  className={cn(
                    "border rounded-lg transition-all duration-200 hover:shadow-md relative cursor-pointer",
                    isToday 
                      ? "bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-300 shadow-md" 
                      : dayServices.length > 0 
                        ? "bg-white border-teal-200 hover:bg-teal-50" 
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100",
                    isMobile ? "min-h-[90px] p-1" : "min-h-[120px] p-2"
                  )}
                  onClick={() => {
                    if (isMobile && dayServices.length > 1 && onDayClick) {
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
        </div>
      </CardContent>
    </Card>
  );
}

export default function SchedulePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("day");
  const [viewMode, setViewMode] = useState<"cards" | "calendar">("cards");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
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

  // Additional states for complete functionality like services page
  const [serviceExtras, setServiceExtras] = useState<any[]>([]);
  const [initialServiceExtras, setInitialServiceExtras] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState({
    pix: "",
    dinheiro: "",
    cheque: "",
    cartao: ""
  });
  const [temporaryPhotos, setTemporaryPhotos] = useState<Array<{ photo: string; category: string }>>([]);
  const [formInitialValues, setFormInitialValues] = useState<ServiceFormData | null>(null);

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      customerId: 0,
      vehicleId: 0,
      technicianId: 0,
      status: "scheduled",
      scheduledDate: "",
      scheduledTime: "",
      estimatedValue: undefined,
      finalValue: undefined,
      notes: "",
      serviceTypeId: undefined,
      valorPago: "0",
      pixPago: "0.00",
      dinheiroPago: "0.00",
      chequePago: "0.00",
      cartaoPago: "0.00",
    },
  });

  const { data: services = [], isLoading } = useQuery<(Service & { customer: Customer; vehicle: Vehicle; serviceType: ServiceType })[]>({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/services");
      return await res.json();
    },
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/customers");
      return await res.json();
    },
  });

  const { data: vehicles = [] } = useQuery<(Vehicle & { customer: Customer })[]>({
    queryKey: ["/api/vehicles"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/vehicles");
      return await res.json();
    },
  });

  const { data: serviceTypes = [] } = useQuery<ServiceType[]>({
    queryKey: ["/api/service-types"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/service-types");
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

  const createMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      const res = await apiRequest("POST", "/api/services", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsModalOpen(false);
      form.reset();
      toast({ title: "Agendamento criado com sucesso!" });
    },
    onError: (error: any) => {
      console.error("Error creating service:", error);
      toast({ title: "Erro ao criar agendamento", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ServiceFormData }) => {
      const res = await apiRequest("PUT", `/api/services/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsModalOpen(false);
      setEditingService(null);
      form.reset();
      toast({ title: "Agendamento atualizado com sucesso!" });
    },
    onError: (error: any) => {
      console.error("Error updating service:", error);
      toast({ title: "Erro ao atualizar agendamento", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/services/${id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({ title: "Agendamento excluído com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir agendamento", variant: "destructive" });
    },
  });

  const onSubmit = (data: ServiceFormData) => {
    const formData = data;
    if (editingService) {
      updateMutation.mutate({ id: editingService.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    form.reset({
      customerId: service.customerId,
      vehicleId: service.vehicleId,
      serviceTypeId: service.serviceTypeId || 0,
      technicianId: service.technicianId || 0,
      status: service.status as "scheduled" | "in_progress" | "completed" | "cancelled",
      scheduledDate: service.scheduledDate ? new Date(service.scheduledDate).toISOString().slice(0, 10) : "",
      estimatedValue: service.estimatedValue || undefined,
      finalValue: service.finalValue || undefined,
      notes: "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: "Excluir Agendamento",
      description: "Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.",
      onConfirm: () => {
        deleteMutation.mutate(id);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };



  // Filter services for schedule view
  const getDateRange = (period: string) => {
    const today = new Date();
    const brazilTime = new Date(today.getTime() - (3 * 60 * 60 * 1000));
    const currentDate = brazilTime.toISOString().split('T')[0];

    switch (period) {
      case "day":
        return { start: currentDate, end: currentDate };
      case "week":
        const startOfWeek = new Date(brazilTime);
        startOfWeek.setDate(brazilTime.getDate() - brazilTime.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return {
          start: startOfWeek.toISOString().split('T')[0],
          end: endOfWeek.toISOString().split('T')[0]
        };
      case "month":
        const startOfMonth = new Date(brazilTime.getFullYear(), brazilTime.getMonth(), 1);
        const endOfMonth = new Date(brazilTime.getFullYear(), brazilTime.getMonth() + 1, 0);
        return {
          start: startOfMonth.toISOString().split('T')[0],
          end: endOfMonth.toISOString().split('T')[0]
        };
      default:
        return null;
    }
  };

  const filteredServices = services.filter((service) => {
    const matchesSearch = service.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.vehicle?.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.serviceType?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || service.status === statusFilter;

    // No modo calendário, não aplicar filtro de período para mostrar todos os agendamentos
    let matchesPeriod = true;
    if (viewMode === "cards" && periodFilter !== "all" && service.scheduledDate) {
      const dateRange = getDateRange(periodFilter);
      if (dateRange) {
        const serviceDate = service.scheduledDate;
        matchesPeriod = serviceDate >= dateRange.start && serviceDate <= dateRange.end;
      }
    }

    return matchesSearch && matchesStatus && matchesPeriod;
  });

  const selectedCustomerId = form.watch("customerId");
  const availableVehicles = vehicles.filter(vehicle => 
    selectedCustomerId ? vehicle.customerId === selectedCustomerId : true
  );

  if (!user) {
    return null;
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
                <Select value={statusFilter} onValueChange={setStatusFilter}>
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

                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className={cn("bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 rounded-xl font-medium", isMobile ? "w-full h-11 px-4 text-sm justify-center" : "px-6 py-2")}
                      onClick={() => {
                        setEditingService(null);
                        form.reset({
                          customerId: 0,
                          vehicleId: 0,
                          technicianId: user?.role === 'technician' ? user.id : 0,
                          status: "scheduled",
                          scheduledDate: (() => {
                            const today = new Date();
                            const brazilTime = new Date(today.getTime() - (3 * 60 * 60 * 1000));
                            return brazilTime.toISOString().split('T')[0];
                          })(),
                          estimatedValue: undefined,
                          finalValue: undefined,
                          notes: "",
                          serviceTypeId: 0,
                        });
                      }}
                    >
                      <Plus className={cn("mr-2", isMobile ? "h-4 w-4" : "h-4 w-4")} />
                      {isMobile ? "Novo" : "Novo Agendamento"}
                    </Button>
                  </DialogTrigger>

                  <DialogContent className={cn("max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50/30", isMobile ? "max-w-[95vw] w-[95vw] h-[90vh] m-2 p-4" : "max-w-4xl")}>
                    <DialogHeader className={cn(isMobile ? "pb-4" : "pb-6")}>
                      <DialogTitle className={cn("font-bold bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-transparent", isMobile ? "text-lg" : "text-2xl")}>
                        {editingService ? (isMobile ? "Editar" : "Editar Agendamento") : (isMobile ? "Novo" : "Novo Agendamento")}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-4", isMobile ? "space-y-4" : "space-y-6")}>
                        <div className="grid gap-4 grid-cols-1">
                          <FormField
                            control={form.control}
                            name="customerId"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <FormLabel className={cn("font-semibold text-slate-700 flex items-center", isMobile ? "text-sm" : "text-sm")}>
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
                              <FormItem className="space-y-2">
                                <FormLabel className={cn("font-semibold text-slate-700 flex items-center", isMobile ? "text-sm" : "text-sm")}>
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

                        <div className="grid gap-4 grid-cols-1">
                          <FormField
                            control={form.control}
                            name="technicianId"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <FormLabel className={cn("font-semibold text-slate-700 flex items-center", isMobile ? "text-sm" : "text-sm")}>
                                  <User className="h-4 w-4 mr-2 text-teal-600" />
                                  Técnico Responsável
                                </FormLabel>
                                <Select 
                                  onValueChange={(value) => field.onChange(Number(value))} 
                                  value={field.value > 0 ? field.value.toString() : ""}
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
                        </div>

                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className={cn("font-semibold text-slate-700", isMobile ? "text-sm" : "text-sm")}>Status</FormLabel>
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

                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="scheduledDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={cn("font-semibold text-slate-700 flex items-center", isMobile ? "text-sm" : "text-sm")}>
                                  <Calendar className="h-4 w-4 mr-2 text-teal-600" />
                                  Data
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="date" 
                                    value={field.value || ""} 
                                    className={cn(
                                      "border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md",
                                      isMobile ? "h-12 text-base" : "h-11"
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
                                <FormLabel className={cn("font-semibold text-slate-700 flex items-center", isMobile ? "text-sm" : "text-sm")}>
                                  <Clock className="h-4 w-4 mr-2 text-teal-600" />
                                  Hora
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="time" 
                                    value={field.value || ""} 
                                    className={cn(
                                      "border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md",
                                      isMobile ? "h-12 text-base" : "h-11"
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
                            <FormItem className="space-y-2">
                              <FormLabel className={cn("font-semibold text-slate-700", isMobile ? "text-sm" : "text-sm")}>Observações</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Observações adicionais..." 
                                  {...field} 
                                  value={field.value || ""} 
                                  className={cn("border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md resize-none", isMobile ? "min-h-[100px] text-base" : "")}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                            control={form.control}
                            name="serviceTypeId"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <FormLabel className={cn("font-semibold text-slate-700 flex items-center", isMobile ? "text-sm" : "text-sm")}>
                                  <Wrench className="h-4 w-4 mr-2 text-teal-600" />
                                  Tipo de Serviço
                                </FormLabel>
                                <Select 
                                  onValueChange={(value) => {
                                    field.onChange(Number(value));
                                  }} 
                                  value={field.value > 0 ? field.value.toString() : ""}
                                >
                                  <FormControl>
                                    <SelectTrigger className={cn("border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md", isMobile ? "h-12 text-base" : "h-11")}>
                                      <SelectValue placeholder="Selecione um tipo de serviço" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {serviceTypes.map((serviceType) => (
                                      <SelectItem key={serviceType.id} value={serviceType.id.toString()}>
                                        {serviceType.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                        {/* Service Budget Section */}
                        <div className={cn("border-t", isMobile ? "pt-4" : "pt-6")}>
                          <div className="space-y-4">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                              <h3 className={cn("font-semibold text-slate-700 mb-3 flex items-center", isMobile ? "text-base" : "text-lg")}>
                                <Calculator className={cn("mr-2 text-slate-600", isMobile ? "h-4 w-4" : "h-5 w-5")} />
                                {isMobile ? "Orçamento" : "Valor Estimado do Serviço"}
                              </h3>
                              <div className="space-y-3">
                                <div className="bg-white border border-slate-200 rounded-lg p-3">
                                  <div className={cn("font-bold text-slate-800 mb-3", isMobile ? "text-sm" : "text-sm")}>Serviços:</div>
                                  <div className="space-y-2">
                                    <div className={cn("text-slate-700", isMobile ? "text-sm" : "text-sm")}>
                                      {(() => {
                                        const selectedServiceTypeId = form.watch("serviceTypeId");
                                        const selectedServiceType = serviceTypes.find(st => st.id === selectedServiceTypeId);
                                        return selectedServiceType?.description || "Nenhum serviço selecionado";
                                      })()}
                                    </div>
                                  </div>
                                </div>
                                <div className="border-t border-slate-300 pt-2 mt-2">
                                  <div className={cn("flex justify-between items-center", isMobile ? "flex-col gap-2" : "")}>
                                    <span className={cn("font-bold text-slate-800", isMobile ? "text-base" : "text-lg")}>Total Estimado:</span>
                                    <span className={cn("font-bold text-slate-700", isMobile ? "text-lg" : "text-xl")}>
                                      R$ {(() => {
                                        let total = 0;
                                        const selectedServiceTypeId = form.watch("serviceTypeId");
                                        if (selectedServiceTypeId && serviceTypes) {
                                          const selectedServiceType = serviceTypes.find(st => st.id === selectedServiceTypeId);
                                          if (selectedServiceType?.defaultPrice) {
                                            total += Number(selectedServiceType.defaultPrice);
                                          }
                                        }
                                        return total.toFixed(2);
                                      })()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className={cn("flex gap-3 border-t border-slate-200", isMobile ? "flex-col pt-4" : "justify-end pt-6")}>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsModalOpen(false)}
                            className={cn("border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200", isMobile ? "w-full h-12 text-base" : "px-6 py-2")}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createMutation.isPending || updateMutation.isPending}
                            className={cn("bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105", isMobile ? "w-full h-12 text-base" : "px-6 py-2")}
                          >
                            {editingService ? "Atualizar" : "Agendar"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Main Content */}
            {viewMode === "cards" ? (
              // Cards View
              isLoading ? (
                <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3")}>
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse bg-white/80 backdrop-blur-sm border border-teal-200">
                      <CardHeader className={cn(isMobile ? "p-4" : "")}>
                        <div className="h-5 bg-teal-200 rounded w-3/4"></div>
                        <div className="h-4 bg-teal-200 rounded w-1/2"></div>
                      </CardHeader>
                      <CardContent className={cn(isMobile ? "p-4 pt-0" : "")}>
                        <div className="space-y-3">
                          <div className="h-4 bg-teal-200 rounded"></div>
                          <div className="h-4 bg-teal-200 rounded w-2/3"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}>
                  {filteredServices.map((service) => (
                    <Card key={service.id} className={cn("group transition-all duration-300 bg-white/95 backdrop-blur-sm border border-teal-200/50 shadow-lg", isMobile ? "hover:shadow-lg" : "hover:shadow-2xl hover:-translate-y-1 hover:scale-105")}>
                      <CardHeader className={cn(isMobile ? "p-4 pb-2" : "pb-4")}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className={cn("bg-gradient-to-br from-teal-600 via-emerald-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0", isMobile ? "w-12 h-12" : "w-12 h-12")}>
                              <Calendar className={cn("text-white", isMobile ? "h-5 w-5" : "h-6 w-6")} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className={cn("font-bold text-teal-800 group-hover:text-emerald-600 transition-colors", isMobile ? "text-sm leading-tight" : "text-sm")}>
                                {service.serviceType?.name || "Serviço"}
                              </CardTitle>
                              <Badge className={cn("font-medium rounded-lg px-2 py-1 mt-2 inline-block", isMobile ? "text-xs" : "text-xs", statusColors[service.status as keyof typeof statusColors])}>
                                {statusLabels[service.status as keyof typeof statusLabels]}
                              </Badge>
                            </div>
                          </div>
                          <div className={cn("flex space-x-1 transition-opacity flex-shrink-0", isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(service)}
                              className={cn("p-0 hover:bg-emerald-100 hover:text-emerald-600 rounded-lg", isMobile ? "h-8 w-8" : "h-8 w-8")}
                            >
                              <Edit className={cn(isMobile ? "h-4 w-4" : "h-4 w-4")} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(service.id)}
                              className={cn("p-0 hover:bg-red-100 hover:text-red-600 rounded-lg", isMobile ? "h-8 w-8" : "h-8 w-8")}
                            >
                              <Trash2 className={cn(isMobile ? "h-4 w-4" : "h-4 w-4")} />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className={cn(isMobile ? "p-4 pt-0" : "pt-0")}>
                        <div className="space-y-3">
                          <div className={cn("flex items-center text-teal-700", isMobile ? "text-sm" : "text-sm")}>
                            <User className={cn("mr-2 text-teal-500 flex-shrink-0", isMobile ? "h-4 w-4" : "h-4 w-4")} />
                            <span className="font-medium truncate">{service.customer?.name}</span>
                          </div>
                          <div className={cn("flex items-center text-teal-700", isMobile ? "text-sm" : "text-sm")}>
                            <Car className={cn("mr-2 text-teal-500 flex-shrink-0", isMobile ? "h-4 w-4" : "h-4 w-4")} />
                            <span className="truncate">{service.vehicle?.brand} {service.vehicle?.model} - {service.vehicle?.licensePlate}</span>
                          </div>
                          {service.scheduledDate && (
                            <div className={cn("flex items-center text-teal-700", isMobile ? "text-sm" : "text-sm")}>
                              <Clock className={cn("mr-2 text-teal-500 flex-shrink-0", isMobile ? "h-4 w-4" : "h-4 w-4")} />
                              <span className="truncate">{new Date(service.scheduledDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                            </div>
                          )}
                          {service.estimatedValue && (
                            <div className={cn("font-semibold text-emerald-600", isMobile ? "text-sm" : "text-sm")}>
                              R$ {parseFloat(service.estimatedValue.toString()).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            ) : (
              // Calendar View
              <CalendarView
                services={filteredServices}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isMobile={isMobile}
                onDayClick={(date, services) => {
                  setDayServicesModal({
                    isOpen: true,
                    date: date,
                    services: services
                  });
                }}
              />
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
                    setDayServicesModal({ isOpen: false, date: null, services: [] });
                    handleEdit(service);
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-800">
                      {service.customer?.name || 'Cliente'}
                    </h3>
                    <Badge className={cn(
                      "text-xs",
                      service.status === "scheduled" ? "bg-blue-100 text-blue-800" :
                      service.status === "in_progress" ? "bg-yellow-100 text-yellow-800" :
                      service.status === "completed" ? "bg-green-100 text-green-800" :
                      "bg-red-100 text-red-800"
                    )}>
                      {statusLabels[service.status as keyof typeof statusLabels]}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Car className="h-4 w-4 mr-2 text-teal-600" />
                      {service.vehicle?.brand} {service.vehicle?.model} - {service.vehicle?.licensePlate}
                    </div>
                    <div className="flex items-center">
                      <Wrench className="h-4 w-4 mr-2 text-teal-600" />
                      {service.serviceType?.name}
                    </div>
                    {service.scheduledTime && (
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-teal-600" />
                        {service.scheduledTime.slice(0, 5)}
                      </div>
                    )}
                    {service.estimatedValue && (
                      <div className="flex items-center">
                        <Calculator className="h-4 w-4 mr-2 text-teal-600" />
                        R$ {Number(service.estimatedValue).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

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