
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceSchema, type Customer, type Vehicle, type ServiceType } from "@shared/schema";
import { z } from "zod";
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

  const { data: customers, isLoading: loadingCustomers } = useQuery({
    queryKey: ["/api/customers"],
    enabled: isOpen,
  });

  const { data: vehicles, isLoading: loadingVehicles } = useQuery({
    queryKey: ["/api/vehicles"],
    enabled: isOpen,
  });

  const { data: serviceTypes, isLoading: loadingServiceTypes } = useQuery({
    queryKey: ["/api/service-types"],
    enabled: isOpen,
  });

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: isOpen,
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Novo Serviço</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          const numValue = parseInt(value);
                          field.onChange(numValue);
                          form.setValue("vehicleId", 0);
                        }}
                        value={field.value ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger>
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
                    <FormItem>
                      <FormLabel>Veículo</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          const numValue = parseInt(value);
                          field.onChange(numValue);
                        }}
                        value={field.value ? field.value.toString() : ""}
                        disabled={!selectedCustomerId}
                      >
                        <FormControl>
                          <SelectTrigger>
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
                  <FormItem>
                    <FormLabel>Tipo de Serviço</FormLabel>
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
                        <SelectTrigger>
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
                  <FormItem>
                    <FormLabel>Técnico Responsável</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        const numValue = parseInt(value);
                        field.onChange(numValue);
                      }}
                      value={field.value ? field.value.toString() : ""}
                    >
                      <FormControl>
                        <SelectTrigger>
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
                    <FormItem>
                      <FormLabel>Data Agendada</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
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
                      <FormLabel>Horário</FormLabel>
                      <FormControl>
                        <Input {...field} type="time" />
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
                      <Textarea {...field} rows={3} placeholder="Observações sobre o serviço..." />
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
                name="notes"map((extra, index) => (
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
                  onClick={onClose}
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
    </Dialog>
  );
}
