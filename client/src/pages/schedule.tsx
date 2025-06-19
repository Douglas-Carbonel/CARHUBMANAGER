import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
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
import { Plus, Search, Edit, Trash2, Calendar, Clock, User, Car } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceSchema, type Service, type Customer, type Vehicle, type ServiceType } from "@shared/schema";
import { z } from "zod";

async function apiRequest(method: string, url: string, data?: any): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  return res;
}

const serviceFormSchema = insertServiceSchema.extend({
  scheduledDate: z.string().optional(),
});
type ServiceFormData = z.infer<typeof serviceFormSchema>;

const statusColors = {
  scheduled: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800", 
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("day");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      customerId: 0,
      vehicleId: 0,
      serviceTypeId: 0,
      technicianId: user?.role === 'technician' ? user.id : 0,
      status: "scheduled",
      scheduledDate: new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"})).toISOString().split('T')[0], // Data atual brasileira como padrão
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
      const res = await apiRequest("GET", "/api/admin/users");
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
      setEditingService(null);
      form.reset();
      toast({
        title: "Serviço agendado",
        description: "Serviço foi agendado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
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
      toast({
        title: "Serviço atualizado",
        description: "Serviço foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Serviço removido",
        description: "Serviço foi removido com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
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
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover este serviço?")) {
      deleteMutation.mutate(id);
    }
  };

  // Helper functions for date filtering
  const getDateRange = (period: string) => {
    // Use Brazilian timezone for today's date
    const today = new Date();
    const brazilTime = new Date(today.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const todayStr = brazilTime.toISOString().split('T')[0];

    switch (period) {
      case "day":
        return { start: todayStr, end: todayStr };
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
        return { start: "", end: "" };
    }
  };

  const filteredServices = services.filter((service) => {
    const matchesSearch = (service.notes || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (service.customer?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (service.vehicle?.licensePlate || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || service.status === statusFilter;

    // Period filter logic
    let matchesPeriod = true;
    if (service.scheduledDate && periodFilter !== "all") {
      const { start, end } = getDateRange(periodFilter);
      const serviceDate = service.scheduledDate;
      
      // Debug logging
      console.log('Filtering service:', {
        serviceDate,
        period: periodFilter,
        start,
        end,
        serviceId: service.id
      });
      
      matchesPeriod = serviceDate >= start && serviceDate <= end;
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
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden md:ml-0">
        <Header 
          title="Agendamentos"
          subtitle="Gerencie os agendamentos de serviços"
        />

        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-teal-50 via-emerald-50/30 to-cyan-50/20">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-white via-teal-50 to-white border-b border-teal-100 px-4 sm:px-6 md:px-8 py-4 sm:py-6 sticky top-0 z-10 shadow-lg backdrop-blur-sm bg-white/95">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-teal-400 h-5 w-5" />
                  <Input
                    placeholder="Buscar agendamentos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 w-full sm:w-80 h-12 border-2 border-teal-200 focus:border-emerald-400 rounded-xl shadow-sm bg-white/90 backdrop-blur-sm"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48 h-12 border-2 border-teal-200 focus:border-emerald-400 rounded-xl shadow-sm bg-white/90 backdrop-blur-sm">
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

                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                  <SelectTrigger className="w-full sm:w-48 h-12 border-2 border-teal-200 focus:border-emerald-400 rounded-xl shadow-sm bg-white/90 backdrop-blur-sm">
                    <SelectValue placeholder="Filtrar por período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Hoje</SelectItem>
                    <SelectItem value="week">Esta Semana</SelectItem>
                    <SelectItem value="month">Este Mês</SelectItem>
                    <SelectItem value="all">Todos os Períodos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full lg:w-auto">
                <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-4 sm:px-5 py-3 rounded-xl shadow-lg backdrop-blur-sm">
                  <span className="font-bold text-base sm:text-lg">{filteredServices.length}</span>
                  <span className="ml-2 text-xs sm:text-sm font-medium">
                    {periodFilter === "day" ? "hoje" : 
                     periodFilter === "week" ? "esta semana" : 
                     periodFilter === "month" ? "este mês" : "agendamentos"}
                  </span>
                </div>
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-500 hover:to-cyan-500 text-teal-900 shadow-lg hover:shadow-xl transition-all duration-200 px-4 sm:px-6 py-3 rounded-xl font-semibold text-sm sm:text-base w-full sm:w-auto"
                      onClick={() => {
                        setEditingService(null);
                        form.reset({
                          customerId: 0,
                          vehicleId: 0,
                          serviceTypeId: 0,
                          technicianId: user?.role === 'technician' ? user.id : 0,
                          status: "scheduled",
                          scheduledDate: new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"})).toISOString().split('T')[0],
                          estimatedValue: undefined,
                          finalValue: undefined,
                          notes: "",
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      Novo Agendamento
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl bg-gradient-to-br from-slate-50 to-blue-50/30">
                    <DialogHeader className="pb-6">
                      <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-transparent">
                        {editingService ? "Editar Agendamento" : "Novo Agendamento"}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                                <Select onValueChange={(value) => {
                                  field.onChange(parseInt(value));
                                  form.setValue("vehicleId", 0);
                                }} value={field.value?.toString()}>
                                  <FormControl>
                                    <SelectTrigger className="h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md">
                                      <SelectValue placeholder="Selecione o cliente" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
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
                              <FormItem className="space-y-2">
                                <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                                  <Car className="h-4 w-4 mr-2 text-teal-600" />
                                  Veículo
                                </FormLabel>
                                <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                  <FormControl>
                                    <SelectTrigger className="h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md">
                                      <SelectValue placeholder="Selecione o veículo" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {availableVehicles.map((vehicle) => (
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
                            name="serviceTypeId"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                                  <Car className="h-4 w-4 mr-2 text-teal-600" />
                                  Tipo de Serviço
                                </FormLabel>
                                <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                  <FormControl>
                                    <SelectTrigger className="h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md">
                                      <SelectValue placeholder="Selecione o tipo de serviço" />
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
                          <FormField
                            control={form.control}
                            name="technicianId"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                                  <User className="h-4 w-4 mr-2 text-teal-600" />
                                  Técnico Responsável
                                </FormLabel>
                                <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                  <FormControl>
                                    <SelectTrigger className="h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md">
                                      <SelectValue placeholder="Selecione o técnico" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {users.map((technician) => (
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
                          <FormField
                            control={form.control}
                            name="scheduledDate"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                                  <Calendar className="h-4 w-4 mr-2 text-teal-600" />
                                  Data do Agendamento
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    type="date" 
                                    {...field} 
                                    value={field.value || ""} 
                                    className="h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md"
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
                              <FormItem className="space-y-2">
                                <FormLabel className="text-sm font-semibold text-slate-700">Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value || "scheduled"}>
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
                          <FormField
                            control={form.control}
                            name="estimatedValue"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <FormLabel className="text-sm font-semibold text-slate-700">Valor Estimado (R$)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    step="0.01" 
                                    placeholder="150.00" 
                                    {...field}
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                    className="h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem className="md:col-span-2 space-y-2">
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
          </div>

          {/* Main Content */}
          <div className="p-8">
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
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredServices.map((service) => (
                  <Card key={service.id} className="group hover:shadow-2xl transition-all duration-300 bg-white/95 backdrop-blur-sm border border-teal-200/50 shadow-lg hover:-translate-y-1 sm:hover:-translate-y-2 hover:scale-105">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-teal-600 via-emerald-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Calendar className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-sm font-bold text-teal-800 group-hover:text-emerald-600 transition-colors line-clamp-2">
                              {service.serviceType?.name || "Serviço"}
                            </CardTitle>
                            <Badge className={`text-xs mt-2 font-medium ${statusColors[service.status as keyof typeof statusColors]} rounded-lg px-2 py-1`}>
                              {statusLabels[service.status as keyof typeof statusLabels]}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(service)}
                            className="h-8 w-8 p-0 hover:bg-emerald-100 hover:text-emerald-600 rounded-lg"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(service.id)}
                            className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div className="flex items-center text-sm text-teal-700">
                          <User className="h-4 w-4 mr-2 text-teal-500" />
                          <span className="font-medium">{service.customer?.name}</span>
                        </div>
                        <div className="flex items-center text-sm text-teal-700">
                          <Car className="h-4 w-4 mr-2 text-teal-500" />
                          <span>{service.vehicle?.brand} {service.vehicle?.model} - {service.vehicle?.licensePlate}</span>
                        </div>
                        {service.scheduledDate && (
                          <div className="flex items-center text-sm text-teal-700">
                            <Clock className="h-4 w-4 mr-2 text-teal-500" />
                            <span>{new Date(service.scheduledDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                          </div>
                        )}
                        {service.estimatedValue && (
                          <div className="text-sm font-semibold text-emerald-600">
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
      </div>
    </div>
  );
}