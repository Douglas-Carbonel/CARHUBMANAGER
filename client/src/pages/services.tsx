import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Edit, Trash2, Search, Filter, User, Car, Calendar, Clock, DollarSign, MapPin, Wrench } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import PageLayout from "@/components/layout/page-layout";
import PageTitle from "@/components/layout/page-title";
import NewServiceModal from "@/components/modals/new-service-modal";
import { useToast } from "@/hooks/use-toast";
import type { Service } from "@/shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceSchema, type Customer, type Vehicle, type ServiceType } from "@shared/schema";
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

  const { data: services = [], isLoading } = useQuery<(Service & { customer: Customer; vehicle: Vehicle; serviceType: ServiceType })[]>({
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

  const filteredServices = services.filter((service) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (service.customer?.name || "").toLowerCase().includes(searchLower) ||
      (service.vehicle?.licensePlate || service.vehicle?.plate || "").toLowerCase().includes(searchLower) ||
      (service.serviceType?.name || "").toLowerCase().includes(searchLower) ||
      (service.notes || "").toLowerCase().includes(searchLower)
    );
  });

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
    <PageLayout title="Serviços" subtitle="Gerencie os serviços da oficina">
      <div className="space-y-6">
        <PageTitle 
          title="Serviços" 
          subtitle="Gerencie todos os serviços da oficina"
          icon={<Wrench className="h-6 w-6" />}
        />
        <div className="flex items-center justify-between">
          <div>
          </div>

          <NewServiceModal />
        </div>

        <div className="grid gap-4">
          <div className="border p-4 rounded-md">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Filtros</h2>
              <Button variant="ghost">
                <Filter className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            </div>
            <div className="mt-4">
              <Input
                type="search"
                placeholder="Buscar..."
                className="w-full"
              />
            </div>
          </div>

          {isLoading ? (
            <div>Carregando serviços...</div>
          ) : (
            filteredServices.map((service) => (
              <Card key={service.id}>
                <CardHeader>
                  <div className="flex justify-between">
                    <CardTitle>
                      <div className="flex items-center space-x-2">
                        <Wrench className="h-4 w-4 text-gray-500" />
                        <span>{service.serviceType?.name}</span>
                      </div>
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 grid-cols-2">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span>{service.customer?.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Car className="h-4 w-4 text-gray-500" />
                      <span>{`${service.vehicle?.licensePlate || service.vehicle?.plate} - ${service.vehicle?.model}`}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>{format(new Date(service.scheduledDate), "dd/MM/yyyy")}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span>{service.scheduledTime}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span>{service.estimatedValue}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <Badge className={getStatusBadge(service.status || "scheduled")}>
                        {service.status === "scheduled" && "Agendado"}
                        {service.status === "in_progress" && "Em Andamento"}
                        {service.status === "completed" && "Concluído"}
                        {service.status === "cancelled" && "Cancelado"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </PageLayout>
  );
}