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
import { Plus, Search, Edit, Trash2, Car, Wrench, BarChart3, Palette } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVehicleSchema, type Vehicle, type Customer } from "@shared/schema";
import { z } from "zod";
import NewServiceModal from "@/components/modals/new-service-modal";
import { useLocation } from "wouter";

const vehicleFormSchema = insertVehicleSchema.extend({
  customerId: z.number().min(1, "Cliente é obrigatório"),
  plate: z.string().min(1, "Placa é obrigatória"),
  brand: z.string().min(1, "Marca é obrigatória"),
  model: z.string().min(1, "Modelo é obrigatória"),
  year: z.number().min(1900, "Ano inválido").max(new Date().getFullYear() + 1, "Ano inválido"),
});

export default function Vehicles() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isNewServiceModalOpen, setIsNewServiceModalOpen] = useState(false);
  const [selectedVehicleForService, setSelectedVehicleForService] = useState<Vehicle | null>(null);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const form = useForm<z.infer<typeof vehicleFormSchema>>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      customerId: 0,
      plate: "",
      brand: "",
      model: "",
      year: new Date().getFullYear(),
      color: "",
      observations: "",
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
        window.location.href = "/auth";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ["/api/vehicles"],
    enabled: isAuthenticated,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: async (vehicle: z.infer<typeof vehicleFormSchema>) => {
      return apiRequest("/api/vehicles", "POST", vehicle);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Veículo criado",
        description: "Veículo criado com sucesso",
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
          window.location.href = "/auth";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao criar veículo",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (vehicle: z.infer<typeof vehicleFormSchema>) => {
      return apiRequest(`/api/vehicles/${editingVehicle?.id}`, "PATCH", vehicle);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setIsDialogOpen(false);
      form.reset();
      setEditingVehicle(null);
      toast({
        title: "Veículo atualizado",
        description: "Veículo atualizado com sucesso",
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
          window.location.href = "/auth";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao atualizar veículo",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/vehicles/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({
        title: "Veículo excluído",
        description: "Veículo excluído com sucesso",
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
          window.location.href = "/auth";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao excluir veículo",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof vehicleFormSchema>) => {
    if (editingVehicle) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    form.reset({
      customerId: vehicle.customerId,
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color || "",
      observations: vehicle.observations || "",
    });
    setIsDialogOpen(true);
  };

  const getCustomerName = (customerId: number) => {
    const customer = customers.find((c: Customer) => c.id === customerId);
    return customer ? customer.name : "Cliente não encontrado";
  };

  const handleNewServiceForVehicle = (vehicle: Vehicle) => {
    setSelectedVehicleForService(vehicle);
    setIsNewServiceModalOpen(true);
  };

  const handleViewVehicleReport = (vehicle: Vehicle) => {
    setLocation(`/reports?vehicleId=${vehicle.id}`);
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

  const filteredVehicles = vehicles.filter((vehicle: Vehicle) =>
    vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.color?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getCustomerName(vehicle.customerId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Gestão de Veículos" 
          subtitle="Gerencie veículos, proprietários e histórico de serviços" 
        />

        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white/80 via-blue-50/50 to-indigo-50/30 backdrop-blur-sm">
          <div className="p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Buscar veículos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 w-80 h-12 border-2 border-gray-200 focus:border-blue-400 rounded-xl shadow-sm bg-white/80"
                />
              </div>
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg shadow-md">
                <span className="font-semibold">{filteredVehicles.length}</span>
                <span className="ml-1 text-sm">veículos</span>
              </div>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg h-12 px-6 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
                    onClick={() => {
                      setEditingVehicle(null);
                      form.reset();
                    }}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Novo Veículo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingVehicle ? "Editar Veículo" : "Novo Veículo"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="plate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Placa</FormLabel>
                              <FormControl>
                                <Input placeholder="ABC-1234" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="year"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ano</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="2023"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="brand"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Marca</FormLabel>
                              <FormControl>
                                <Input placeholder="Toyota" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="model"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Modelo</FormLabel>
                              <FormControl>
                                <Input placeholder="Corolla" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cor</FormLabel>
                            <FormControl>
                              <Input placeholder="Branco" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="observations"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Observações</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Observações sobre o veículo" {...field} value={field.value || ""} />
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
                          {editingVehicle ? "Atualizar" : "Criar"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {vehiclesLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredVehicles.map((vehicle: Vehicle) => (
                    <Card key={vehicle.id} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-white/90 backdrop-blur-sm hover:bg-white/95 hover:scale-[1.02]">
                      <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 via-blue-50 to-gray-50 rounded-t-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center mb-3">
                              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl mr-4 shadow-lg">
                                <Car className="h-6 w-6 text-white" />
                              </div>
                              <div>
                                <CardTitle className="text-xl font-bold text-gray-900 mb-1">
                                  {vehicle.brand} {vehicle.model}
                                </CardTitle>
                                <div className="flex items-center space-x-2">
                                  <Badge className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border-blue-200 font-medium">
                                    {vehicle.plate}
                                  </Badge>
                                  <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200 font-medium">
                                    {vehicle.year}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col space-y-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleNewServiceForVehicle(vehicle)}
                              className="h-10 w-10 p-0 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 hover:from-green-200 hover:to-emerald-200 border border-green-200 shadow-md group-hover:scale-110 transition-all duration-200"
                              title="Novo serviço para este veículo"
                            >
                              <Wrench className="h-4 w-4 text-green-700" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewVehicleReport(vehicle)}
                              className="h-10 w-10 p-0 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 border border-purple-200 shadow-md group-hover:scale-110 transition-all duration-200"
                              title="Ver relatório do veículo"
                            >
                              <BarChart3 className="h-4 w-4 text-purple-700" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(vehicle)}
                              className="h-10 w-10 p-0 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 hover:from-blue-200 hover:to-cyan-200 border border-blue-200 shadow-md group-hover:scale-110 transition-all duration-200"
                              title="Editar veículo"
                            >
                              <Edit className="h-4 w-4 text-blue-700" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteMutation.mutate(vehicle.id)}
                              className="h-10 w-10 p-0 rounded-xl bg-gradient-to-br from-red-100 to-pink-100 hover:from-red-200 hover:to-pink-200 border border-red-200 shadow-md group-hover:scale-110 transition-all duration-200"
                              title="Excluir veículo"
                            >
                              <Trash2 className="h-4 w-4 text-red-700" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
                            <div className="bg-blue-100 p-2 rounded-lg mr-3">
                              <Car className="h-4 w-4 text-blue-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-800">{getCustomerName(vehicle.customerId)}</span>
                          </div>
                          {vehicle.color && (
                            <div className="flex items-center bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-100">
                              <div className="bg-purple-100 p-2 rounded-lg mr-3">
                                <Palette className="h-4 w-4 text-purple-600" />
                              </div>
                              <span className="text-sm font-medium text-gray-800">{vehicle.color}</span>
                            </div>
                          )}
                          {vehicle.observations && (
                            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-3 border border-amber-100">
                              <p className="text-sm font-medium text-amber-800">
                                {vehicle.observations}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {filteredVehicles.length === 0 && !vehiclesLoading && (
                  <div className="p-6">
                    <Card className="border-dashed border-2 border-gray-300 bg-white/50 backdrop-blur-sm">
                      <CardContent className="text-center py-16">
                        <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-6 rounded-full mx-auto mb-6 w-24 h-24 flex items-center justify-center">
                          <Car className="h-12 w-12 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">
                          Nenhum veículo encontrado
                        </h3>
                        <p className="text-gray-600 mb-6">
                          {searchTerm ? 'Tente ajustar os termos de busca.' : 'Comece adicionando seu primeiro veículo.'}
                        </p>
                        {!searchTerm && (
                          <Button
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg"
                            onClick={() => {
                              setEditingVehicle(null);
                              form.reset();
                              setIsDialogOpen(true);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar Primeiro Veículo
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

      <NewServiceModal
        isOpen={isNewServiceModalOpen}
        onClose={() => {
          setIsNewServiceModalOpen(false);
          setSelectedVehicleForService(null);
        }}
      />
    </div>
  );
}