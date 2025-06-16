
import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import Sidebar from "../components/layout/sidebar";
import Header from "../components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { SimpleStatsCards } from "../components/dashboard/simple-stats-cards";
import SimpleRevenueChart from "../components/dashboard/simple-revenue-chart";
import { TopServices } from "../components/dashboard/top-services";
import RecentServices from "../components/dashboard/recent-services";
import { UpcomingAppointments } from "../components/dashboard/upcoming-appointments";
import { 
  TrendingUp, 
  Users, 
  Car, 
  Calendar, 
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";

interface DashboardAnalytics {
  topCustomers: Array<{ customerName: string; serviceCount: number; totalValue: number }>;
  topServices: {
    oneMonth: Array<{ serviceName: string; count: number }>;
    threeMonths: Array<{ serviceName: string; count: number }>;
    sixMonths: Array<{ serviceName: string; count: number }>;
  };
  canceledServices: number;
  weeklyAppointments: number;
  monthlyAppointments: number;
  weeklyEstimatedValue: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardAnalytics();
  }, []);

  const fetchDashboardAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/dashboard/analytics', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Dashboard analytics data:', data);
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="Dashboard" subtitle="Carregando dados..." />
          <main className="flex-1 overflow-y-auto p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="Dashboard" subtitle="Erro ao carregar dados" />
          <main className="flex-1 overflow-y-auto p-8">
            <Alert className="border-l-4 border-l-red-500">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <AlertDescription className="text-red-600">
                Erro ao carregar dados do dashboard. Verifique a conexão com o banco.
                <br />
                <span className="text-sm text-gray-600">Detalhes: {error}</span>
              </AlertDescription>
            </Alert>
            <Card className="mt-6">
              <CardContent className="p-6">
                <button 
                  onClick={fetchDashboardAnalytics}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Tentar Novamente
                </button>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Dashboard Executivo"
          subtitle={`Bem-vindo, ${user?.firstName || user?.username}! Visão geral do negócio`}
        />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Stats Cards Básicos */}
            <SimpleStatsCards />

            {/* Métricas Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Agendamentos Semana
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {analytics?.weeklyAppointments || 0}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Próximos 7 dias
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Agendamentos Mês
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {analytics?.monthlyAppointments || 0}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Próximos 30 dias
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Serviços Cancelados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {analytics?.canceledServices || 0}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Total histórico
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-yellow-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Valor Semanal Estimado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    R$ {analytics?.weeklyEstimatedValue?.toFixed(2) || '0,00'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Concluídos/Em andamento
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Clientes com Mais Serviços */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Clientes com Mais Serviços
                </CardTitle>
                <CardDescription>
                  Top 5 clientes mais ativos do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.topCustomers && analytics.topCustomers.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.topCustomers.map((customer, index) => (
                      <div key={customer.customerName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                            {index + 1}
                          </Badge>
                          <div>
                            <p className="font-medium">{customer.customerName}</p>
                            <p className="text-sm text-gray-500">{customer.serviceCount} serviços</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-green-600">
                            R$ {Number(customer.totalValue || 0).toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">Valor total</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Nenhum cliente encontrado</p>
                )}
              </CardContent>
            </Card>

            {/* Serviços Mais Utilizados */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Serviços Mais Utilizados
                </CardTitle>
                <CardDescription>
                  Análise por período de tempo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="1month" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="1month">1 Mês</TabsTrigger>
                    <TabsTrigger value="3months">3 Meses</TabsTrigger>
                    <TabsTrigger value="6months">6 Meses</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="1month" className="space-y-3 mt-4">
                    {analytics?.topServices?.oneMonth && analytics.topServices.oneMonth.length > 0 ? (
                      analytics.topServices.oneMonth.map((service, index) => (
                        <div key={service.serviceName} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="w-8 h-8 flex items-center justify-center">
                              {index + 1}
                            </Badge>
                            <span className="font-medium">{service.serviceName}</span>
                          </div>
                          <Badge variant="outline">{service.count} usos</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">Nenhum serviço encontrado no último mês</p>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="3months" className="space-y-3 mt-4">
                    {analytics?.topServices?.threeMonths && analytics.topServices.threeMonths.length > 0 ? (
                      analytics.topServices.threeMonths.map((service, index) => (
                        <div key={service.serviceName} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="w-8 h-8 flex items-center justify-center">
                              {index + 1}
                            </Badge>
                            <span className="font-medium">{service.serviceName}</span>
                          </div>
                          <Badge variant="outline">{service.count} usos</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">Nenhum serviço encontrado nos últimos 3 meses</p>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="6months" className="space-y-3 mt-4">
                    {analytics?.topServices?.sixMonths && analytics.topServices.sixMonths.length > 0 ? (
                      analytics.topServices.sixMonths.map((service, index) => (
                        <div key={service.serviceName} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="w-8 h-8 flex items-center justify-center">
                              {index + 1}
                            </Badge>
                            <span className="font-medium">{service.serviceName}</span>
                          </div>
                          <Badge variant="outline">{service.count} usos</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">Nenhum serviço encontrado nos últimos 6 meses</p>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Gráficos e Dados Adicionais */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SimpleRevenueChart />
              <TopServices />
            </div>

            {/* Serviços Recentes e Próximos Agendamentos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentServices />
              <UpcomingAppointments />
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
