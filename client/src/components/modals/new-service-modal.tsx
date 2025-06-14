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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceSchema, type Customer, type Vehicle, type ServiceType } from "@shared/schema";
import { z } from "zod";

interface NewServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewServiceModal({ isOpen, onClose }: NewServiceModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof insertServiceSchema>>({
    resolver: zodResolver(insertServiceSchema),
    defaultValues: {
      customerId: 0,
      vehicleId: 0,
      serviceTypeId: 0,
      status: "scheduled",
      scheduledDate: "",
      scheduledTime: "",
      estimatedValue: "",
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

  // Debug logs
  console.log('Modal aberto:', isOpen);
  console.log('Customers:', customers);
  console.log('Vehicles:', vehicles);
  console.log('Service Types:', serviceTypes);

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertServiceSchema>) => {
      await apiRequest("POST", "/api/services", data);
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

  const onSubmit = (data: z.infer<typeof insertServiceSchema>) => {
    // Transform the data to match the backend schema
    const serviceData = {
      ...data,
      estimatedValue: data.estimatedValue && data.estimatedValue !== "" ? data.estimatedValue : undefined,
      notes: data.notes || undefined,
      scheduledTime: data.scheduledTime || undefined,
    };

    createMutation.mutate(serviceData);
  };

  const getCustomerVehicles = (customerId: number) => {
    if (!customerId || !vehicles) return [];
    const customerVehicles = vehicles.filter((v: Vehicle) => v.customerId === customerId);
    console.log('Veículos para cliente', customerId, ':', customerVehicles);
    return customerVehicles;
  };

  const selectedCustomerId = form.watch("customerId");

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
                          form.setValue("vehicleId", 0); // Reset vehicle when customer changes
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
                              {serviceType.name}
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
                name="estimatedValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Estimado</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" placeholder="0,00" />
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
                      <Textarea {...field} rows={3} placeholder="Observações sobre o serviço..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                  disabled={createMutation.isPending}
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