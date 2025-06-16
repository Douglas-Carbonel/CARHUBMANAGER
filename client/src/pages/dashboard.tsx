
import React from "react";
import { useAuth } from "../hooks/useAuth";
import { useLocation } from "wouter";
import Sidebar from "../components/layout/sidebar";
import Header from "../components/layout/header";
import SimpleStatsCards from "../components/dashboard/simple-stats-cards";
import SimpleRevenueChart from "../components/dashboard/simple-revenue-chart";
import TopServices from "../components/dashboard/top-services";
import RecentServices from "../components/dashboard/recent-services";
import UpcomingAppointments from "../components/dashboard/upcoming-appointments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Car, 
  Wrench, 
  Calendar, 
  ArrowRight, 
  BarChart3,
  TrendingUp,
  Activity
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const dashboardSections = [
    {
      title: "Clientes",
      description: "Análise detalhada de clientes, novos cadastros e fidelização",
      icon: Users,
      color: "from-blue-500 to-cyan-600",
      bgColor: "from-blue-50 to-cyan-50",
      route: "/dashboard/customers"
    },
    {
      title: "Veículos", 
      description: "Estatísticas da frota, marcas, combustíveis e idades",
      icon: Car,
      color: "from-green-500 to-emerald-600",
      bgColor: "from-green-50 to-emerald-50",
      route: "/dashboard/vehicles"
    },
    {
      title: "Serviços",
      description: "Performance dos serviços, faturamento e tipos mais procurados",
      icon: Wrench,
      color: "from-purple-500 to-violet-600", 
      bgColor: "from-purple-50 to-violet-50",
      route: "/dashboard/services"
    },
    {
      title: "Agendamentos",
      description: "Gestão da agenda, próximos atendimentos e horários",
      icon: Calendar,
      color: "from-orange-500 to-red-600",
      bgColor: "from-orange-50 to-red-50", 
      route: "/dashboard/schedule"
    }
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Dashboard Geral"
          subtitle={`Bem-vindo, ${user?.firstName || user?.username}! Visão geral do negócio`}
        />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Stats Cards Básicos */}
            <SimpleStatsCards />

            {/* Seções de Dashboard Especializadas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {dashboardSections.map((section, index) => (
                <Card 
                  key={index}
                  className={`border-0 shadow-lg bg-gradient-to-br ${section.bgColor} hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer`}
                  onClick={() => setLocation(section.route)}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 bg-gradient-to-r ${section.color} rounded-xl flex items-center justify-center shadow-lg`}>
                          <section.icon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-bold text-gray-900">
                            {section.title}
                          </CardTitle>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {section.description}
                    </p>
                    <Button 
                      variant="ghost" 
                      className="w-full mt-4 justify-between text-gray-700 hover:bg-white/50"
                      onClick={(e) => {
                        e.preventDefault();
                        setLocation(section.route);
                      }}
                    >
                      Ver Dashboard Detalhado
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Resumo Rápido */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SimpleRevenueChart />
              <TopServices />
            </div>

            {/* Informações Rápidas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentServices />
              <UpcomingAppointments />
            </div>

            {/* Call to Action */}
            <Card className="border-0 shadow-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Análises Avançadas</h3>
                    <p className="text-indigo-100 mb-4">
                      Acesse dashboards especializados para insights detalhados sobre cada área do seu negócio.
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Activity className="h-12 w-12 text-indigo-200" />
                    <TrendingUp className="h-12 w-12 text-indigo-200" />
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </main>
      </div>
    </div>
  );
}
