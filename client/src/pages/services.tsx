import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
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
import { Plus, Search, Edit, Trash2, Calendar, Clock, DollarSign, Wrench, User, Car } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceSchema, type Service, type Customer, type Vehicle, type ServiceType } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";

const serviceFormSchema = insertServiceSchema.extend({
  customerId: z.number().min(1, "Cliente é obrigatório"),
  vehicleId: z.number().min(1, "Veículo é obrigatório"),
  serviceTypeId: z.number().min(1, "Tipo de serviço é obrigatório"),
  estimatedValue: z.number().min(0, "Valor deve ser positivo"),
});

export default function Services() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof serviceFormSchema>>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      customerId: 0,
      vehicleId: 0,
      serviceTypeId: 0,
      scheduledDate: "",
      scheduledTime: "",
      estimatedValue: 0,
      status: "scheduled",
      notes: "",
    },
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["/api/services"],
    enabled: isAuthenticated,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
    enabled: isAuthenticated,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["/api/vehicles"],
    enabled: isAuthenticated,
  });

  const { data: serviceTypes = [] } = useQuery({
    queryKey: ["/api/service-types"],
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: async (service: z.infer<typeof serviceFormSchema>) => {
      return apiRequest("/api/services", "POST", service);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Serviço criado",
        description: "Serviço criado com sucesso",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao criar serviço",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (service: z.infer<typeof serviceFormSchema>) => {
      return apiRequest(`/api/services/${editingService?.id}`, "PATCH", service);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsDialogOpen(false);
      form.reset();
      setEditingService(null);
      toast({
        title: "Serviço atualizado",
        description: "Serviço atualizado com sucesso",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao atualizar serviço",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/services/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Serviço excluído",
        description: "Serviço excluído com sucesso",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao excluir serviço",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof serviceFormSchema>) => {
    if (editingService) {
      updateMutation.mutate(data);
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
      scheduledDate: service.scheduledDate || "",
      scheduledTime: service.scheduledTime || "",
      estimatedValue: service.estimatedValue || 0,
      status: service.status,
      notes: service.notes || "",
    });
    setIsDialogOpen(true);
  };

  const getCustomerName = (customerId: number) => {
    const customer = customers.find((c: Customer) => c.id === customerId);
    return customer ? customer.name : "Cliente não encontrado";
  };

  const getVehicleName = (vehicleId: number) => {
    const vehicle = vehicles.find((v: Vehicle) => v.id === vehicleId);
    return vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.plate})` : "Veículo não encontrado";
  };

  const getServiceTypeName = (serviceTypeId: number) => {
    const serviceType = serviceTypes.find((st: ServiceType) => st.id === serviceTypeId);
    return serviceType ? serviceType.name : "Tipo não encontrado";
  };

  const getCustomerVehicles = (customerId: number) => {
    return vehicles.filter((v: Vehicle) => v.customerId === customerId) || [];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "scheduled":
        return "Agendado";
      case "in_progress":
        return "Em Andamento";
      case "completed":
        return "Concluído";
      case "cancelled":
        return "Cancelado";
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const filteredServices = services.filter((service: Service) => {
    const customer = getCustomerName(service.customerId);
    const vehicle = getVehicleName(service.vehicleId);
    const serviceType = getServiceTypeName(service.serviceTypeId);
    
    return (
      customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      serviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Gestão de Serviços" 
          subtitle="Gerencie serviços, agendamentos e status de execução" 
        />
        
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white/80 via-blue-50/50 to-indigo-50/30 backdrop-blur-sm">
          <div className="p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Buscar serviços..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 w-80 h-12 border-2 border-gray-200 focus:border-blue-400 rounded-xl shadow-sm bg-white/80"
                />
              </div>
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg shadow-md">
                <span className="font-semibold">{filteredServices.length}</span>
                <span className="ml-1 text-sm">serviços</span>
              </div>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg h-12 px-6 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
                    onClick={() => {
                      setEditingService(null);
                      form.reset();
                    }}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Novo Serviço
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingService ? "Editar Serviço" : "Novo Serviço"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="customerId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cliente</FormLabel>
                              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o cliente" />
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
                              <FormLabel>Veículo</FormLabel>
                              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o veículo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {getCustomerVehicles(form.watch("customerId")).map((vehicle: Vehicle) => (
                                    <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                                      {vehicle.brand} {vehicle.model} ({vehicle.plate})
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
                        name="serviceTypeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Serviço</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o tipo de serviço" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {serviceTypes.map((serviceType: ServiceType) => (
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="scheduledDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data Agendada</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} value={field.value || ""} />
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
                              <FormLabel>Hora Agendada</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="estimatedValue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor Estimado</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                placeholder="0.00"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                          <FormItem>
                            <FormLabel>Observações</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Observações sobre o serviço" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          type="submit"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={createMutation.isPending || updateMutation.isPending}
                        >
                          {editingService ? "Atualizar" : "Criar"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {servicesLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredServices.map((service: Service) => (
                    <Card key={service.id} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-white/90 backdrop-blur-sm hover:bg-white/95 hover:scale-[1.02]">
                      <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 via-blue-50 to-gray-50 rounded-t-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center mb-3">
                              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-xl mr-4 shadow-lg">
                                <Wrench className="h-6 w-6 text-white" />
                              </div>
                              <div>
                                <CardTitle className="text-lg font-bold text-gray-900 mb-1">
                                  {getServiceTypeName(service.serviceTypeId)}
                                </CardTitle>
                                <Badge className={`${getStatusColor(service.status)} font-medium`}>
                                  {getStatusText(service.status)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col space-y-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(service)}
                              className="h-8 w-8 p-0 rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100 hover:from-blue-200 hover:to-cyan-200 border border-blue-200 shadow-sm group-hover:scale-110 transition-all duration-200"
                              title="Editar serviço"
                            >
                              <Edit className="h-3 w-3 text-blue-700" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteMutation.mutate(service.id)}
                              className="h-8 w-8 p-0 rounded-lg bg-gradient-to-br from-red-100 to-pink-100 hover:from-red-200 hover:to-pink-200 border border-red-200 shadow-sm group-hover:scale-110 transition-all duration-200"
                              title="Excluir serviço"
                            >
                              <Trash2 className="h-3 w-3 text-red-700" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
                            <div className="bg-blue-100 p-2 rounded-lg mr-3">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-800">{getCustomerName(service.customerId)}</span>
                          </div>
                          <div className="flex items-center bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-100">
                            <div className="bg-purple-100 p-2 rounded-lg mr-3">
                              <Car className="h-4 w-4 text-purple-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-800">{getVehicleName(service.vehicleId)}</span>
                          </div>
                          {service.scheduledDate && (
                            <div className="flex items-center bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
                              <div className="bg-green-100 p-2 rounded-lg mr-3">
                                <Calendar className="h-4 w-4 text-green-600" />
                              </div>
                              <span className="text-sm font-medium text-gray-800">
                                {format(new Date(service.scheduledDate), "dd/MM/yyyy")}
                                {service.scheduledTime && ` às ${service.scheduledTime}`}
                              </span>
                            </div>
                          )}
                          {service.estimatedValue && Number(service.estimatedValue) > 0 && (
                            <div className="flex items-center bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-3 border border-amber-100">
                              <div className="bg-amber-100 p-2 rounded-lg mr-3">
                                <DollarSign className="h-4 w-4 text-amber-600" />
                              </div>
                              <span className="text-sm font-medium text-gray-800">
                                R$ {Number(service.estimatedValue).toFixed(2)}
                              </span>
                            </div>
                          )}
                          {service.notes && (
                            <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg p-3 border border-gray-100">
                              <p className="text-sm font-medium text-gray-800">
                                {service.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {filteredServices.length === 0 && !servicesLoading && (
                  <div className="p-6">
                    <Card className="border-dashed border-2 border-gray-300 bg-white/50 backdrop-blur-sm">
                      <CardContent className="text-center py-16">
                        <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-6 rounded-full mx-auto mb-6 w-24 h-24 flex items-center justify-center">
                          <Wrench className="h-12 w-12 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">
                          Nenhum serviço encontrado
                        </h3>
                        <p className="text-gray-600 mb-6">
                          {searchTerm ? 'Tente ajustar os termos de busca.' : 'Comece agendando seu primeiro serviço.'}
                        </p>
                        {!searchTerm && (
                          <Button
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg"
                            onClick={() => {
                              setEditingService(null);
                              form.reset();
                              setIsDialogOpen(true);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Agendar Primeiro Serviço
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}