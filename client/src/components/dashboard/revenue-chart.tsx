
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Area, AreaChart } from "recharts";
import { MoreHorizontal, TrendingUp, Calendar, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function RevenueChart() {
  const { data: revenueData, isLoading } = useQuery({
    queryKey: ["/api/dashboard/revenue?days=7"],
    staleTime: 30000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const response = await fetch("/api/dashboard/revenue?days=7", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
  });

  // Buscar todos os serviços para análise detalhada
  const { data: allServices } = useQuery({
    queryKey: ["/api/services"],
    staleTime: 30000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const response = await fetch("/api/services", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
  });

  // Transform data for chart
  const chartData = revenueData?.map((item: any) => ({
    date: new Date(item.date).toLocaleDateString('pt-BR', { weekday: 'short' }),
    fullDate: item.date,
    revenue: item.revenue,
  })) || [];

  // Calcular total de faturamento previsto
  const totalEstimatedRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0);

  // Filtrar serviços dos últimos 7 dias (estimados + concluídos)
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);
  const last7DaysStr = last7Days.toISOString().split('T')[0];

  const recentServices = allServices?.filter((service: any) => 
    service.scheduledDate >= last7DaysStr
  ) || [];

  // Agrupar serviços por status
  const completedServices = recentServices.filter((service: any) => service.status === 'completed');
  const estimatedServices = recentServices.filter((service: any) => 
    service.status === 'scheduled' || service.status === 'in_progress'
  );

  // Debug: Log the chart data to console
  console.log('Revenue Chart Data:', chartData);
  console.log('Recent Services:', recentServices);
  console.log('Completed Services:', completedServices);
  console.log('Estimated Services:', estimatedServices);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-3 border-b border-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">
                Faturamento Previsto dos Últimos 7 Dias
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">Receita estimada + realizada</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="hover:bg-gray-100">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 13, fill: '#6B7280', fontWeight: 500 }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 13, fill: '#6B7280', fontWeight: 500 }}
                tickFormatter={(value) => `R$ ${value.toLocaleString()}`}
                dx={-10}
              />
              <Tooltip 
                formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Faturamento Previsto']}
                labelFormatter={(label) => `${label}`}
                contentStyle={{
                  backgroundColor: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10B981"
                strokeWidth={3}
                fill="url(#colorRevenue)"
                dot={{ fill: '#10B981', strokeWidth: 2, r: 6 }}
                activeDot={{ r: 8, fill: '#10B981', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Detalhes dos Serviços */}
        <div className="border-t border-gray-100 pt-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Serviços Concluídos */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <h4 className="font-semibold text-gray-900">Serviços Concluídos</h4>
              </div>
              <div className="space-y-3 max-h-32 overflow-y-auto">
                {completedServices.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Nenhum serviço concluído nos últimos 7 dias</p>
                ) : (
                  completedServices.map((service: any) => (
                    <div key={service.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{service.serviceTypeName}</p>
                        <p className="text-xs text-gray-600">{service.customerName} • {service.vehiclePlate}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {new Date(service.scheduledDate).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-green-600" />
                          <span className="text-sm font-bold text-green-600">
                            R$ {Number(service.finalValue || service.estimatedValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-200">
                          Concluído
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Serviços Estimados */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <h4 className="font-semibold text-gray-900">Serviços Estimados</h4>
              </div>
              <div className="space-y-3 max-h-32 overflow-y-auto">
                {estimatedServices.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Nenhum serviço estimado nos últimos 7 dias</p>
                ) : (
                  estimatedServices.map((service: any) => (
                    <div key={service.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{service.serviceTypeName}</p>
                        <p className="text-xs text-gray-600">{service.customerName} • {service.vehiclePlate}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {new Date(service.scheduledDate).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-blue-600" />
                          <span className="text-sm font-bold text-blue-600">
                            R$ {Number(service.estimatedValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <Badge variant="outline" className={`text-xs ${
                          service.status === 'scheduled' 
                            ? 'bg-yellow-100 text-yellow-700 border-yellow-200' 
                            : 'bg-blue-100 text-blue-700 border-blue-200'
                        }`}>
                          {service.status === 'scheduled' ? 'Agendado' : 'Em Andamento'}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Total Geral */}
          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h5 className="font-bold text-gray-900">Total de Faturamento Previsto</h5>
                  <p className="text-sm text-gray-600">Últimos 7 dias (concluído + estimado)</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  R$ {totalEstimatedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-sm text-gray-600">
                  {completedServices.length + estimatedServices.length} serviços
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
