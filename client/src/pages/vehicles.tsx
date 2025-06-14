
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Car, User, Check, ChevronsUpDown, Wrench, FileText } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVehicleSchema, type Vehicle, type Customer } from "@shared/schema";
import { z } from "zod";
import { vehicleBrands, vehicleModels, fuelTypes } from "@/lib/vehicle-data";
import { cn } from "@/lib/utils";
import VehicleAnalytics from "@/components/dashboard/vehicle-analytics";
import { BarChart3 } from "lucide-react";

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

const vehicleFormSchema = insertVehicleSchema;
type VehicleFormData = z.infer<typeof vehicleFormSchema>;

export default function VehiclesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [customerFilter, setCustomerFilter] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [openBrandSelect, setOpenBrandSelect] = useState(false);
  const [openModelSelect, setOpenModelSelect] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [customModel, setCustomModel] = useState("");
  const [showCustomModel, setShowCustomModel] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);

  // Check URL parameters for customer filtering
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const customerId = urlParams.get('customerId');
    if (customerId) {
      setCustomerFilter(parseInt(customerId));
    }
  }, []);

  // Função para formatar placa do veículo
  const formatLicensePlate = (value: string): string => {
    // Remove tudo que não for letra ou número
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Aplica formatação baseada no padrão brasileiro
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 7) {
      // Formato antigo: ABC-1234
      return cleaned.replace(/^([A-Z]{1,3})([0-9]{0,4})$/, '$1-$2');
    } else {
      // Formato Mercosul: ABC1D23
      return cleaned.replace(/^([A-Z]{3})([0-9]{1})([A-Z]{1})([0-9]{2})$/, '$1$2$3$4');
    }
  };

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      licensePlate: "",
      brand: "",
      model: "",
      year: 2024,
      color: "",
      fuelType: "gasoline",
      customerId: 1,
    },
  });

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/vehicles");
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

  const createMutation = useMutation({
    mutationFn: async (data: VehicleFormData) => {
      const res = await apiRequest("POST", "/api/vehicles", data);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setIsModalOpen(false);
      setEditingVehicle(null);
      form.reset();
      setShowCustomModel(false);
      setCustomModel("");
      
      toast({
        title: "Veículo cadastrado!",
        description: "Veículo foi adicionado com sucesso à frota!",
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
    mutationFn: async ({ id, data }: { id: number; data: VehicleFormData }) => {
      const res = await apiRequest("PUT", `/api/vehicles/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setIsModalOpen(false);
      setEditingVehicle(null);
      form.reset();
      setShowCustomModel(false);
      setCustomModel("");
      toast({
        title: "Veículo atualizado",
        description: "Veículo foi atualizado com sucesso.",
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
      const response = await apiRequest("DELETE", `/api/vehicles/${id}`);
      
      // Se a resposta não for ok, lançar erro com a mensagem do servidor
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao remover veículo");
      }
      
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({
        title: "Veículo removido",
        description: "Veículo foi removido com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover veículo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: VehicleFormData) => {
    const finalData = {
      ...data,
      model: showCustomModel ? customModel : data.model,
    };

    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, data: finalData });
    } else {
      createMutation.mutate(finalData);
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setSelectedBrand(vehicle.brand);
    
    // Verificar se o modelo existe na lista ou é customizado
    const modelsForBrand = vehicleModels[vehicle.brand] || [];
    const isCustomModel = !modelsForBrand.includes(vehicle.model);
    
    if (isCustomModel) {
      setShowCustomModel(true);
      setCustomModel(vehicle.model);
    } else {
      setShowCustomModel(false);
      setCustomModel("");
    }

    form.reset({
      licensePlate: vehicle.licensePlate,
      brand: vehicle.brand,
      model: isCustomModel ? "" : vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      fuelType: vehicle.fuelType as "gasoline" | "ethanol" | "flex" | "diesel",
      customerId: vehicle.customerId,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    const confirmed = confirm(
      "Tem certeza que deseja remover este veículo?\n\n" +
      "ATENÇÃO: O veículo não poderá ser removido se houver serviços em aberto " +
      "(agendados ou em andamento). Finalize ou cancele todos os serviços antes de excluir."
    );
    
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

  const handleModelSelect = (model: string) => {
    if (model === "custom") {
      setShowCustomModel(true);
      form.setValue("model", "");
      setOpenModelSelect(false);
    } else {
      setShowCustomModel(false);
      setCustomModel("");
      form.setValue("model", model);
      setOpenModelSelect(false);
    }
  };

  const filteredVehicles = vehicles.filter((vehicle: Vehicle) => {
    const matchesSearch = 
      vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vehicle.color || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCustomer = customerFilter ? vehicle.customerId === customerFilter : true;
    
    return matchesSearch && matchesCustomer;
  });

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Veículos"
          subtitle="Gerencie a frota de veículos"
        />

        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white/80 via-blue-50/50 to-indigo-50/30 backdrop-blur-sm">
          <div className="p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
              <div className="flex-1 max-w-md space-y-3">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="Buscar veículos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 w-80 h-12 border-2 border-gray-200 focus:border-blue-400 rounded-xl shadow-sm bg-white/80"
                  />
                </div>
                {customerFilter && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                      Cliente: {customers.find(c => c.id === customerFilter)?.name || 'Desconhecido'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCustomerFilter(null);
                        window.history.replaceState({}, '', '/vehicles');
                      }}
                      className="h-6 w-6 p-0 hover:bg-red-100"
                    >
                      ×
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setIsAnalyticsModalOpen(true)}
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  📊 Ver Relatórios
                </Button>
                <div className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-4 py-2 rounded-lg shadow-md">
                  <span className="font-semibold">{filteredVehicles.length}</span>
                  <span className="ml-1 text-sm">veículos</span>
                </div>
              </div>
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    onClick={() => {
                      setEditingVehicle(null);
                      setShowCustomModel(false);
                      setCustomModel("");
                      setSelectedBrand("");
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
                          name="licensePlate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Placa</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="ABC-1234 ou ABC1D23" 
                                  {...field}
                                  onChange={(e) => {
                                    const formatted = formatLicensePlate(e.target.value);
                                    field.onChange(formatted);
                                  }}
                                  maxLength={8}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="brand"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Marca</FormLabel>
                              <Popover open={openBrandSelect} onOpenChange={setOpenBrandSelect}>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className={cn(
                                        "w-full justify-between",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      {field.value || "Selecione a marca"}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0">
                                  <Command>
                                    <CommandInput placeholder="Buscar marca..." />
                                    <CommandList>
                                      <CommandEmpty>Nenhuma marca encontrada.</CommandEmpty>
                                      <CommandGroup>
                                        {vehicleBrands.map((brand) => (
                                          <CommandItem
                                            value={brand}
                                            key={brand}
                                            onSelect={() => {
                                              form.setValue("brand", brand);
                                              setSelectedBrand(brand);
                                              if (form.getValues("model") && !vehicleModels[brand]?.includes(form.getValues("model"))) {
                                                form.setValue("model", "");
                                              }
                                              setOpenBrandSelect(false);
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                brand === field.value ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            {brand}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="model"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Modelo</FormLabel>
                              {!showCustomModel ? (
                                <Popover open={openModelSelect} onOpenChange={setOpenModelSelect}>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant="outline"
                                        role="combobox"
                                        disabled={!selectedBrand && !form.getValues("brand")}
                                        className={cn(
                                          "w-full justify-between",
                                          !field.value && "text-muted-foreground"
                                        )}
                                      >
                                        {field.value || "Selecione o modelo"}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-full p-0">
                                    <Command>
                                      <CommandInput placeholder="Buscar modelo..." />
                                      <CommandList>
                                        <CommandEmpty>Nenhum modelo encontrado.</CommandEmpty>
                                        <CommandGroup>
                                          {vehicleModels[selectedBrand || form.getValues("brand")]?.map((model) => (
                                            <CommandItem
                                              value={model}
                                              key={model}
                                              onSelect={() => handleModelSelect(model)}
                                            >
                                              <Check
                                                className={cn(
                                                  "mr-2 h-4 w-4",
                                                  model === field.value ? "opacity-100" : "opacity-0"
                                                )}
                                              />
                                              {model}
                                            </CommandItem>
                                          ))}
                                          <CommandItem
                                            value="custom"
                                            onSelect={() => handleModelSelect("custom")}
                                            className="border-t border-gray-200 text-blue-600 font-medium"
                                          >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Digite um modelo customizado
                                          </CommandItem>
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                              ) : (
                                <div className="space-y-2">
                                  <FormControl>
                                    <Input 
                                      placeholder="Digite o modelo customizado"
                                      value={customModel}
                                      onChange={(e) => setCustomModel(e.target.value)}
                                    />
                                  </FormControl>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setShowCustomModel(false);
                                      setCustomModel("");
                                      form.setValue("model", "");
                                    }}
                                  >
                                    Voltar para lista
                                  </Button>
                                </div>
                              )}
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
                                  placeholder="2024" 
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="color"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cor</FormLabel>
                              <FormControl>
                                <Input placeholder="Branco" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="fuelType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Combustível</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o combustível" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {fuelTypes.map((fuel) => (
                                    <SelectItem key={fuel.value} value={fuel.value}>
                                      {fuel.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-end gap-4 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsModalOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createMutation.isPending || updateMutation.isPending}
                        >
                          {editingVehicle ? "Atualizar" : "Cadastrar"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Analytics Modal */}
            <Dialog open={isAnalyticsModalOpen} onOpenChange={setIsAnalyticsModalOpen}>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Relatório de Veículos
                  </DialogTitle>
                </DialogHeader>
                <VehicleAnalytics />
              </DialogContent>
            </Dialog>

            {vehiclesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="bg-gradient-to-br from-teal-100 to-emerald-100 p-6 rounded-full mb-6 w-24 h-24 flex items-center justify-center">
                  <Car className="h-12 w-12 text-teal-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Nenhum veículo encontrado
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm ? 'Tente ajustar os termos de busca.' : 'Comece adicionando seu primeiro veículo.'}
                </p>
                {!searchTerm && (
                  <Button
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    onClick={() => {
                      setEditingVehicle(null);
                      form.reset();
                      setIsModalOpen(true);
                    }}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Adicionar Primeiro Veículo
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredVehicles.map((vehicle: Vehicle) => {
                  const customer = customers.find((c: Customer) => c.id === vehicle.customerId);
                  return (
                    <div key={vehicle.id} className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-teal-200 overflow-hidden">
                      {/* Background gradient sutil */}
                      <div className="absolute inset-0 bg-gradient-to-br from-teal-50/30 to-emerald-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      {/* Header colorido */}
                      <div className="relative h-20 bg-gradient-to-r from-teal-500 to-emerald-600 p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white font-bold text-lg border border-white/30">
                            <Car className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="text-white font-semibold truncate max-w-32">
                              {vehicle.brand} {vehicle.model}
                            </h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-teal-100 bg-white/20 px-2 py-0.5 rounded-full font-mono">
                                {vehicle.licensePlate}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Actions no header */}
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(vehicle)}
                            className="h-8 w-8 p-0 text-white hover:bg-white/20 border-0"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(vehicle.id)}
                            className="h-8 w-8 p-0 text-white hover:bg-red-500/20 border-0"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Conteúdo */}
                      <div className="relative p-5">
                        {/* Informações do cliente */}
                        <div className="mb-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            <User className="h-3 w-3 mr-1" />
                            {customer?.name || 'Cliente não encontrado'}
                          </span>
                        </div>

                        {/* Informações do veículo */}
                        <div className="space-y-3 mb-6">
                          <div className="flex items-center text-sm">
                            <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center mr-3">
                              <span className="text-gray-500 text-xs">📅</span>
                            </div>
                            <span className="text-gray-900 text-xs font-semibold">
                              {vehicle.year}
                            </span>
                          </div>
                          
                          <div className="flex items-center text-sm">
                            <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center mr-3">
                              <span className="text-gray-500 text-xs">🎨</span>
                            </div>
                            <span className="text-gray-700 text-xs">
                              {vehicle.color}
                            </span>
                          </div>
                          
                          <div className="flex items-center text-sm">
                            <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center mr-3">
                              <span className="text-gray-500 text-xs">⛽</span>
                            </div>
                            <span className="text-gray-700 text-xs capitalize">
                              {fuelTypes.find(f => f.value === vehicle.fuelType)?.label || vehicle.fuelType}
                            </span>
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="space-y-2">
                          <Button
                            onClick={() => setLocation(`/services?vehicleId=${vehicle.id}`)}
                            className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-sm rounded-xl h-10"
                            size="sm"
                          >
                            <Wrench className="h-4 w-4 mr-2" />
                            Serviços
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/reports?vehicleId=${vehicle.id}`)}
                            className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl h-9"
                          >
                            <FileText className="h-3 w-3 mr-2" />
                            <span className="text-xs">Histórico</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
