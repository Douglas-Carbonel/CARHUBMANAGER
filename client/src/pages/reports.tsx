import { useState, useEffect, useMemo } from "react";
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { DollarSign, TrendingUp, Calendar, Users, Wrench, AlertTriangle, ShieldAlert } from "lucide-react";

interface Service {
  id: number;
  customerId: number;
  vehicleId: number;
  serviceTypeId: number;
  status: string;
  scheduledDate: string;
  estimatedValue: string;
  finalValue: string;
  notes: string;
}

interface Customer {
  id: number;
  name: string;
  document: string;
}

interface Vehicle {
  id: number;
  customerId: number;
  brand: string;
  model: string;
  plate: string;
}

interface ServiceType {
  id: number;
  name: string;
  defaultPrice: string;
}

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
  const { data: services = [] } = useQuery({
    queryKey: ["/api/services"],
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["/api/vehicles"],
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: serviceTypes = [] } = useQuery({
    queryKey: ["/api/service-types"],
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Helper functions
  const getCustomerName = (customerId: number) => {
    const customer = customers.find((c: Customer) => c.id === customerId);
    return customer?.name || "Cliente não encontrado";
  };

  const getVehicleInfo = (vehicleId: number) => {
    const vehicle = vehicles.find((v: Vehicle) => v.id === vehicleId);
    return vehicle ? `${vehicle.brand} ${vehicle.model} - ${vehicle.plate}` : "Veículo não encontrado";
  };

  // Analytics calculations
  const analytics = useMemo(() => {
    if (!services || !customers || !vehicles || !serviceTypes) return null;

    const now = new Date();
    const periodDays = parseInt(selectedPeriod);
    const cutoffDate = new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000));

    const filteredServices = services.filter((service: Service) => {
      if (!service.scheduledDate) return false;
      const serviceDate = new Date(service.scheduledDate);
      const matchesPeriod = serviceDate >= cutoffDate;
      const matchesCustomer = selectedCustomer === "all" || service.customerId.toString() === selectedCustomer;
      return matchesPeriod && matchesCustomer;
    });

    const previousPeriodServices = services.filter((service: Service) => {
      if (!service.scheduledDate) return false;
      const serviceDate = new Date(service.scheduledDate);
      const previousCutoff = new Date(cutoffDate.getTime() - (periodDays * 24 * 60 * 60 * 1000));
      return serviceDate >= previousCutoff && serviceDate < cutoffDate;
    });

    // Basic stats
    const totalServices = filteredServices.length;
    const completedServices = filteredServices.filter(s => s.status === 'completed').length;
    const cancelledServices = filteredServices.filter(s => s.status === 'cancelled').length;
    const inProgressServices = filteredServices.filter(s => s.status === 'in_progress').length;
    const scheduledServices = filteredServices.filter(s => s.status === 'scheduled').length;

    // Revenue calculations
    const completedServicesWithRevenue = filteredServices.filter(s => s.status === 'completed');
    const totalRevenue = completedServicesWithRevenue.reduce((sum, service) => {
      const value = service.finalValue || service.estimatedValue || 0;
      return sum + Number(value);
    }, 0);

    const previousCompletedServices = previousPeriodServices.filter(s => s.status === 'completed');
    const previousRevenue = previousCompletedServices.reduce((sum, service) => {
      const value = service.finalValue || service.estimatedValue || 0;
      return sum + Number(value);
    }, 0);

    const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    const avgTicket = completedServicesWithRevenue.length > 0 ? totalRevenue / completedServicesWithRevenue.length : 0;

    // Service type distribution
    const serviceTypeStats = serviceTypes.map((serviceType: ServiceType) => {
      const typeServices = filteredServices.filter(s => s.serviceTypeId === serviceType.id);
      const typeRevenue = typeServices
        .filter(s => s.status === 'completed')
        .reduce((sum, service) => {
          return sum + Number(service.finalValue || service.estimatedValue || 0);
        }, 0);
      
      const typeCompletedCount = typeServices.filter(s => s.status === 'completed').length;
      const typeAvgTicket = typeCompletedCount > 0 ? typeRevenue / typeCompletedCount : 0;
      const typePercentage = totalServices > 0 ? (typeServices.length / totalServices) * 100 : 0;
      
      return {
        name: serviceType.name,
        count: typeServices.length,
        revenue: typeRevenue,
        percentage: typePercentage,
        avgTicket: typeAvgTicket
      };
    }).filter(type => type.count > 0).sort((a, b) => b.revenue - a.revenue);

    // Customer stats
    const customerStats = customers.map((customer: Customer) => {
      const customerServices = filteredServices.filter(s => s.customerId === customer.id);
      const revenue = customerServices
        .filter(s => s.status === 'completed')
        .reduce((sum, service) => {
          return sum + Number(service.finalValue || service.estimatedValue || 0);
        }, 0);
      
      const completedCount = customerServices.filter(s => s.status === 'completed').length;
      const avgTicket = completedCount > 0 ? revenue / completedCount : 0;
      
      return {
        id: customer.id,
        name: customer.name,
        count: customerServices.length,
        revenue,
        avgTicket,
        lastService: customerServices.length > 0 ? Math.max(...customerServices.map(s => new Date(s.scheduledDate).getTime())) : 0
      };
    }).filter(c => c.count > 0).sort((a, b) => b.revenue - a.revenue);

    // Status distribution for charts
    const statusData = [
      { name: 'Concluído', value: completedServices, color: '#10b981' },
      { name: 'Agendado', value: scheduledServices, color: '#f59e0b' },
      { name: 'Em Andamento', value: inProgressServices, color: '#3b82f6' },
      { name: 'Cancelado', value: cancelledServices, color: '#ef4444' }
    ];

    // Performance metrics
    const completionRate = totalServices > 0 ? (completedServices / totalServices) * 100 : 0;
    const cancellationRate = totalServices > 0 ? (cancelledServices / totalServices) * 100 : 0;
    const profitMargin = totalRevenue > 0 ? ((totalRevenue * 0.3) / totalRevenue) * 100 : 0; // Assuming 30% profit margin

    // Overdue services (scheduled date in the past but not completed)
    const overdueServices = filteredServices.filter(s => 
      s.status === 'scheduled' && 
      s.scheduledDate && 
      new Date(s.scheduledDate) < now
    ).length;

    return {
      totalServices,
      completedServices,
      cancelledServices,
      inProgressServices,
      scheduledServices,
      totalRevenue,
      previousRevenue,
      revenueGrowth,
      avgTicket,
      serviceTypeStats,
      customerStats,
      statusData,
      completionRate,
      cancellationRate,
      profitMargin,
      overdueServices
    };
  }, [services, customers, vehicles, serviceTypes, selectedPeriod, selectedCustomer]);

  if (isLoading || !analytics) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="Relatórios" subtitle="Carregando dados..." />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Carregando relatórios...</p>
              </div>
            </div>
          </main>
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
            "Dashboard Executivo"
          }
          subtitle={selectedCustomer !== "all" ? 
            "Insights específicos do cliente selecionado" : 
            "Visão 360° do seu negócio - Indicadores estratégicos para gestão"
          }
        />
        
        <main className="flex-1 overflow-y-auto">
          {/* Critical Alerts */}
          {(analytics.overdueServices > 0 || analytics.cancellationRate > 15 || analytics.profitMargin < 20) && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-6 mt-4 rounded-lg">
              <div className="flex items-start">
                <ShieldAlert className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800 mb-2">⚠️ Alertas Críticos - Requer Ação Imediata</h3>
                  <div className="text-sm text-red-700 space-y-1">
                    {analytics.overdueServices > 0 && (
                      <p>• {analytics.overdueServices} serviços em atraso - Contate os clientes urgentemente</p>
                    )}
                    {analytics.cancellationRate > 15 && (
                      <p>• Taxa de cancelamento alta ({analytics.cancellationRate.toFixed(1)}%) - Revisar processo de agendamento</p>
                    )}
                    {analytics.profitMargin < 20 && (
                      <p>• Margem de lucro baixa ({analytics.profitMargin.toFixed(1)}%) - Revisar precificação</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="p-6 space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-lg border">
              <div className="flex gap-4 items-center">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Período</label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                      <SelectItem value="90">90 dias</SelectItem>
                      <SelectItem value="365">1 ano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Cliente</label>
                  <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os clientes</SelectItem>
                      {customers.map((customer: Customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    R$ {analytics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {analytics.revenueGrowth > 0 ? '+' : ''}{analytics.revenueGrowth.toFixed(1)}% vs período anterior
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    R$ {analytics.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Por serviço concluído
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Serviços</CardTitle>
                  <Wrench className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {analytics.totalServices}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {analytics.completedServices} concluídos ({analytics.completionRate.toFixed(1)}%)
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-orange-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Clientes Atendidos</CardTitle>
                  <Users className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {analytics.customerStats.length}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    No período selecionado
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="services">Serviços</TabsTrigger>
                <TabsTrigger value="customers">Clientes</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Distribuição por Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={analytics.statusData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {analytics.statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Top 5 Tipos de Serviço</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analytics.serviceTypeStats.slice(0, 5)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value, name) => [
                            name === 'revenue' ? `R$ ${Number(value).toFixed(2)}` : value,
                            name === 'revenue' ? 'Receita' : 'Quantidade'
                          ]} />
                          <Bar dataKey="count" fill="#3b82f6" name="Quantidade" />
                          <Bar dataKey="revenue" fill="#10b981" name="Receita" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="services" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Análise Detalhada por Tipo de Serviço</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.serviceTypeStats.map((type, index) => (
                        <div key={type.name} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-900">{type.name}</h4>
                            <Badge variant="outline">{type.count} serviços</Badge>
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Quantidade:</span>
                              <div className="font-medium">{type.count}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Receita:</span>
                              <div className="font-medium text-green-600">R$ {type.revenue.toFixed(2)}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Ticket Médio:</span>
                              <div className="font-medium">R$ {type.avgTicket.toFixed(2)}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">% do Total:</span>
                              <div className="font-medium">{type.percentage.toFixed(1)}%</div>
                            </div>
                          </div>
                          <div className="mt-2 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${type.percentage}%` }}
                            ></div>
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
                        <div key={customer.id} className="flex items-center justify-between border-b border-gray-100 pb-3">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{customer.name}</div>
                              <div className="text-sm text-gray-500">{customer.count} serviços</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-green-600">
                              R$ {customer.revenue.toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-500">
                              Ticket: R$ {customer.avgTicket.toFixed(2)}
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