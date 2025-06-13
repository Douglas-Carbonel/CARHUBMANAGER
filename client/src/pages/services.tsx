import Layout from "@/components/layout";
import PageLayout from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Clock, DollarSign, User, Car, Wrench } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import NewServiceModal from "@/components/modals/new-service-modal";

interface Service {
  id: number;
  description: string;
  status: string;
  estimatedValue?: number;
  finalValue?: number;
  scheduledDate?: string;
  scheduledTime?: string;
  customer?: {
    id: number;
    name: string;
    document: string;
  };
  vehicle?: {
    id: number;
    licensePlate?: string;
    plate?: string;
    brand?: string;
    make?: string;
    model: string;
  };
  serviceType?: {
    id: number;
    name: string;
    description: string;
  };
}

export default function Services() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isNewServiceModalOpen, setIsNewServiceModalOpen] = useState(false);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["/api/services"],
    queryFn: () => queryClient.get("/api/services"),
  });

  const filteredServices = services.filter((service: Service) => {
    const matchesSearch = (service.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (service.customer?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (service.vehicle?.licensePlate || service.vehicle?.plate || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || service.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: { label: "Agendado", className: "bg-blue-100 text-blue-800" },
      in_progress: { label: "Em Andamento", className: "bg-yellow-100 text-yellow-800" },
      completed: { label: "Concluído", className: "bg-green-100 text-green-800" },
      cancelled: { label: "Cancelado", className: "bg-red-100 text-red-800" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, className: "bg-gray-100 text-gray-800" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <Layout>
        <PageLayout title="Serviços" subtitle="Gerencie os serviços da oficina">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando serviços...</p>
          </div>
        </PageLayout>
      </Layout>
    );
  }

  const pageActions = (
    <Button 
      onClick={() => setIsNewServiceModalOpen(true)}
      className="button-primary"
    >
      <Plus className="h-4 w-4 mr-2" />
      Novo Serviço
    </Button>
  );

  return (
    <Layout>
      <PageLayout 
        title="Serviços" 
        subtitle="Gerencie os serviços da oficina"
        actions={pageActions}
      >
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar serviços..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="scheduled">Agendado</SelectItem>
              <SelectItem value="in_progress">Em Andamento</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-6">
          {filteredServices.map((service: Service) => (
            <Card key={service.id} className="card-enhanced">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-xl font-semibold">
                      <div className="flex items-center">
                        <Wrench className="h-5 w-5 mr-3 text-teal-600" />
                        {service.serviceType?.name || "Tipo não encontrado"}
                      </div>
                    </CardTitle>
                    <CardDescription className="text-gray-600 font-medium">{service.description}</CardDescription>
                  </div>
                  {getStatusBadge(service.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-2" />
                      <span className="font-semibold">Agendamento</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">
                      {service.scheduledDate && service.scheduledTime
                        ? `${new Date(service.scheduledDate).toLocaleDateString()} ${service.scheduledTime}`
                        : "Não agendado"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-500">
                      <DollarSign className="h-4 w-4 mr-2" />
                      <span className="font-semibold">Valor</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">
                      {service.finalValue 
                        ? `R$ ${parseFloat(service.finalValue.toString()).toFixed(2)}`
                        : service.estimatedValue
                        ? `R$ ${parseFloat(service.estimatedValue.toString()).toFixed(2)} (estimado)`
                        : "Não informado"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      <span className="font-semibold">Cliente & Veículo</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-800">
                        <User className="h-4 w-4 mr-2 text-blue-600" />
                        <span className="font-medium">{service.customer?.name || "Cliente não encontrado"}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-800">
                        <Car className="h-4 w-4 mr-2 text-green-600" />
                        <span className="font-medium">
                          {service.vehicle ? 
                            `${service.vehicle.licensePlate || service.vehicle.plate || "S/N"} - ${service.vehicle.brand || service.vehicle.make || ""} ${service.vehicle.model || ""}`.trim() 
                            : "Veículo não encontrado"
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end items-start space-x-2">
                    <Button variant="outline" size="sm" className="hover:bg-blue-50 hover:border-blue-300">
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" className="hover:bg-green-50 hover:border-green-300">
                      Detalhes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
{filteredServices.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhum serviço encontrado</p>
          </div>
        )}

        <NewServiceModal 
          isOpen={isNewServiceModalOpen}
          onClose={() => setIsNewServiceModalOpen(false)}
        />
      </PageLayout>
    </Layout>
  );
}