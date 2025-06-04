
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, DollarSign, Wrench, Calendar, Users } from "lucide-react";

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const statsData = [
    {
      title: "Faturamento Hoje",
      value: stats ? `R$ ${stats.dailyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "R$ 0,00",
      change: "+12% vs ontem",
      icon: DollarSign,
      gradient: "from-emerald-500 to-green-600",
      bgGradient: "from-emerald-50 to-green-50",
      iconBg: "bg-gradient-to-r from-emerald-500 to-green-600",
    },
    {
      title: "Serviços Hoje",
      value: stats?.dailyServices || 0,
      change: "+5% vs ontem",
      icon: Wrench,
      gradient: "from-blue-500 to-cyan-600",
      bgGradient: "from-blue-50 to-cyan-50",
      iconBg: "bg-gradient-to-r from-blue-500 to-cyan-600",
    },
    {
      title: "Agendamentos",
      value: stats?.appointments || 0,
      change: "Próximas 24h",
      icon: Calendar,
      gradient: "from-orange-500 to-amber-600",
      bgGradient: "from-orange-50 to-amber-50",
      iconBg: "bg-gradient-to-r from-orange-500 to-amber-600",
    },
    {
      title: "Clientes Ativos",
      value: stats?.activeCustomers || 0,
      change: "+3% este mês",
      icon: Users,
      gradient: "from-purple-500 to-indigo-600",
      bgGradient: "from-purple-50 to-indigo-50",
      iconBg: "bg-gradient-to-r from-purple-500 to-indigo-600",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="h-24 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {statsData.map((stat, index) => (
        <Card 
          key={index} 
          className={`border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br ${stat.bgGradient} backdrop-blur-sm`}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <div className="flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-emerald-600 mr-1" />
                  <span className="text-emerald-600 font-medium">{stat.change}</span>
                </div>
              </div>
              <div className={`w-14 h-14 ${stat.iconBg} rounded-2xl flex items-center justify-center shadow-lg`}>
                <stat.icon className="h-7 w-7 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
