import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, DollarSign, TrendingUp, Users, Car, Wrench, AlertTriangle, Target, BarChart3, PieChart } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

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

  // Queries with proper typing
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["/api/services"],
    enabled: isAuthenticated,
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ["/api/customers"],
    enabled: isAuthenticated,
  });

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ["/api/vehicles"],
    enabled: isAuthenticated,
  });

  const { data: serviceTypes = [], isLoading: serviceTypesLoading } = useQuery({
    queryKey: ["/api/service-types"],
    enabled: isAuthenticated,
  });

  // Analytics calculations
  const analytics = useMemo(() => {
    if (!Array.isArray(services) || !Array.isArray(customers) || !Array.isArray(vehicles) || !Array.isArray(serviceTypes)) {
      return null;
    }

    const now = new Date();
    const periodDays = parseInt(selectedPeriod);
    const cutoffDate = new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000));

    // Filter services by period and customer
    const filteredServices = services.filter((service: any) => {
      if (!service.scheduledDate) return true; // Include services without dates for now
      const serviceDate = new Date(service.scheduledDate);
      const matchesPeriod = serviceDate >= cutoffDate;
      const matchesCustomer = selectedCustomer === "all" || service.customerId?.toString() === selectedCustomer;
      return matchesPeriod && matchesCustomer;
    });

    // Basic stats
    const totalServices = filteredServices.length;
    const completedServices = filteredServices.filter((s: any) => s.status === 'completed').length;
    const cancelledServices = filteredServices.filter((s: any) => s.status === 'cancelled').length;
    const inProgressServices = filteredServices.filter((s: any) => s.status === 'in_progress').length;
    const scheduledServices = filteredServices.filter((s: any) => s.status === 'scheduled').length;

    // Revenue calculations
    const completedServicesWithRevenue = filteredServices.filter((s: any) => s.status === 'completed');
    const totalRevenue = completedServicesWithRevenue.reduce((sum: number, service: any) => {
      const value = service.finalValue || service.estimatedValue || 0;
      return sum + Number(value);
    }, 0);

    // Average ticket calculation
    const avgTicket = completedServicesWithRevenue.length > 0 ? totalRevenue / completedServicesWithRevenue.length : 0;

    // Service type distribution
    const serviceTypeStats = serviceTypes.map((serviceType: any) => {
      const typeServices = filteredServices.filter((s: any) => s.serviceTypeId === serviceType.id);
      const typeRevenue = typeServices
        .filter((s: any) => s.status === 'completed')
        .reduce((sum: number, service: any) => {
          return sum + Number(service.finalValue || service.estimatedValue || 0);
        }, 0);
      
      const typeCompletedCount = typeServices.filter((s: any) => s.status === 'completed').length;
      const typeAvgTicket = typeCompletedCount > 0 ? typeRevenue / typeCompletedCount : 0;
      const typePercentage = totalServices > 0 ? (typeServices.length / totalServices) * 100 : 0;
      
      return {
        name: serviceType.name,
        count: typeServices.length,
        revenue: typeRevenue,
        percentage: typePercentage,
        avgTicket: typeAvgTicket
      };
    }).filter((type: any) => type.count > 0).sort((a: any, b: any) => b.revenue - a.revenue);

    // Customer stats
    const customerStats = customers.map((customer: any) => {
      const customerServices = filteredServices.filter((s: any) => s.customerId === customer.id);
      const revenue = customerServices
        .filter((s: any) => s.status === 'completed')
        .reduce((sum: number, service: any) => {
          return sum + Number(service.finalValue || service.estimatedValue || 0);
        }, 0);
      
      const completedCount = customerServices.filter((s: any) => s.status === 'completed').length;
      const avgTicketCustomer = completedCount > 0 ? revenue / completedCount : 0;
      
      return {
        id: customer.id,
        name: customer.name,
        count: customerServices.length,
        revenue,
        avgTicket: avgTicketCustomer,
        lastService: customerServices.length > 0 ? Math.max(...customerServices.map((s: any) => new Date(s.scheduledDate || new Date()).getTime())) : 0
      };
    }).filter((c: any) => c.count > 0).sort((a: any, b: any) => b.revenue - a.revenue);

    // Additional metrics
    const conversionRate = totalServices > 0 ? (completedServices / totalServices) * 100 : 0;
    const cancellationRate = totalServices > 0 ? (cancelledServices / totalServices) * 100 : 0;
    const profitMargin = 35; // Estimate - can be calculated based on costs vs revenue

    return {
      totalServices,
      completedServices,
      cancelledServices,
      inProgressServices,
      scheduledServices,
      totalRevenue,
      avgTicket,
      conversionRate,
      cancellationRate,
      profitMargin,
      serviceTypeStats,
      customerStats,
      overdueServices: 0, // Can be calculated based on scheduled vs current date
      revenueGrowth: 0, // Would need previous period data
    };
  }, [services, customers, vehicles, serviceTypes, selectedPeriod, selectedCustomer]);

  if (isLoading || servicesLoading || customersLoading || vehiclesLoading || serviceTypesLoading) {
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

  if (!analytics) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="Relatórios" subtitle="Dados indisponíveis" />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <p className="text-gray-600">Não há dados suficientes para gerar relatórios</p>
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
          title={selectedCustomer !== "all" && customers.length > 0 ? 
            `Relatórios - ${customers.find((c: any) => c.id?.toString() === selectedCustomer)?.name || 'Cliente'}` : 
            "Dashboard Executivo"
          }
          subtitle={selectedCustomer !== "all" ? 
            "Insights específicos do cliente selecionado" : 
            "Visão 360° do seu negócio - Indicadores estratégicos para gestão"
          }
        />
        
        <main className="flex-1 overflow-y-auto">
          {/* Controls */}
          <div className="bg-white border-b border-gray-200 p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-gray-500" />
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Últimos 7 dias</SelectItem>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                    <SelectItem value="90">Últimos 90 dias</SelectItem>
                    <SelectItem value="365">Último ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {customers.map((customer: any) => (
                      <SelectItem key={customer.id} value={customer.id?.toString()}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="p-6">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="services">Análise de Serviços</TabsTrigger>
                <TabsTrigger value="customers">Análise de Clientes</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total de Serviços</CardTitle>
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics.totalServices}</div>
                      <p className="text-xs text-muted-foreground">
                        {analytics.completedServices} concluídos ({analytics.totalServices > 0 ? Math.round((analytics.completedServices / analytics.totalServices) * 100) : 0}%)
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">R$ {analytics.totalRevenue.toFixed(2)}</div>
                      <p className="text-xs text-muted-foreground">
                        De {analytics.completedServices} serviços concluídos
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">R$ {analytics.avgTicket.toFixed(2)}</div>
                      <p className="text-xs text-muted-foreground">
                        Média por serviço concluído
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics.conversionRate.toFixed(1)}%</div>
                      <p className="text-xs text-muted-foreground">
                        Serviços agendados → concluídos
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Service Status Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Status dos Serviços</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span>Concluídos</span>
                          </div>
                          <div className="text-sm font-medium">{analytics.completedServices}</div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span>Em Andamento</span>
                          </div>
                          <div className="text-sm font-medium">{analytics.inProgressServices}</div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            <span>Agendados</span>
                          </div>
                          <div className="text-sm font-medium">{analytics.scheduledServices}</div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span>Cancelados</span>
                          </div>
                          <div className="text-sm font-medium">{analytics.cancelledServices}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Principais Métricas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span>Taxa de Cancelamento</span>
                          <span className={`font-medium ${analytics.cancellationRate > 15 ? 'text-red-600' : 'text-green-600'}`}>
                            {analytics.cancellationRate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Margem de Lucro Estimada</span>
                          <span className="font-medium text-green-600">{analytics.profitMargin.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Clientes Ativos</span>
                          <span className="font-medium">{analytics.customerStats.length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Tipos de Serviço Ativos</span>
                          <span className="font-medium">{analytics.serviceTypeStats.length}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="services" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Análise por Tipo de Serviço</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.serviceTypeStats.map((type: any, index: number) => (
                        <div key={type.name} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-900">{type.name}</h4>
                            <Badge variant="outline">{type.count} serviços</Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Receita:</span>
                              <div className="font-medium text-green-600">R$ {type.revenue.toFixed(2)}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Ticket Médio:</span>
                              <div className="font-medium">R$ {type.avgTicket.toFixed(2)}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Participação:</span>
                              <div className="font-medium">{type.percentage.toFixed(1)}%</div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {analytics.serviceTypeStats.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          Nenhum tipo de serviço com dados no período selecionado
                        </div>
                      )}
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
                      {analytics.customerStats.slice(0, 10).map((customer: any, index: number) => (
                        <div key={customer.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="font-medium">{customer.name}</h4>
                              <p className="text-sm text-gray-500">{customer.count} serviços</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-green-600">R$ {customer.revenue.toFixed(2)}</div>
                            <div className="text-sm text-gray-500">Ticket: R$ {customer.avgTicket.toFixed(2)}</div>
                          </div>
                        </div>
                      ))}
                      {analytics.customerStats.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          Nenhum cliente com dados no período selecionado
                        </div>
                      )}
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