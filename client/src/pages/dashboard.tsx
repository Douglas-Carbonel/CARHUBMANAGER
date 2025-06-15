
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, TrendingUp, Calendar, Users, Wrench, AlertTriangle, X } from "lucide-react";
import { useState } from "react";

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState("oneMonth");

  // Dashboard analytics query
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ["/api/dashboard/analytics"],
    staleTime: 30000,
    retry: 3,
    retryDelay: 1000,
  });

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const getTopServicesData = () => {
    if (!analytics) return [];
    return analytics.topServices[selectedPeriod] || [];
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case "oneMonth": return "1 Mês";
      case "threeMonths": return "3 Meses";
      case "sixMonths": return "6 Meses";
      default: return "1 Mês";
    }
  };

  if (error) {
    return (
      <div className="flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="Dashboard" subtitle="Erro ao carregar dados" />
          <main className="flex-1 overflow-y-auto p-8">
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Erro ao carregar dados do dashboard. Verifique a conexão com o banco.</span>
                </div>
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

        <main className="flex-1 overflow-y-auto">
          <div className="p-8 space-y-8">
            
            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              
              {/* Serviços Cancelados */}
              <Card className="border-l-4 border-l-red-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Serviços Cancelados</CardTitle>
                  <X className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-red-600">
                        {analytics?.canceledServices || 0}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Total histórico
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Agenda Semanal */}
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Agenda da Semana</CardTitle>
                  <Calendar className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-blue-600">
                        {analytics?.weeklyAppointments || 0}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Próximos 7 dias
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Agenda Mensal */}
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Agenda do Mês</CardTitle>
                  <Calendar className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-green-600">
                        {analytics?.monthlyAppointments || 0}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Próximos 30 dias
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Valor Semanal Estimado */}
              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receita Semanal</CardTitle>
                  <DollarSign className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-purple-600">
                        {formatCurrency(analytics?.weeklyEstimatedValue || 0)}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Em andamento/concluídos
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              
              {/* Clientes com Mais Serviços */}
              <div className="xl:col-span-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Clientes com Mais Serviços
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex justify-between animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {analytics?.topCustomers?.slice(0, 5).map((customer: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{customer.customerName}</div>
                              <div className="text-sm text-gray-500">
                                {customer.serviceCount} serviços
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-green-600">
                                {formatCurrency(customer.totalValue)}
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                Top {index + 1}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {(!analytics?.topCustomers || analytics.topCustomers.length === 0) && (
                          <div className="text-center text-gray-500 py-4">
                            Nenhum cliente encontrado
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Serviços Mais Utilizados */}
              <div className="xl:col-span-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-5 w-5" />
                        Serviços Mais Utilizados
                      </div>
                      <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="oneMonth">1 Mês</SelectItem>
                          <SelectItem value="threeMonths">3 Meses</SelectItem>
                          <SelectItem value="sixMonths">6 Meses</SelectItem>
                        </SelectContent>
                      </Select>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex justify-between animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {getTopServicesData().slice(0, 5).map((service: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{service.serviceName}</div>
                              <div className="text-sm text-gray-500">
                                Últimos {getPeriodLabel()}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-blue-600">
                                {service.count}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                #{index + 1}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {getTopServicesData().length === 0 && (
                          <div className="text-center text-gray-500 py-4">
                            Nenhum serviço encontrado no período
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Gráfico de Serviços por Período */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Ranking de Serviços - {getPeriodLabel()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="animate-pulse text-gray-500">Carregando gráfico...</div>
                  </div>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getTopServicesData().slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="serviceName" 
                          tick={{ fontSize: 12 }}
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          formatter={(value: number) => [value, 'Quantidade']}
                          labelStyle={{ color: '#374151' }}
                        />
                        <Bar 
                          dataKey="count" 
                          fill="#3b82f6" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
