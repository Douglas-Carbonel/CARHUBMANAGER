import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Wrench, Calendar, Users, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import SimpleStatsCards from "@/components/dashboard/simple-stats-cards";

export default function Dashboard() {
  const { user } = useAuth();

  // Dashboard stats query
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    staleTime: 30000,
    retry: 3,
    retryDelay: 1000,
  });

  // Revenue data query
  const { data: revenueData, isLoading: revenueLoading, error: revenueError } = useQuery({
    queryKey: ["/api/dashboard/revenue"],
    staleTime: 60000,
    retry: 3,
    retryDelay: 1000,
  });

  // Top services query
  const { data: topServices, isLoading: servicesLoading } = useQuery({
    queryKey: ["/api/dashboard/top-services"],
    staleTime: 60000,
    retry: 3,
  });

  // Recent services query
  const { data: recentServices, isLoading: recentLoading } = useQuery({
    queryKey: ["/api/dashboard/recent-services"],
    staleTime: 30000,
    retry: 3,
  });

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Dashboard"
          subtitle={`Bem-vindo, ${user?.firstName || user?.username}!`}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-8 space-y-8">
            {/* Stats Cards */}
            <SimpleStatsCards />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              {/* Revenue Chart */}
              <div className="xl:col-span-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Faturamento dos Últimos 7 Dias
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {revenueLoading ? (
                      <div className="h-80 flex items-center justify-center">
                        <div className="animate-pulse text-gray-500">Carregando dados...</div>
                      </div>
                    ) : revenueError || !revenueData ? (
                      <div className="h-80 flex items-center justify-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        <span>Erro ao carregar dados de faturamento</span>
                      </div>
                    ) : (
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={Array.isArray(revenueData) ? revenueData : []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis tickFormatter={(value) => `R$ ${value}`} tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(value: number) => [formatCurrency(value), 'Faturamento']} />
                            <Line 
                              type="monotone" 
                              dataKey="revenue" 
                              stroke="#3b82f6" 
                              strokeWidth={2}
                              dot={{ fill: '#3b82f6' }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Top Services */}
              <div className="xl:col-span-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Serviços Mais Populares</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {servicesLoading ? (
                      <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex justify-between animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(topServices as any)?.slice(0, 5).map((service: any, index: number) => (
                          <div key={index} className="flex justify-between items-center">
                            <span className="text-sm font-medium">{service.name}</span>
                            <div className="text-right">
                              <div className="text-sm font-bold">{service.count}</div>
                              <div className="text-xs text-gray-500">{formatCurrency(service.revenue)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Recent Services */}
            <div className="grid grid-cols-1 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Serviços Recentes</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex justify-between animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(recentServices as any)?.slice(0, 10).map((service: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-3 border rounded">
                          <div>
                            <div className="font-medium">{service.customerName}</div>
                            <div className="text-sm text-gray-500">
                              {service.serviceTypeName} - {service.vehiclePlate}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold">{service.status}</div>
                            <div className="text-xs text-gray-500">{service.scheduledDate}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}