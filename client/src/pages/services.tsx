import { useState, useEffect } from "react";
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
import { Calendar, DollarSign, MoreHorizontal, Plus, Search, Edit, Trash2, Clock, User, Car, Wrench, CheckCircle, XCircle, Timer, BarChart3, FileText, Camera } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceSchema, type Service, type Customer, type Vehicle, type ServiceType, type Photo } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import ServiceAnalytics from "@/components/dashboard/service-analytics";
import { useLocation } from "wouter";
import PhotoUpload from "@/components/photos/photo-upload";
import CameraCapture from "@/components/camera/camera-capture";
import ServiceExtras from "@/components/service/service-extras";

const serviceFormSchema = insertServiceSchema.extend({
  customerId: z.number().min(1, "Cliente é obrigatório"),
  vehicleId: z.number().min(1, "Veículo é obrigatório"),
  serviceTypeId: z.number().min(1, "Tipo de serviço é obrigatório"),
  technicianId: z.number().min(1, "Técnico é obrigatório"),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
  notes: z.string().optional(),
});

export default function Services() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  // Get customer filter from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const customerIdFilter = urlParams.get('customerId') || '';
  const customerFilter = urlParams.get('customer') || '';
  const vehicleIdFilter = urlParams.get('vehicleId');
  const vehiclePlateFilter = urlParams.get('vehiclePlate');

  // Debug logging
  console.log('Services page - location:', location);
  console.log('Services page - window.location.search:', window.location.search);
  console.log('Services page - customerIdFilter:', customerIdFilter);
  console.log('Services page - customerFilter:', customerFilter);

  const [searchTerm, setSearchTerm] = useState(customerFilter);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [currentServicePhotos, setCurrentServicePhotos] = useState<Photo[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [serviceExtras, setServiceExtras] = useState<any[]>([]);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);

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
    toast({
      title: "Foto capturada",
      description: "Foto foi adicionada com sucesso.",
    });
  };

  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof serviceFormSchema>>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      customerId: 0,
      vehicleId: 0,
      serviceTypeId: 0,
      technicianId: 0,
      scheduledDate: "",
      scheduledTime: "",
      status: "scheduled",
      notes: "",
    },
  });

  const { data: services = [] } = useQuery<(Service & { customer: Customer; vehicle: Vehicle; serviceType: ServiceType })[]>({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const res = await fetch("/api/services", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return await res.json();
    },
  });

  const { data: customers = [] } = useQuery<Customer[]>({
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

  const { data: vehicles = [] } = useQuery<(Vehicle & { customer: Customer })[]>({
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

  // Define isLoading based on the main queries
  const isLoading = false; // Since we're using individual queries with default values, we don't need loading state

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("POST", "/api/services", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Serviço criado com sucesso!" });
    },
    onError: (error: any) => {
      console.error("Error creating service:", error);
      toast({ title: "Erro ao criar serviço", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PUT", `/api/services/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsDialogOpen(false);
      setEditingService(null);
      form.reset();
      toast({ title: "Serviço atualizado com sucesso!" });
    },
    onError: (error: any) => {
      console.error("Error updating service:", error);
      toast({ title: "Erro ao atualizar serviço", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/services/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({ title: "Serviço excluído com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir serviço", variant: "destructive" });
    },
  });

  // Calculate total value
  const calculateTotalValue = () => {
    let total = 0;

    // Add service type value
    const selectedServiceTypeId = form.watch("serviceTypeId");
    if (selectedServiceTypeId && serviceTypes) {
      const selectedServiceType = serviceTypes.find(st => st.id === selectedServiceTypeId);
      if (selectedServiceType?.defaultPrice) {
        total += Number(selectedServiceType.defaultPrice);
      }
    }

    // Add service extras values
    serviceExtras.forEach(extra => {
      if (extra.valor && !isNaN(Number(extra.valor))) {
        total += Number(extra.valor);
      }
    });

    return total.toFixed(2);
  };

  const onSubmit = (data: z.infer<typeof serviceFormSchema>) => {
    // Calculate and add total value
    const totalValue = calculateTotalValue();
    const serviceData = {
      ...data,
      estimatedValue: Number(totalValue)
    };

    if (editingService) {
      updateMutation.mutate({ id: editingService.id, data: serviceData });
    } else {
      createMutation.mutate(serviceData);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    form.reset({
      customerId: service.customerId,
      vehicleId: service.vehicleId,
      serviceTypeId: service.serviceTypeId,
      technicianId: service.technicianId || 0,
      scheduledDate: service.scheduledDate || "",
      scheduledTime: service.scheduledTime || "",
      status: service.status || "scheduled",
      notes: service.notes || "",
    });
    fetchServicePhotos(service.id);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este serviço?")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredServices = services.filter((service) => {
    const searchLower = searchTerm.toLowerCase();

    // If we have a customerId filter from URL, only show that customer's services
    if (customerIdFilter) {
      const customerId = parseInt(customerIdFilter);
      const matchesCustomer = service.customerId === customerId;
      const matchesStatus = filterStatus === "all" || service.status === filterStatus;
      return matchesCustomer && matchesStatus;
    }

    // If we have a customer name filter from URL and searchTerm matches it, only show that customer's services
    if (customerFilter && searchTerm === customerFilter) {
      const matchesCustomer = (service.customer?.name || "").toLowerCase() === searchLower;
      const matchesStatus = filterStatus === "all" || service.status === filterStatus;
      return matchesCustomer && matchesStatus;
    }

    // Vehicle Filtering by ID
    if (vehicleIdFilter) {
      const vehicleId = parseInt(vehicleIdFilter);
      const matchesVehicle = service.vehicleId === vehicleId;
      const matchesStatus = filterStatus === "all" || service.status === filterStatus;
      return matchesVehicle && matchesStatus;
    }

    // Otherwise, use the regular search logic
    const matchesSearch = (
      (service.customer?.name || "").toLowerCase().includes(searchLower) ||
      (service.vehicle?.licensePlate || "").toLowerCase().includes(searchLower) ||
      (service.serviceType?.name || "").toLowerCase().includes(searchLower) ||
      (service.notes || "").toLowerCase().includes(searchLower)
    );

    const matchesStatus = filterStatus === "all" || service.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Pre-fill search with customer name or vehicle plate if provided
  useEffect(() => {
    if (customerFilter) {
      setSearchTerm(customerFilter);
    } else if (vehiclePlateFilter) {
      setSearchTerm(decodeURIComponent(vehiclePlateFilter));
    }
  }, [customerFilter, vehiclePlateFilter]);

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
    <div className="flex h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header 
          title="Serviços"
          subtitle="Gerencie os serviços da sua oficina"
        />

        <main className="flex-1 p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-700 via-emerald-600 to-cyan-600 bg-clip-text text-transparent tracking-tight">
                Gestão de Serviços
              </h1>
              <p className="text-teal-700 mt-2 font-medium">Controle completo de ordens de serviço</p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-semibold px-6 py-3 rounded-lg"
                  onClick={() => {
                    setEditingService(null);
                    form.reset();
                    setCurrentServicePhotos([]);
                    setServiceExtras([]);
                  }}
                >
                  <Plus className="h-5 w-5 mr-2" />
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
                            selectedCustomerId ? (vehicle.customerId === selectedCustomerId || vehicle.customer?.id === selectedCustomerId) : true
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
                                  {availableVehicles.map((vehicle) => (
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
                        name="technicianId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Técnico Responsável</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(Number(value))} 
                              value={field.value > 0 ? field.value.toString() : ""}
                            >
                              <FormControl>
                                <SelectTrigger>
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

                    {/* Service Extras Section */}
                    <div className="col-span-2 border-t pt-4">
                      <ServiceExtras
                        serviceId={editingService?.id}
                        onChange={setServiceExtras}
                      />
                    </div>

                    {/* Total Value Section */}
                    <div className="col-span-2 border-t pt-4">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-emerald-800">Valor Total:</span>
                          <span className="text-xl font-bold text-emerald-700">
                            R$ {calculateTotalValue()}
                          </span>
                        </div>
                        <div className="mt-3 flex justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsResumeModalOpen(true)}
                            className="bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-300 hover:border-emerald-400 font-medium px-4 py-2 text-sm transition-all duration-200"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Ver Resumo
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Photos Section */}
                    <div className="col-span-2 border-t pt-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-700">Fotos do Serviço</h4>
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
                        <PhotoUpload
                          photos={currentServicePhotos}
                          onPhotoUploaded={() => fetchServicePhotos(editingService?.id)}
                          serviceId={editingService?.id}
                          maxPhotos={7}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsDialogOpen(false);
                          setCurrentServicePhotos([]);
                          setServiceExtras([]);
                        }}
                        className="px-6 py-2 font-medium"
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-2 font-semibold"
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        {editingService ? "Atualizar Serviço" : "Criar Serviço"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Analytics Modal */}
            <Dialog open={isAnalyticsModalOpen} onOpenChange={setIsAnalyticsModalOpen}>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Relatório de Serviços
                  </DialogTitle>
                </DialogHeader>
                <ServiceAnalytics />
              </DialogContent>
            </Dialog>

            {/* Camera Capture Modal */}
            <CameraCapture
              isOpen={isCameraOpen}
              onClose={() => setIsCameraOpen(false)}
              onPhotoTaken={handlePhotoTaken}
              serviceId={editingService?.id}
            />

            {/* Service Resume Modal */}
            <Dialog open={isResumeModalOpen} onOpenChange={setIsResumeModalOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center text-emerald-800">
                    <FileText className="h-5 w-5 mr-2" />
                    Resumo do Serviço
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Service Type */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Wrench className="h-5 w-5 text-blue-600 mr-2" />
                        <span className="font-medium text-blue-800">Tipo de Serviço</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-blue-700">
                          {(() => {
                            const selectedServiceTypeId = form.watch("serviceTypeId");
                            const selectedServiceType = serviceTypes.find(st => st.id === selectedServiceTypeId);
                            return selectedServiceType?.name || "Nenhum tipo selecionado";
                          })()}
                        </span>
                        <span className="text-sm font-bold text-blue-800">
                          R$ {(() => {
                            const selectedServiceTypeId = form.watch("serviceTypeId");
                            const selectedServiceType = serviceTypes.find(st => st.id === selectedServiceTypeId);
                            return Number(selectedServiceType?.defaultPrice || 0).toFixed(2);
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Service Extras */}
                  {serviceExtras.length > 0 && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <Plus className="h-5 w-5 text-purple-600 mr-2" />
                        <span className="font-medium text-purple-800">Adicionais</span>
                      </div>
                      <div className="space-y-2">
                        {serviceExtras.map((extra, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="text-purple-700">{extra.adicional || "Adicional"}</span>
                            <span className="font-medium text-purple-800">
                              R$ {Number(extra.valor || 0).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No Extras Message */}
                  {serviceExtras.length === 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                      <span className="text-sm text-gray-600">Nenhum adicional selecionado</span>
                    </div>
                  )}

                  {/* Total */}
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <DollarSign className="h-6 w-6 text-emerald-600 mr-2" />
                        <span className="text-lg font-bold text-emerald-800">Valor Total</span>
                      </div>
                      <span className="text-2xl font-bold text-emerald-700">
                        R$ {calculateTotalValue()}
                      </span>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-teal-500 h-4 w-4" />
              <Input
                placeholder="Buscar por cliente, veículo, tipo de serviço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 border-2 border-teal-200 focus:border-emerald-400 rounded-xl shadow-sm bg-white/90 backdrop-blur-sm"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48 h-12 border-2 border-teal-200 focus:border-emerald-400 rounded-xl shadow-sm bg-white/90 backdrop-blur-sm">
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

            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setIsAnalyticsModalOpen(true)}
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                📊 Ver Relatórios
              </Button>
              <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-4 py-2 rounded-lg shadow-md">
                <span className="font-semibold">{filteredServices.length}</span>
                <span className="ml-1 text-sm">serviços</span>
              </div>
            </div>
          </div>

          {/* Services Grid */}
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
          ) : filteredServices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Card className="w-full max-w-md text-center bg-white/80 backdrop-blur-sm border border-teal-200">
                <CardContent className="pt-8 pb-6">
                  <Wrench className="h-16 w-16 text-teal-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Nenhum serviço encontrado
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {searchTerm || filterStatus !== "all" ? 'Tente ajustar os filtros de busca.' : 'Comece criando o primeiro serviço.'}
                  </p>
                  {!searchTerm && filterStatus === "all" && (
                    <Button
                      className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg"
                      onClick={() => {
                        setEditingService(null);
                        form.reset();
                        setIsDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeiro Serviço
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map((service) => (
                <Card key={service.id} className="bg-white/90 backdrop-blur-sm border border-teal-200 hover:shadow-lg transition-all duration-300 hover:border-emerald-300">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-bold text-teal-800 mb-1">
                          {service.serviceType?.name || 'Tipo não especificado'}
                        </CardTitle>
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <User className="h-4 w-4 mr-1" />
                          {service.customer?.name || 'Cliente não encontrado'}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Car className="h-4 w-4 mr-1" />
                          {service.vehicle?.licensePlate || 'Placa não informada'} - {service.vehicle?.brand} {service.vehicle?.model}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={`${getStatusBadge(service.status || 'scheduled')} font-medium`}>
                          {service.status === 'scheduled' && 'Agendado'}
                          {service.status === 'in_progress' && 'Em Andamento'}
                          {service.status === 'completed' && 'Concluído'}
                          {service.status === 'cancelled' && 'Cancelado'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLocation(`/service-photos?serviceId=${service.id}`)}
                          className="h-8 w-8 p-0 hover:bg-blue-100 text-blue-600"
                          title="Ver fotos do serviço"
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(service)}
                          className="h-8 w-8 p-0 hover:bg-teal-100"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(service.id)}
                          className="h-8 w-8 p-0 hover:bg-red-100 text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {service.scheduledDate && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="font-medium">
                            {new Date(service.scheduledDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                            {service.scheduledTime && ` às ${service.scheduledTime.slice(0, 5)}`}
                          </span>
                        </div>
                      )}
                      {service.estimatedValue && (
                        <div className="flex items-center text-sm font-semibold text-emerald-600">
                          <DollarSign className="h-4 w-4 mr-2" />
                          R$ {Number(service.estimatedValue).toFixed(2)}
                        </div>
                      )}
                      {service.notes && (
                        <div className="flex items-start text-sm text-gray-600 mt-2">
                          <FileText className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{service.notes}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}