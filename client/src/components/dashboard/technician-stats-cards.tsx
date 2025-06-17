import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Wrench, AlertTriangle } from "lucide-react";

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
      console.log('TechnicianStatsCards: Fetching dashboard stats...');
      const response = await fetch("/api/dashboard/stats", {
        credentials: "include",
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('TechnicianStatsCards: API Error:', response.status, response.statusText, errorText);
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      console.log('TechnicianStatsCards: Data received:', result);
      return result;
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: "Serviços Hoje", icon: Calendar, description: "Agendados para hoje" },
          { title: "Próximos Agendamentos", icon: Users, description: "Nos próximos dias" },
          { title: "Clientes Ativos", icon: Wrench, description: "Com serviços pendentes" },
        ].map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Serviços Hoje",
      value: stats?.dailyServices || 0,
      icon: Calendar,
      description: "Agendados para hoje",
    },
    {
      title: "Próximos Agendamentos",
      value: stats?.appointments || 0,
      icon: Users,
      description: "Nos próximos dias",
    },
    {
      title: "Clientes Ativos",
      value: stats?.activeCustomers || 0,
      icon: Wrench,
      description: "Com serviços pendentes",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}