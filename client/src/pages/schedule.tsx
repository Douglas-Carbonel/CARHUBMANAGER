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
import { Plus, Search, Edit, Trash2, Calendar, Clock, User, Car, Wrench, Calculator, Camera } from "lucide-react";
import ServiceExtras from "@/components/service/service-extras";
import PhotoUpload from "@/components/photos/photo-upload";
import CameraCapture from "@/components/camera/camera-capture";
import { cn } from "@/lib/utils";
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
  serviceTypeId: z.number().min(1, "Tipo de serviço é obrigatório"),
  technicianId: z.number().optional(),
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

export default function SchedulePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("day");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [currentServicePhotos, setCurrentServicePhotos] = useState<any[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [serviceExtras, setServiceExtras] = useState<any[]>([]);

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      customerId: 0,
      vehicleId: 0,
      serviceTypeId: 0,
      technicianId: 0,
      status: "scheduled",
      scheduledDate: "",
      estimatedValue: undefined,
      finalValue: undefined,
      notes: "",
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
    if (editingService) {
      updateMutation.mutate({ id: editingService.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    form.reset({
      customerId: service.customerId,
      vehicleId: service.vehicleId,
      serviceTypeId: service.serviceTypeId,
      technicianId: service.technicianId || 0,
      status: service.status as "scheduled" | "in_progress" | "completed" | "cancelled",
      scheduledDate: service.scheduledDate ? new Date(service.scheduledDate).toISOString().slice(0, 10) : "",
      estimatedValue: service.estimatedValue || undefined,
      finalValue: service.finalValue || undefined,
      notes: service.notes || "",
    });
    fetchServicePhotos(service.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este agendamento?")) {
      deleteMutation.mutate(id);
    }
  };

  const fetchServicePhotos = async (serviceId: number | undefined) => {
    if (!serviceId) {
      setCurrentServicePhotos([]);
      return;
    }

    try {
      const res = await fetch(`/api/photos?serviceId=${serviceId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      const photos = await res.json();
      setCurrentServicePhotos(photos);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar fotos do serviço",
        description: error.message,
        variant: "destructive",
      });
      setCurrentServicePhotos([]);
    }
  };

  const handlePhotoTaken = () => {
    if (editingService) {
      fetchServicePhotos(editingService.id);
    }
    queryClient.invalidateQueries({ queryKey: ['/api/photos'] });
    toast({
      title: "Foto capturada",
      description: "Foto foi adicionada com sucesso.",
    });
    setIsCameraOpen(false);
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

    let matchesPeriod = true;
    if (periodFilter !== "all" && service.scheduledDate) {
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
      <div className="flex-1 flex flex-col">
        <Header 
          title="Agenda" 
          subtitle="Gerenciar agendamentos"
        />

        <main className="flex-1 overflow-y-auto">
          <div className={cn(isMobile ? "p-2" : "p-8")}>
            {/* Filters */}
            <div className={cn("flex gap-4 mb-8", isMobile ? "flex-col" : "flex-col lg:flex-row")}>
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar por cliente, veículo ou observações..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={cn("pl-10 bg-white/90 backdrop-blur-sm border-gray-200/50 rounded-xl shadow-sm focus:shadow-md transition-all duration-200", isMobile ? "h-10 text-sm" : "")}
                  />
                </div>
              </div>
              
              <div className={cn("flex gap-4", isMobile ? "flex-col" : "min-w-max")}>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className={cn("bg-white/90 backdrop-blur-sm border-gray-200/50 rounded-xl shadow-sm focus:shadow-md transition-all duration-200", isMobile ? "w-full h-10" : "w-48")}>
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

                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                  <SelectTrigger className={cn("bg-white/90 backdrop-blur-sm border-gray-200/50 rounded-xl shadow-sm focus:shadow-md transition-all duration-200", isMobile ? "w-full h-10" : "w-48")}>
                    <SelectValue placeholder="Filtrar por período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Períodos</SelectItem>
                    <SelectItem value="day">Hoje</SelectItem>
                    <SelectItem value="week">Esta Semana</SelectItem>
                    <SelectItem value="month">Este Mês</SelectItem>
                  </SelectContent>
                </Select>

                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className={cn("bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 rounded-xl", isMobile ? "w-full h-10 px-4 py-2 text-sm" : "px-6 py-2")}
                      onClick={() => {
                        setEditingService(null);
                        form.reset({
                          customerId: 0,
                          vehicleId: 0,
                          serviceTypeId: 0,
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
                        });
                      }}
                    >
                      <Plus className={cn("mr-2", isMobile ? "h-4 w-4" : "h-4 w-4 sm:h-5 sm:w-5")} />
                      Novo Agendamento
                    </Button>
                  </DialogTrigger>

                  <DialogContent className={cn("max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50/30", isMobile ? "max-w-[95vw] m-2" : "max-w-4xl")}>
                    <DialogHeader className="pb-6">
                      <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-transparent">
                        {editingService ? "Editar Agendamento" : "Novo Agendamento"}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-2")}>
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
                                    form.setValue("vehicleId", 0);
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
                            render={({ field }) => (
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
                            )}
                          />
                        </div>

                        <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-2")}>
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
                                <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                                  <Calendar className="h-4 w-4 mr-2 text-teal-600" />
                                  Data
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="date" 
                                    value={field.value || ""} 
                                    className={cn(
                                      "h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md",
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
                                <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                                  <Clock className="h-4 w-4 mr-2 text-teal-600" />
                                  Hora
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="time" 
                                    value={field.value || ""} 
                                    className={cn(
                                      "h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md",
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
                            <FormItem className="space-y-2">
                              <FormLabel className="text-sm font-semibold text-slate-700">Observações</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Observações adicionais..." 
                                  {...field} 
                                  value={field.value || ""} 
                                  className="border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md resize-none"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Service Extras Section */}
                        <div className="border-t pt-4">
                          <ServiceExtras
                            serviceId={editingService?.id}
                            onChange={setServiceExtras}
                          />
                        </div>

                        {/* Service Budget Section */}
                        <div className="border-t pt-6">
                          <div className="space-y-4">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                              <h3 className="text-lg font-semibold text-slate-700 mb-3 flex items-center">
                                <Calculator className="h-5 w-5 mr-2 text-slate-600" />
                                Valor Estimado do Serviço
                              </h3>
                              <div className="space-y-3">
                                <div className="bg-white border border-slate-200 rounded-lg p-3">
                                  <div className="text-sm font-bold text-slate-800 mb-3">Serviços:</div>
                                  <div className="space-y-2">
                                    <div className="text-sm text-slate-700">
                                      {(() => {
                                        const selectedServiceTypeId = form.watch("serviceTypeId");
                                        const selectedServiceType = serviceTypes.find(st => st.id === selectedServiceTypeId);
                                        return selectedServiceType?.description || "Nenhum serviço selecionado";
                                      })()}
                                    </div>
                                    {serviceExtras.length > 0 && serviceExtras.map((extra, index) => (
                                      <div key={index} className="text-sm text-slate-700">
                                        {extra.serviceExtra?.descricao}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="border-t border-slate-300 pt-2 mt-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-lg font-bold text-slate-800">Total Estimado:</span>
                                    <span className="text-xl font-bold text-slate-700">
                                      R$ {(() => {
                                        let total = 0;
                                        const selectedServiceTypeId = form.watch("serviceTypeId");
                                        if (selectedServiceTypeId && serviceTypes) {
                                          const selectedServiceType = serviceTypes.find(st => st.id === selectedServiceTypeId);
                                          if (selectedServiceType?.defaultPrice) {
                                            total += Number(selectedServiceType.defaultPrice);
                                          }
                                        }
                                        serviceExtras.forEach(extra => {
                                          if (extra.valor && !isNaN(Number(extra.valor))) {
                                            total += Number(extra.valor);
                                          }
                                        });
                                        return total.toFixed(2);
                                      })()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Photos Section */}
                        <div className="border-t pt-4">
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
                              </div>
                            </div>
                            <PhotoUpload
                              photos={currentServicePhotos}
                              onPhotoUploaded={() => fetchServicePhotos(editingService?.id)}
                              serviceId={editingService?.id}
                              maxPhotos={7}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-6 border-t border-slate-200">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsModalOpen(false)}
                            className="px-6 py-2 border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200"
                          >
                            Cancelar
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createMutation.isPending || updateMutation.isPending}
                            className="px-6 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
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
            {isLoading ? (
              <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 sm:gap-6")}>
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
            ) : (
              <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6")}>
                {filteredServices.map((service) => (
                  <Card key={service.id} className={cn("group transition-all duration-300 bg-white/95 backdrop-blur-sm border border-teal-200/50 shadow-lg", isMobile ? "hover:shadow-lg" : "hover:shadow-2xl hover:-translate-y-1 sm:hover:-translate-y-2 hover:scale-105")}>
                    <CardHeader className={cn(isMobile ? "pb-2 px-3 pt-3" : "pb-4")}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={cn("bg-gradient-to-br from-teal-600 via-emerald-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg", isMobile ? "w-10 h-10" : "w-12 h-12")}>
                            <Calendar className={cn("text-white", isMobile ? "h-5 w-5" : "h-6 w-6")} />
                          </div>
                          <div className="flex-1">
                            <CardTitle className={cn("font-bold text-teal-800 group-hover:text-emerald-600 transition-colors line-clamp-2", isMobile ? "text-xs" : "text-sm")}>
                              {service.serviceType?.name || "Serviço"}
                            </CardTitle>
                            <Badge className={cn("font-medium rounded-lg px-2 py-1 mt-2", isMobile ? "text-xs" : "text-xs", statusColors[service.status as keyof typeof statusColors])}>
                              {statusLabels[service.status as keyof typeof statusLabels]}
                            </Badge>
                          </div>
                        </div>
                        <div className={cn("flex space-x-1 transition-opacity", isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(service)}
                            className={cn("p-0 hover:bg-emerald-100 hover:text-emerald-600 rounded-lg", isMobile ? "h-6 w-6" : "h-8 w-8")}
                          >
                            <Edit className={cn(isMobile ? "h-3 w-3" : "h-4 w-4")} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(service.id)}
                            className={cn("p-0 hover:bg-red-100 hover:text-red-600 rounded-lg", isMobile ? "h-6 w-6" : "h-8 w-8")}
                          >
                            <Trash2 className={cn(isMobile ? "h-3 w-3" : "h-4 w-4")} />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className={cn(isMobile ? "pt-0 px-3 pb-3" : "pt-0")}>
                      <div className="space-y-3">
                        <div className={cn("flex items-center text-teal-700", isMobile ? "text-xs" : "text-sm")}>
                          <User className={cn("mr-2 text-teal-500", isMobile ? "h-3 w-3" : "h-4 w-4")} />
                          <span className="font-medium truncate">{service.customer?.name}</span>
                        </div>
                        <div className={cn("flex items-center text-teal-700", isMobile ? "text-xs" : "text-sm")}>
                          <Car className={cn("mr-2 text-teal-500", isMobile ? "h-3 w-3" : "h-4 w-4")} />
                          <span className="truncate">{service.vehicle?.brand} {service.vehicle?.model} - {service.vehicle?.licensePlate}</span>
                        </div>
                        {service.scheduledDate && (
                          <div className={cn("flex items-center text-teal-700", isMobile ? "text-xs" : "text-sm")}>
                            <Clock className={cn("mr-2 text-teal-500", isMobile ? "h-3 w-3" : "h-4 w-4")} />
                            <span>{new Date(service.scheduledDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                          </div>
                        )}
                        {service.estimatedValue && (
                          <div className={cn("font-semibold text-emerald-600", isMobile ? "text-xs" : "text-sm")}>
                            R$ {parseFloat(service.estimatedValue.toString()).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Camera Capture Modal */}
        <CameraCapture
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onPhotoTaken={handlePhotoTaken}
          serviceId={editingService?.id}
        />
      </div>
    </div>
  );
}