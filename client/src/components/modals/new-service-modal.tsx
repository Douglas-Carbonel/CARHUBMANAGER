
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceSchema, type Customer, type Vehicle, type ServiceType } from "@shared/schema";
import { z } from "zod";
import { User, Car, Wrench, Calendar, Clock } from "lucide-react";
import ServiceExtras from "@/components/service/service-extras";

interface NewServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const serviceSchemaWithoutEstimated = insertServiceSchema.omit({ estimatedValue: true });

export default function NewServiceModal({ isOpen, onClose }: NewServiceModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [serviceExtras, setServiceExtras] = useState<any[]>([]);
  const [formInitialValues, setFormInitialValues] = useState<any>(null);

  const form = useForm<z.infer<typeof serviceSchemaWithoutEstimated>>({
    resolver: zodResolver(serviceSchemaWithoutEstimated),
    defaultValues: {
      customerId: 0,
      vehicleId: 0,
      serviceTypeId: 0,
      technicianId: 0,
      status: "scheduled",
      scheduledDate: "",
      scheduledTime: "",
      notes: "",
    },
  });

  // Track form changes for unsaved changes detection
  const currentFormValues = form.watch();
  
  // Check if form has meaningful changes (ignore empty -> 0 changes for numeric fields)
  const hasFormChanges = useMemo(() => {
    if (!formInitialValues || !isOpen) {
      console.log('NewServiceModal - No initial values or modal closed:', { formInitialValues, isOpen });
      return false;
    }
    
    // Compare each field individually for better control
    const current = currentFormValues;
    const initial = formInitialValues;
    
    // Check if any field has changed from its initial value
    const customersChanged = current.customerId !== initial.customerId;
    const vehicleChanged = current.vehicleId !== initial.vehicleId;
    const serviceTypeChanged = current.serviceTypeId !== initial.serviceTypeId;
    const technicianChanged = current.technicianId !== initial.technicianId;
    const statusChanged = current.status !== initial.status;
    const dateChanged = (current.scheduledDate || "") !== (initial.scheduledDate || "");
    const timeChanged = (current.scheduledTime || "") !== (initial.scheduledTime || "");
    const notesChanged = (current.notes || "").trim() !== (initial.notes || "").trim();
    
    const anyFieldChanged = customersChanged || vehicleChanged || serviceTypeChanged || 
                           technicianChanged || statusChanged || dateChanged || timeChanged || notesChanged;
    
    console.log('NewServiceModal - Form field changes:', {
      current: {
        customerId: current.customerId,
        vehicleId: current.vehicleId,
        serviceTypeId: current.serviceTypeId,
        technicianId: current.technicianId,
        status: current.status,
        scheduledDate: current.scheduledDate,
        scheduledTime: current.scheduledTime,
        notes: current.notes
      },
      initial: {
        customerId: initial.customerId,
        vehicleId: initial.vehicleId,
        serviceTypeId: initial.serviceTypeId,
        technicianId: initial.technicianId,
        status: initial.status,
        scheduledDate: initial.scheduledDate,
        scheduledTime: initial.scheduledTime,
        notes: initial.notes
      },
      changes: {
        customersChanged, vehicleChanged, serviceTypeChanged, technicianChanged,
        statusChanged, dateChanged, timeChanged, notesChanged
      },
      anyFieldChanged
    });
    
    return anyFieldChanged;
  }, [currentFormValues, formInitialValues, isOpen]);
  
  const hasUnsavedChanges = hasFormChanges || serviceExtras.length > 0;
  
  // Debug logs
  console.log('NewServiceModal - hasUnsavedChanges:', hasUnsavedChanges);
  console.log('NewServiceModal - hasFormChanges:', hasFormChanges);
  console.log('NewServiceModal - serviceExtras.length:', serviceExtras.length);
  console.log('NewServiceModal - formInitialValues:', formInitialValues);
  console.log('NewServiceModal - currentFormValues:', currentFormValues);
  console.log('NewServiceModal - isOpen:', isOpen);

  const unsavedChanges = useUnsavedChanges({
    hasUnsavedChanges: !!hasUnsavedChanges,
    message: "Você tem alterações não salvas no cadastro do serviço. Deseja realmente sair?"
  });

  // Intercepta o fechamento do modal para verificar alterações não salvas
  const handleClose = () => {
    console.log('NewServiceModal - handleClose called');
    console.log('NewServiceModal - hasUnsavedChanges:', hasUnsavedChanges);
    console.log('NewServiceModal - hasFormChanges:', hasFormChanges);
    console.log('NewServiceModal - serviceExtras length:', serviceExtras.length);
    console.log('NewServiceModal - form values:', form.getValues());
    console.log('NewServiceModal - initial values:', formInitialValues);
    
    if (hasUnsavedChanges) {
      console.log('NewServiceModal - Triggering confirmation dialog');
      unsavedChanges.triggerConfirmation(() => {
        console.log('NewServiceModal - User confirmed exit, cleaning up...');
        onClose();
        form.reset();
        setServiceExtras([]);
        setFormInitialValues(null);
      });
    } else {
      console.log('NewServiceModal - No unsaved changes, closing directly');
      onClose();
      form.reset();
      setServiceExtras([]);
      setFormInitialValues(null);
    }
  };

  // Initialize form values when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('NewServiceModal: Modal opened, initializing form...');
      
      // Use a timeout to ensure the form is ready
      setTimeout(() => {
        const defaultValues = {
          customerId: 0,
          vehicleId: 0,
          serviceTypeId: 0,
          technicianId: 0,
          status: "scheduled" as "scheduled" | "in_progress" | "completed" | "cancelled",
          scheduledDate: "",
          scheduledTime: "",
          notes: "",
        };
        
        // Check URL params to pre-select customer if coming from customer page
        const urlParams = new URLSearchParams(window.location.search);
        const customerIdFromUrl = urlParams.get('customerId');
        const vehicleIdFromUrl = urlParams.get('vehicleId');
        
        if (customerIdFromUrl) {
          const customerId = parseInt(customerIdFromUrl);
          console.log('NewServiceModal: Pre-selecting customer from URL:', customerId);
          defaultValues.customerId = customerId;
        }
        
        if (vehicleIdFromUrl) {
          const vehicleId = parseInt(vehicleIdFromUrl);
          console.log('NewServiceModal: Pre-selecting vehicle from URL:', vehicleId);
          defaultValues.vehicleId = vehicleId;
        }
        
        console.log('NewServiceModal: Setting initial values to:', defaultValues);
        
        // Reset form first to clear any previous values
        form.reset(defaultValues);
        
        // Then set initial values for comparison - adding a small delay to ensure form is updated
        setTimeout(() => {
          setFormInitialValues({ ...defaultValues });
          console.log('NewServiceModal: Initial values set for comparison:', defaultValues);
        }, 50);
        
        setServiceExtras([]);
      }, 150);
    } else {
      // Reset when modal closes
      console.log('NewServiceModal: Modal closed, resetting...');
      setFormInitialValues(null);
      setServiceExtras([]);
    }
  }, [isOpen, form]);

  const { data: customers = [], isLoading: loadingCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    enabled: isOpen,
    queryFn: async () => {
      const res = await fetch("/api/customers", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return await res.json();
    },
  });

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    enabled: isOpen,
    queryFn: async () => {
      const res = await fetch("/api/vehicles", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return await res.json();
    },
  });

  const { data: serviceTypes = [], isLoading: loadingServiceTypes } = useQuery<ServiceType[]>({
    queryKey: ["/api/service-types"],
    enabled: isOpen,
    queryFn: async () => {
      const res = await fetch("/api/service-types", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return await res.json();
    },
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    enabled: isOpen,
    queryFn: async () => {
      const res = await fetch("/api/admin/users", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return await res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const totalValue = calculateTotalValue();
      const serviceData = {
        ...data,
        estimatedValue: totalValue,
        notes: data.notes || undefined,
        scheduledTime: data.scheduledTime || undefined,
        scheduledDate: data.scheduledDate || new Date().toISOString().split('T')[0],
      };
      
      console.log('Creating service with data:', serviceData);
      await apiRequest("POST", "/api/services", serviceData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/upcoming-appointments"] });
      toast({
        title: "Sucesso",
        description: "Serviço criado com sucesso!",
      });
      onClose();
      form.reset();
      setServiceExtras([]);
      setFormInitialValues(null);
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

  const onSubmit = (data: z.infer<typeof serviceSchemaWithoutEstimated>) => {
    console.log('New Service Modal - Submitting data:', data);
    createMutation.mutate(data);
  };

  const getCustomerVehicles = (customerId: number) => {
    if (!customerId || !vehicles) return [];
    const customerVehicles = vehicles.filter((v: Vehicle) => v.customerId === customerId);
    return customerVehicles;
  };

  const selectedCustomerId = form.watch("customerId");
  const selectedServiceTypeId = form.watch("serviceTypeId");

  // Calculate total value
  const calculateTotalValue = () => {
    let total = 0;
    
    // Add service type value
    if (selectedServiceTypeId && serviceTypes) {
      const selectedServiceType = serviceTypes.find((st: ServiceType) => st.id === selectedServiceTypeId);
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

  const selectedServiceType = serviceTypes?.find((st: ServiceType) => st.id === selectedServiceTypeId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        handleClose();
      }
    }}>
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
                          {loadingCustomers ? (
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
                  render={({ field }) => (
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
                          ) : loadingVehicles ? (
                            <SelectItem value="loading" disabled>Carregando...</SelectItem>
                          ) : getCustomerVehicles(selectedCustomerId).length > 0 ? (
                            getCustomerVehicles(selectedCustomerId).map((vehicle: Vehicle) => (
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
                  )}
                />
              </div>

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
                      onValueChange={(value) => {
                        const numValue = parseInt(value);
                        field.onChange(numValue);
                        // Reset extras when service type changes
                        setServiceExtras([]);
                      }}
                      value={field.value ? field.value.toString() : ""}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md">
                          <SelectValue placeholder="Selecione o tipo de serviço" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {loadingServiceTypes ? (
                          <SelectItem value="loading" disabled>Carregando...</SelectItem>
                        ) : serviceTypes && serviceTypes.length > 0 ? (
                          serviceTypes.map((serviceType: ServiceType) => (
                            <SelectItem key={serviceType.id} value={serviceType.id.toString()}>
                              {serviceType.name} - R$ {Number(serviceType.defaultPrice || 0).toFixed(2)}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="empty" disabled>Nenhum tipo de serviço encontrado</SelectItem>
                        )}
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
                        {loadingUsers ? (
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

              {/* Service Extras Section */}
              <div>
                <Card className="border border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-700">Adicionais do Serviço</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedServiceTypeId ? (
                      <ServiceExtras
                        onChange={setServiceExtras}
                        initialExtras={[]}
                      />
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <p className="text-sm">Selecione um tipo de serviço primeiro para adicionar extras</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Service Summary */}
              {selectedServiceTypeId && (
                <Card className="border border-emerald-200 bg-emerald-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-emerald-800">Resumo do Serviço</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-emerald-700">Tipo de serviço:</span>
                        <span className="text-sm font-medium text-emerald-700">
                          {selectedServiceType?.name}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-emerald-700">Valor base:</span>
                        <span className="text-sm font-medium text-emerald-700">
                          R$ {Number(selectedServiceType?.defaultPrice || 0).toFixed(2)}
                        </span>
                      </div>
                      {serviceExtras.length > 0 && (
                        <>
                          <div className="border-t border-emerald-300 my-2"></div>
                          <div className="text-xs font-medium text-emerald-800 mb-1">Adicionais:</div>
                          {serviceExtras.map((extra, index) => (
                            <div key={index} className="flex justify-between items-center text-xs">
                              <span className="text-emerald-700">{extra.descricao}:</span>
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
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Observações sobre o serviço..."
                        rows={3}
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedServiceTypeId && (
                <Card className="border-emerald-200 bg-emerald-50/50 backdrop-blur-sm shadow-sm">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-emerald-700">Serviço Base:</span>
                        <span className="text-sm font-medium text-emerald-700">
                          R$ {Number(selectedServiceType?.defaultPrice || 0).toFixed(2)}
                        </span>
                      </div>
                      {serviceExtras.length > 0 && (
                        <>
                          {serviceExtras.map((extra, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <span className="text-xs text-emerald-600">
                                {extra.serviceExtra?.descricao || 'Adicional'}
                              </span>
                              <span className="text-xs font-medium text-emerald-600">
                                R$ {Number(extra.valor || 0).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </>
                      )}
                      <div className="border-t border-emerald-300 my-2"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-emerald-800">Valor Total:</span>
                        <span className="text-xl font-bold text-emerald-700">R$ {calculateTotalValue()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={handleClose}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  className="bg-primary hover:bg-primary/90"
                  disabled={createMutation.isPending || !selectedServiceTypeId}
                >
                  {createMutation.isPending ? "Criando..." : "Criar Serviço"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
      
      {/* Dialog de confirmação de alterações não salvas */}
      <UnsavedChangesDialog
        isOpen={unsavedChanges.showConfirmDialog}
        onConfirm={unsavedChanges.confirmNavigation}
        onCancel={unsavedChanges.cancelNavigation}
        message={unsavedChanges.message}
      />
    </Dialog>
  );
}
