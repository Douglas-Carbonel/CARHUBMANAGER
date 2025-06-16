import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, DollarSign, Wrench, Calendar, Users, AlertTriangle } from "lucide-react";

interface DashboardStats {
  dailyRevenue: number;
  dailyServices: number;
  appointments: number;
  activeCustomers: number;
  completedRevenue: number;
  predictedRevenue: number;
}

export default function SimpleStatsCards() {
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    staleTime: 30000,
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: 1000,
    queryFn: async () => {
      const response = await fetch("/api/dashboard/stats", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
  });

  console.log('SimpleStatsCards - isLoading:', isLoading, 'error:', error, 'stats:', stats);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    console.error('Dashboard stats error:', error);
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        <Card className="col-span-full">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Erro ao carregar estatísticas: {error?.message || 'Problema de conexão'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statsData = [
    {
      title: "Faturamento Concluído",
      value: `R$ ${(stats?.completedRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
      iconBg: "bg-green-600",
      description: "Receita de serviços finalizados hoje"
    },
    {
      title: "Faturamento Previsto",
      value: `R$ ${(stats?.predictedRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      iconBg: "bg-blue-600",
      description: "Receita estimada de serviços agendados"
    },
    {
      title: "Serviços Hoje",
      value: stats?.dailyServices || 0,
      icon: Wrench,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      iconBg: "bg-indigo-600",
      description: "Total de serviços agendados"
    },
    {
      title: "Agendamentos",
      value: stats?.appointments || 0,
      icon: Calendar,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      iconBg: "bg-amber-600",
      description: "Próximos agendamentos"
    },
    {
      title: "Clientes Ativos",
      value: stats?.activeCustomers || 0,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      iconBg: "bg-purple-600",
      description: "Clientes com serviços recentes"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
      {statsData.map((stat, index) => (
        <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}