
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, TrendingUp, TrendingDown, Calendar, DollarSign, Wrench, User, Car, Phone, Mail } from "lucide-react";
import { useLocation } from "wouter";
import { type Service, type Customer, type Vehicle, type ServiceType } from "@shared/schema";

export default function Reports() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const customerId = urlParams.get('customerId');
  const vehicleId = urlParams.get('vehicleId');
  const type = urlParams.get('type') || 'customer';

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

  const { data: services } = useQuery({
    queryKey: ["/api/services"],
    enabled: isAuthenticated,
  });

  const { data: customers } = useQuery({
    queryKey: ["/api/customers"],
    enabled: isAuthenticated,
  });

  const { data: vehicles } = useQuery({
    queryKey: ["/api/vehicles"],
    enabled: isAuthenticated,
  });

  const { data: serviceTypes } = useQuery({
    queryKey: ["/api/service-types"],
    enabled: isAuthenticated,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!customerId && !vehicleId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Relatório não encontrado</h1>
          <Button onClick={() => setLocation("/customers")}>Voltar para Clientes</Button>
        </div>
      </div>
    );
  }

  const customer = customers?.find((c: Customer) => c.id === parseInt(customerId || '0'));
  const vehicle = vehicles?.find((v: Vehicle) => v.id === parseInt(vehicleId || '0'));
  const targetCustomer = customer || (vehicle ? customers?.find((c: Customer) => c.id === vehicle.customerId) : null);

  // Filter services for this customer/vehicle
  const customerServices = services?.filter((s: Service) => {
    if (type === 'customer' && customerId) {
      return s.customerId === parseInt(customerId);
    } else if (type === 'vehicle' && vehicleId) {
      return s.vehicleId === parseInt(vehicleId);
    }
    return false;
  }) || [];

  const getServiceTypeName = (serviceTypeId: number) => {
    const serviceType = serviceTypes?.find((st: ServiceType) => st.id === serviceTypeId);
    return serviceType?.name || "Serviço não encontrado";
  };

  const getVehicleInfo = (vehicleId: number) => {
    const vehicleInfo = vehicles?.find((v: Vehicle) => v.id === vehicleId);
    return vehicleInfo ? `${vehicleInfo.brand} ${vehicleInfo.model} - ${vehicleInfo.plate}` : "Veículo não encontrado";
  };

  // Calculate statistics
  const totalServices = customerServices.length;
  const completedServices = customerServices.filter(s => s.status === 'completed').length;
  const totalRevenue = customerServices
    .filter(s => s.status === 'completed' && s.finalValue)
    .reduce((sum, s) => sum + Number(s.finalValue), 0);
  const averageServiceValue = completedServices > 0 ? totalRevenue / completedServices : 0;

  // Group services by type
  const servicesByType = customerServices.reduce((acc, service) => {
    const typeName = getServiceTypeName(service.serviceTypeId);
    if (!acc[typeName]) {
      acc[typeName] = { count: 0, revenue: 0 };
    }
    acc[typeName].count++;
    if (service.status === 'completed' && service.finalValue) {
      acc[typeName].revenue += Number(service.finalValue);
    }
    return acc;
  }, {} as Record<string, { count: number; revenue: number }>);

  const backUrl = type === 'customer' ? '/customers' : '/vehicles';

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title={`Relatório - ${type === 'customer' ? 'Cliente' : 'Veículo'}`}
          subtitle={targetCustomer?.name || vehicle?.plate || ''}
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => setLocation(backUrl)}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>

          {/* Header Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2 text-green-600" />
                  Informações do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                {targetCustomer ? (
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold text-lg">{targetCustomer.name}</p>
                      <p className="text-sm text-gray-600">Código: {targetCustomer.code}</p>
                    </div>
                    {targetCustomer.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-4 w-4 mr-2" />
                        {targetCustomer.phone}
                      </div>
                    )}
                    {targetCustomer.email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-4 w-4 mr-2" />
                        {targetCustomer.email}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">Cliente não encontrado</p>
                )}
              </CardContent>
            </Card>

            {vehicle && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Car className="h-5 w-5 mr-2 text-blue-600" />
                    Informações do Veículo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold text-lg">{vehicle.brand} {vehicle.model}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline">{vehicle.plate}</Badge>
                        <Badge variant="secondary">{vehicle.year}</Badge>
                      </div>
                    </div>
                    {vehicle.color && (
                      <p className="text-sm text-gray-600">
                        <strong>Cor:</strong> {vehicle.color}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="rounded-lg bg-blue-100 p-3">
                    <Wrench className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total de Serviços</p>
                    <p className="text-2xl font-bold text-gray-900">{totalServices}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="rounded-lg bg-green-100 p-3">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Serviços Concluídos</p>
                    <p className="text-2xl font-bold text-gray-900">{completedServices}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="rounded-lg bg-yellow-100 p-3">
                    <DollarSign className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Receita Total</p>
                    <p className="text-2xl font-bold text-gray-900">R$ {totalRevenue.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="rounded-lg bg-purple-100 p-3">
                    <TrendingDown className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
                    <p className="text-2xl font-bold text-gray-900">R$ {averageServiceValue.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="services" className="space-y-6">
            <TabsList>
              <TabsTrigger value="services">Histórico de Serviços</TabsTrigger>
              <TabsTrigger value="analytics">Análise por Tipo</TabsTrigger>
            </TabsList>

            <TabsContent value="services">
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Serviços</CardTitle>
                </CardHeader>
                <CardContent>
                  {customerServices.length > 0 ? (
                    <div className="space-y-4">
                      {customerServices
                        .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())
                        .map((service: Service) => (
                        <div key={service.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold">{getServiceTypeName(service.serviceTypeId)}</h4>
                              <p className="text-sm text-gray-600">{getVehicleInfo(service.vehicleId)}</p>
                            </div>
                            <Badge 
                              className={
                                service.status === 'completed' ? 'bg-green-100 text-green-800' :
                                service.status === 'in_progress' ? 'bg-orange-100 text-orange-800' :
                                service.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }
                            >
                              {service.status === 'completed' ? 'Concluído' :
                               service.status === 'in_progress' ? 'Em Andamento' :
                               service.status === 'cancelled' ? 'Cancelado' : 'Agendado'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              {new Date(service.scheduledDate).toLocaleDateString('pt-BR')}
                              {service.scheduledTime && ` às ${service.scheduledTime}`}
                            </div>
                            {(service.finalValue || service.estimatedValue) && (
                              <div className="flex items-center">
                                <DollarSign className="h-4 w-4 mr-2" />
                                R$ {Number(service.finalValue || service.estimatedValue).toFixed(2)}
                              </div>
                            )}
                          </div>
                          {service.notes && (
                            <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                              {service.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Nenhum serviço encontrado.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle>Análise por Tipo de Serviço</CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(servicesByType).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(servicesByType)
                        .sort(([,a], [,b]) => b.count - a.count)
                        .map(([type, data]) => (
                        <div key={type} className="border rounded-lg p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-semibold">{type}</h4>
                              <p className="text-sm text-gray-600">{data.count} serviços realizados</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-green-600">R$ {data.revenue.toFixed(2)}</p>
                              <p className="text-sm text-gray-600">
                                Média: R$ {data.count > 0 ? (data.revenue / data.count).toFixed(2) : '0,00'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Nenhum dado analítico disponível.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
