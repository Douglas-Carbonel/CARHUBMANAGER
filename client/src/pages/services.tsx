import { useState } from "react";
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
  estimatedValue: z.string().min(1, "Valor é obrigatório"),
});

export default function Services() {
  const { toast } = useToast();
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
      estimatedValue: "",
      status: "scheduled",
      notes: "",
    },
  });

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: customers = [], isLoading: customersLoading, error: customersError } = useQuery<Customer[]>({
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
    retry: false,
  });

  const { data: vehicles = [], isLoading: vehiclesLoading, error: vehiclesError } = useQuery<Vehicle[]>({
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
    retry: false,
  });

  const { data: serviceTypes = [], isLoading: serviceTypesLoading, error: serviceTypesError } = useQuery<ServiceType[]>({
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
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof serviceFormSchema>) =>
      apiRequest("/api/services", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Serviço criado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao criar serviço", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<z.infer<typeof serviceFormSchema>> }) =>
      apiRequest(`/api/services/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsDialogOpen(false);
      setEditingService(null);
      form.reset();
      toast({ title: "Serviço atualizado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar serviço", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/services/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({ title: "Serviço excluído com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir serviço", variant: "destructive" });
    },
  });

  const onSubmit = (data: z.infer<typeof serviceFormSchema>) => {
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
      scheduledDate: service.scheduledDate || "",
      scheduledTime: service.scheduledTime || "",
      estimatedValue: service.estimatedValue?.toString() || "",
      status: service.status || "scheduled",
      notes: service.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este serviço?")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredServices = services.filter((service: Service) =>
    customers.find((c: Customer) => c.id === service.customerId)?.name
      ?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicles.find((v: Vehicle) => v.id === service.vehicleId)?.licensePlate
      ?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    serviceTypes.find((st: ServiceType) => st.id === service.serviceTypeId)?.name
      ?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const colors = {
      scheduled: "bg-blue-100 text-blue-800",
      in_progress: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header title="Serviços" />
        
        <main className="flex-1 p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Serviços</h1>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Serviço
                </Button>
              </DialogTrigger>
              
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingService ? "Editar Serviço" : "Novo Serviço"}
                  </DialogTitle>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="customerId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cliente</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(Number(value));
                                form.setValue("vehicleId", 0); // Reset vehicle when customer changes
                              }} 
                              value={field.value > 0 ? field.value.toString() : ""}
                            >
                              <FormControl>
                                <SelectTrigger>
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
                            selectedCustomerId ? vehicle.customerId === selectedCustomerId : true
                          );
                          
                          return (
                            <FormItem>
                              <FormLabel>Veículo</FormLabel>
                              <Select 
                                onValueChange={(value) => field.onChange(Number(value))} 
                                value={field.value > 0 ? field.value.toString() : ""}
                                disabled={!selectedCustomerId}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={selectedCustomerId ? "Selecione um veículo" : "Primeiro selecione um cliente"} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {availableVehicles.map((vehicle: Vehicle) => (
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

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="serviceTypeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Serviço</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(Number(value))} 
                              value={field.value > 0 ? field.value.toString() : ""}
                            >
                              <FormControl>
                                <SelectTrigger>
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
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
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

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="scheduledDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data</FormLabel>
                            <FormControl>
                              <Input {...field} type="date" value={field.value || ""} />
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
                              <Input {...field} type="time" value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="estimatedValue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor Estimado</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                step="0.01"
                                placeholder="0.00"
                                value={field.value || ""}
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

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        className="bg-teal-600 hover:bg-teal-700"
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

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar serviços..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid gap-4">
            {isLoading ? (
              <div>Carregando serviços...</div>
            ) : (
              filteredServices.map((service: Service) => {
                const customer = customers.find((c: Customer) => c.id === service.customerId);
                const vehicle = vehicles.find((v: Vehicle) => v.id === service.vehicleId);
                const serviceType = serviceTypes.find((st: ServiceType) => st.id === service.serviceTypeId);
                
                return (
                  <Card key={service.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center">
                            <Wrench className="h-5 w-5 mr-2 text-teal-600" />
                            {serviceType?.name || "Tipo não encontrado"}
                          </CardTitle>
                          <div className="flex items-center mt-2 text-sm text-gray-600">
                            <User className="h-4 w-4 mr-1" />
                            {customer?.name || "Cliente não encontrado"}
                            <Car className="h-4 w-4 ml-4 mr-1" />
                            {vehicle?.licensePlate || "Veículo não encontrado"} - {vehicle?.brand} {vehicle?.model}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusBadge(service.status || "scheduled")}>
                            {service.status === "scheduled" && "Agendado"}
                            {service.status === "in_progress" && "Em Andamento"}
                            {service.status === "completed" && "Concluído"}
                            {service.status === "cancelled" && "Cancelado"}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(service)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(service.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {service.scheduledDate && (
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                            {format(new Date(service.scheduledDate), "dd/MM/yyyy")}
                            {service.scheduledTime && (
                              <span className="ml-2 flex items-center">
                                <Clock className="h-4 w-4 mr-1 text-gray-500" />
                                {service.scheduledTime}
                              </span>
                            )}
                          </div>
                        )}
                        {service.estimatedValue && (
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-2 text-gray-500" />
                            R$ {Number(service.estimatedValue).toFixed(2)}
                          </div>
                        )}
                      </div>
                      {service.notes && (
                        <div className="mt-2 text-sm text-gray-600">
                          <strong>Observações:</strong> {service.notes}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </main>
      </div>
    </div>
  );
}