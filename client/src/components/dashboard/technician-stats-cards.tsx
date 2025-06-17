import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Wrench } from "lucide-react";

interface DashboardStats {
  dailyRevenue: number;
  completedRevenue: number;
  predictedRevenue: number;
  dailyServices: number;
  appointments: number;
  activeCustomers: number;
}

export default function TechnicianStatsCards() {
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    staleTime: 30000,
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: 1000,
    queryFn: async () => {
      console.log("TechnicianStatsCards: Fetching dashboard stats...");
      const response = await fetch("/api/dashboard/stats", {
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log("TechnicianStatsCards: API Error:", response.status, response.statusText, errorText);
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("TechnicianStatsCards: Data received:", data);
      return data;
    },
  });

  console.log('TechnicianStatsCards - isLoading:', isLoading, 'error:', error, 'stats:', stats);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <p className="text-red-600">Erro ao carregar dados do dashboard</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cards = [
    {
      title: "Serviços Hoje",
      value: stats?.dailyServices || 0,
      icon: Calendar,
      description: "Agendados para hoje",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Próximos Agendamentos", 
      value: stats?.appointments || 0,
      icon: Users,
      description: "Nos próximos dias",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Clientes Ativos",
      value: stats?.activeCustomers || 0,
      icon: Wrench,
      description: "Com serviços pendentes",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <Card key={index} className={`border-l-4 border-l-${card.color.replace('text-', '')} hover:shadow-lg transition-shadow`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">{card.title}</CardTitle>
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.color}`}>
              {card.value}
            </div>
            <p className="text-xs text-gray-500 mt-1">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}