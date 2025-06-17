import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Wrench, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TechnicianStats {
  dailyServices: number;
  appointments: number;
  activeCustomers: number;
}

export default function TechnicianStatsCards() {
  const { data: stats, isLoading, error } = useQuery<TechnicianStats>({
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

  console.log('TechnicianStatsCards - isLoading:', isLoading, 'error:', error, 'stats:', stats);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
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
    return (
      <Card className="col-span-full">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Erro ao carregar estatísticas: {error.message}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statCards = [
    {
      title: "Serviços Hoje",
      value: stats?.dailyServices || 0,
      icon: Wrench,
      description: "Serviços agendados para hoje",
      color: "from-blue-500 to-blue-600",
      bgColor: "from-blue-50 to-blue-100"
    },
    {
      title: "Próximos Agendamentos", 
      value: stats?.appointments || 0,
      icon: Calendar,
      description: "Serviços futuros agendados",
      color: "from-green-500 to-green-600",
      bgColor: "from-green-50 to-green-100"
    },
    {
      title: "Clientes Ativos",
      value: stats?.activeCustomers || 0,
      icon: Users,
      description: "Clientes com serviços nos últimos 30 dias",
      color: "from-purple-500 to-purple-600",
      bgColor: "from-purple-50 to-purple-100"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {statCards.map((card, index) => (
        <Card 
          key={index}
          className={`border-0 shadow-lg bg-gradient-to-br ${card.bgColor} hover:shadow-xl transition-all duration-300`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              {card.title}
            </CardTitle>
            <div className={`w-8 h-8 bg-gradient-to-r ${card.color} rounded-lg flex items-center justify-center`}>
              <card.icon className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {card.value.toLocaleString()}
            </div>
            <p className="text-xs text-gray-600">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}