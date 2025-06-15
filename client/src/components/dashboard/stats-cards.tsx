
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, DollarSign, Wrench, Calendar, Users, BarChart3 } from "lucide-react";

export default function StatsCards() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    staleTime: 30000,
    refetchOnWindowFocus: true,
    refetchInterval: 60000, // Refresh every minute
  });

  console.log('Dashboard Stats:', stats);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const statsData = [
    {
      title: "Receita Total",
      value: formatCurrency(stats?.totalRevenue || 0),
      subtitle: "De todos os serviços concluídos",
      icon: DollarSign,
      color: "emerald",
      trend: stats?.totalRevenue > 0 ? "up" : "neutral"
    },
    {
      title: "Receita Mensal",
      value: formatCurrency(stats?.monthlyRevenue || 0),
      subtitle: "Faturamento do mês atual",
      icon: TrendingUp,
      color: "blue",
      trend: stats?.monthlyRevenue > 0 ? "up" : "neutral"
    },
    {
      title: "Serviços Hoje",
      value: stats?.todayServices || 0,
      subtitle: "Agendados para hoje",
      icon: Wrench,
      color: "orange",
      trend: "neutral"
    },
    {
      title: "Total de Serviços",
      value: stats?.totalServices || 0,
      subtitle: "Todos os serviços registrados",
      icon: BarChart3,
      color: "purple",
      trend: "neutral"
    },
    {
      title: "Agendamentos",
      value: stats?.scheduledAppointments || 0,
      subtitle: "Serviços agendados",
      icon: Calendar,
      color: "amber",
      trend: "neutral"
    },
    {
      title: "Total de Clientes",
      value: stats?.totalCustomers || 0,
      subtitle: "Clientes cadastrados",
      icon: Users,
      color: "indigo",
      trend: "neutral"
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      emerald: {
        bg: "from-emerald-500 to-emerald-600",
        icon: "bg-emerald-100 text-emerald-600",
        text: "text-emerald-600"
      },
      blue: {
        bg: "from-blue-500 to-blue-600",
        icon: "bg-blue-100 text-blue-600",
        text: "text-blue-600"
      },
      orange: {
        bg: "from-orange-500 to-orange-600",
        icon: "bg-orange-100 text-orange-600",
        text: "text-orange-600"
      },
      purple: {
        bg: "from-purple-500 to-purple-600",
        icon: "bg-purple-100 text-purple-600",
        text: "text-purple-600"
      },
      amber: {
        bg: "from-amber-500 to-amber-600",
        icon: "bg-amber-100 text-amber-600",
        text: "text-amber-600"
      },
      indigo: {
        bg: "from-indigo-500 to-indigo-600",
        icon: "bg-indigo-100 text-indigo-600",
        text: "text-indigo-600"
      }
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <Card className="col-span-full">
          <CardContent className="p-6 text-center">
            <p className="text-red-600">Erro ao carregar estatísticas</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {statsData.map((stat, index) => {
        const colorClasses = getColorClasses(stat.color);
        return (
          <Card 
            key={index} 
            className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm"
          >
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses.icon}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-600 truncate">
                    {stat.title}
                  </p>
                  <p className={`text-2xl font-bold ${colorClasses.text} mt-1`}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {stat.subtitle}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
