
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Car, 
  Wrench, 
  Clock,
  BarChart3,
  PieChart,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Timer,
  Award,
  FileText,
  Download
} from "lucide-react";
import { type Service, type Customer, type Vehicle, type ServiceType } from "@shared/schema";

const statusColors = {
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-orange-100 text-orange-800 border-orange-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const statusLabels = {
  scheduled: "Agendado",
  in_progress: "Em Andamento", 
  completed: "Concluído",
  cancelled: "Cancelado",
};

export default function Reports() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");

  // Extract customerId from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const customerId = urlParams.get('customerId');
    if (customerId) {
      setSelectedCustomer(customerId);
    }
  }, [location]);

  // Queries
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

  // Helper functions
  const getCustomerName = (customerId: number) => {
    const customer = customers?.find((c: Customer) => c.id === customerId);
    return customer?.name || "Cliente não encontrado";
  };

  const getVehicleInfo = (vehicleId: number) => {
    const vehicle = vehicles?.find((v: Vehicle) => v.id === vehicleId);
    return vehicle ? `${vehicle.brand} ${vehicle.model} - ${vehicle.plate}` : "Veículo não encontrado";
  };

  const getServiceTypeName = (serviceTypeId: number) => {
    const serviceType = serviceTypes?.find((st: ServiceType) => st.id === serviceTypeId);
    return serviceType?.name || "Serviço não encontrado";
  };

  // Analytics calculations
  const analytics = useMemo(() => {
    if (!services) return null;

    const now = new Date();
    const periodDays = parseInt(selectedPeriod);
    const cutoffDate = new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000));

    const filteredServices = services.filter((service: Service) => {
      const serviceDate = new Date(service.scheduledDate);
      const matchesPeriod = serviceDate >= cutoffDate;
      const matchesCustomer = selectedCustomer === "all" || service.customerId.toString() === selectedCustomer;
      return matchesPeriod && matchesCustomer;
    });

    const previousPeriodServices = services.filter((service: Service) => {
      const serviceDate = new Date(service.scheduledDate);
      const previousCutoff = new Date(cutoffDate.getTime() - (periodDays * 24 * 60 * 60 * 1000));
      return serviceDate >= previousCutoff && serviceDate < cutoffDate;
    });

    // Basic stats
    const totalServices = filteredServices.length;
    const completedServices = filteredServices.filter((s: Service) => s.status === 'completed').length;
    const cancelledServices = filteredServices.filter((s: Service) => s.status === 'cancelled').length;
    const inProgressServices = filteredServices.filter((s: Service) => s.status === 'in_progress').length;
    const scheduledServices = filteredServices.filter((s: Service) => s.status === 'scheduled').length;

    // Revenue calculations
    const totalRevenue = filteredServices
      .filter((s: Service) => s.status === 'completed')
      .reduce((sum: number, service: Service) => {
        return sum + Number(service.finalValue || service.estimatedValue || 0);
      }, 0);

    const previousRevenue = previousPeriodServices
      .filter((s: Service) => s.status === 'completed')
      .reduce((sum: number, service: Service) => {
        return sum + Number(service.finalValue || service.estimatedValue || 0);
      }, 0);

    const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    // Service type distribution
    const serviceTypeStats = serviceTypes?.map((type: ServiceType) => {
      const typeServices = filteredServices.filter((s: Service) => s.serviceTypeId === type.id);
      const revenue = typeServices
        .filter((s: Service) => s.status === 'completed')
        .reduce((sum: number, service: Service) => {
          return sum + Number(service.finalValue || service.estimatedValue || 0);
        }, 0);
      return {
        name: type.name,
        count: typeServices.length,
        revenue,
        percentage: totalServices > 0 ? (typeServices.length / totalServices) * 100 : 0
      };
    }).sort((a, b) => b.count - a.count) || [];

    // Customer stats
    const customerStats = customers?.map((customer: Customer) => {
      const customerServices = filteredServices.filter((s: Service) => s.customerId === customer.id);
      const revenue = customerServices
        .filter((s: Service) => s.status === 'completed')
        .reduce((sum: number, service: Service) => {
          return sum + Number(service.finalValue || service.estimatedValue || 0);
        }, 0);
      return {
        id: customer.id,
        name: customer.name,
        count: customerServices.length,
        revenue
      };
    }).filter(c => c.count > 0).sort((a, b) => b.revenue - a.revenue) || [];

    // Daily revenue chart data (last 30 days)
    const dailyData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      const dayServices = filteredServices.filter((s: Service) => 
        s.scheduledDate === dateStr && s.status === 'completed'
      );
      const dayRevenue = dayServices.reduce((sum: number, service: Service) => {
        return sum + Number(service.finalValue || service.estimatedValue || 0);
      }, 0);
      dailyData.push({
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        revenue: dayRevenue,
        services: dayServices.length
      });
    }

    const completionRate = totalServices > 0 ? (completedServices / totalServices) * 100 : 0;
    const cancellationRate = totalServices > 0 ? (cancelledServices / totalServices) * 100 : 0;
    const averageTicket = completedServices > 0 ? totalRevenue / completedServices : 0;

    return {
      totalServices,
      completedServices,
      cancelledServices,
      inProgressServices,
      scheduledServices,
      totalRevenue,
      revenueGrowth,
      serviceTypeStats,
      customerStats,
      dailyData,
      completionRate,
      cancellationRate,
      averageTicket,
      previousPeriodServices: previousPeriodServices.length
    };
  }, [services, customers, serviceTypes, selectedPeriod, selectedCustomer]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header title="Relatórios" subtitle="Carregando dados..." />
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title={selectedCustomer !== "all" && customers ? 
            `Relatórios - ${customers.find((c: Customer) => c.id.toString() === selectedCustomer)?.name || 'Cliente'}` : 
            "Relatórios e Analytics"
          }
          subtitle={selectedCustomer !== "all" ? 
            "Insights específicos do cliente selecionado" : 
            "Insights detalhados do seu negócio"
          }
        />
        
        <main className="flex-1 overflow-y-auto">
          {/* Controls */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
            {selectedCustomer !== "all" && customers && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    Exibindo relatórios para: {customers.find((c: Customer) => c.id.toString() === selectedCustomer)?.name}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedCustomer("all")}
                    className="h-6 w-6 p-0 hover:bg-blue-200"
                    title="Remover filtro"
                  >
                    <XCircle className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Últimos 7 dias</SelectItem>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                    <SelectItem value="90">Últimos 90 dias</SelectItem>
                    <SelectItem value="365">Último ano</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {customers?.map((customer: Customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar Relatório
              </Button>
            </div>
          </div>

          <div className="p-6">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="revenue">Receita</TabsTrigger>
                <TabsTrigger value="services">Serviços</TabsTrigger>
                <TabsTrigger value="customers">Clientes</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        R$ {analytics.totalRevenue.toFixed(2)}
                      </div>
                      <div className="flex items-center text-xs text-gray-600 mt-1">
                        {analytics.revenueGrowth >= 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                        )}
                        <span className={analytics.revenueGrowth >= 0 ? "text-green-600" : "text-red-600"}>
                          {Math.abs(analytics.revenueGrowth).toFixed(1)}%
                        </span>
                        <span className="ml-1">vs período anterior</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total de Serviços</CardTitle>
                      <Wrench className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {analytics.totalServices}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {analytics.completedServices} concluídos
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-purple-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                      <Target className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">
                        R$ {analytics.averageTicket.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Por serviço concluído
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-orange-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
                      <CheckCircle className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        {analytics.completionRate.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {analytics.completedServices} de {analytics.totalServices} serviços
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Status Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <PieChart className="h-5 w-5 mr-2" />
                        Status dos Serviços
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                            <span className="text-sm">Concluídos</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{analytics.completedServices}</div>
                            <div className="text-xs text-gray-500">{analytics.completionRate.toFixed(1)}%</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
                            <span className="text-sm">Em Andamento</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{analytics.inProgressServices}</div>
                            <div className="text-xs text-gray-500">
                              {((analytics.inProgressServices / analytics.totalServices) * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                            <span className="text-sm">Agendados</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{analytics.scheduledServices}</div>
                            <div className="text-xs text-gray-500">
                              {((analytics.scheduledServices / analytics.totalServices) * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                            <span className="text-sm">Cancelados</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{analytics.cancelledServices}</div>
                            <div className="text-xs text-gray-500">{analytics.cancellationRate.toFixed(1)}%</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Award className="h-5 w-5 mr-2" />
                        Top Serviços
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.serviceTypeStats.slice(0, 5).map((type, index) => (
                          <div key={type.name} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-3">
                                {index + 1}
                              </div>
                              <span className="text-sm font-medium">{type.name}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">{type.count} serviços</div>
                              <div className="text-xs text-gray-500">R$ {type.revenue.toFixed(2)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recommendations */}
                <Card className="border-l-4 border-l-yellow-500">
                  <CardHeader>
                    <CardTitle className="flex items-center text-yellow-700">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      Recomendações e Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900">Oportunidades de Melhoria</h4>
                        {analytics.cancellationRate > 10 && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-start">
                              <XCircle className="h-4 w-4 text-red-500 mt-0.5 mr-2" />
                              <div className="text-sm text-red-800">
                                <strong>Alta taxa de cancelamento:</strong> {analytics.cancellationRate.toFixed(1)}% dos serviços foram cancelados. 
                                Considere melhorar a comunicação com clientes.
                              </div>
                            </div>
                          </div>
                        )}
                        {analytics.averageTicket < 100 && (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                            <div className="flex items-start">
                              <Target className="h-4 w-4 text-orange-500 mt-0.5 mr-2" />
                              <div className="text-sm text-orange-800">
                                <strong>Ticket médio baixo:</strong> R$ {analytics.averageTicket.toFixed(2)}. 
                                Considere ofertar serviços complementares.
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900">Pontos Positivos</h4>
                        {analytics.completionRate > 80 && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-start">
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2" />
                              <div className="text-sm text-green-800">
                                <strong>Excelente taxa de conclusão:</strong> {analytics.completionRate.toFixed(1)}% dos serviços são concluídos com sucesso.
                              </div>
                            </div>
                          </div>
                        )}
                        {analytics.revenueGrowth > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-start">
                              <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5 mr-2" />
                              <div className="text-sm text-blue-800">
                                <strong>Crescimento positivo:</strong> Receita {analytics.revenueGrowth.toFixed(1)}% superior ao período anterior.
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="revenue" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      Evolução da Receita (Últimos 30 dias)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 flex items-end space-x-1">
                      {analytics.dailyData.map((day, index) => {
                        const maxRevenue = Math.max(...analytics.dailyData.map(d => d.revenue));
                        const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                        return (
                          <div
                            key={index}
                            className="flex-1 flex flex-col items-center"
                            title={`${day.date}: R$ ${day.revenue.toFixed(2)} (${day.services} serviços)`}
                          >
                            <div
                              className="w-full bg-gradient-to-t from-green-600 to-green-400 rounded-t hover:from-green-500 hover:to-green-300 transition-colors cursor-pointer"
                              style={{ height: `${height}%`, minHeight: day.revenue > 0 ? '4px' : '0px' }}
                            ></div>
                            <div className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-center">
                              {day.date}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="services" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Análise de Serviços por Tipo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.serviceTypeStats.map((type) => (
                        <div key={type.name} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-900">{type.name}</h4>
                            <Badge variant="outline">{type.count} serviços</Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Quantidade:</span>
                              <div className="font-medium">{type.count}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Receita:</span>
                              <div className="font-medium text-green-600">R$ {type.revenue.toFixed(2)}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Participação:</span>
                              <div className="font-medium">{type.percentage.toFixed(1)}%</div>
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                                style={{ width: `${type.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="customers" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Clientes por Receita</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.customerStats.slice(0, 10).map((customer, index) => (
                        <div key={customer.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-4">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{customer.name}</div>
                              <div className="text-sm text-gray-500">{customer.count} serviço(s)</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">R$ {customer.revenue.toFixed(2)}</div>
                            <div className="text-sm text-gray-500">
                              R$ {(customer.revenue / customer.count).toFixed(2)} por serviço
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
