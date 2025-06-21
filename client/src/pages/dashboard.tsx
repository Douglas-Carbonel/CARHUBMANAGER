
import React from "react";
import { useAuth } from "../hooks/useAuth";
import { useLocation } from "wouter";
import Sidebar from "../components/layout/sidebar";
import Header from "../components/layout/header";
import TechnicianStatsCards from "../components/dashboard/technician-stats-cards";
import RevenueChart from "@/components/dashboard/revenue-chart";
import RealizedRevenueChart from "@/components/dashboard/realized-revenue-chart";
import TopServices from "@/components/dashboard/top-services";
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
  Eye,
  Zap
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  if (!user) {
    return <div>Carregando...</div>;
  }

  const quickActions = [
    {
      title: "Novo Agendamento",
      description: "Agendar um novo serviço",
      icon: Calendar,
      color: "bg-blue-500 hover:bg-blue-600",
      route: "/schedule"
    },
    {
      title: "Novo Cliente",
      description: "Cadastrar cliente",
      icon: Users,
      color: "bg-green-500 hover:bg-green-600",
      route: "/customers"
    },
    {
      title: "Serviços",
      description: "Gerenciar serviços",
      icon: Wrench,
      color: "bg-purple-500 hover:bg-purple-600",
      route: "/services"
    }
  ];

  const dashboardSections = [
    {
      title: "Clientes",
      description: "Análise detalhada de clientes e fidelização",
      icon: Users,
      gradient: "from-blue-500 to-blue-600",
      route: "/dashboard/customers",
      stats: "Ver análises"
    },
    {
      title: "Veículos", 
      description: "Estatísticas da frota e marcas",
      icon: Car,
      gradient: "from-emerald-500 to-emerald-600",
      route: "/dashboard/vehicles",
      stats: "Ver análises"
    },
    {
      title: "Serviços",
      description: "Performance e faturamento",
      icon: Wrench,
      gradient: "from-purple-500 to-purple-600",
      route: "/dashboard/services",
      stats: "Ver análises"
    },
    {
      title: "Agenda",
      description: "Gestão de agendamentos",
      icon: Calendar,
      gradient: "from-orange-500 to-orange-600",
      route: "/dashboard/schedule",
      stats: "Ver análises"
    }
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Dashboard"
          subtitle={`Bem-vindo, ${user?.firstName || user?.username}!`}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6 space-y-8">

            {/* Header Section com Ações Rápidas */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {user?.role === "admin" ? "Visão Geral do Negócio" : "Seus Agendamentos"}
                </h1>
                <p className="text-gray-600 mt-2">
                  {user?.role === "admin" 
                    ? "Acompanhe o desempenho e métricas importantes" 
                    : "Veja suas atividades e próximos compromissos"
                  }
                </p>
              </div>
              
              {/* Ações Rápidas */}
              <div className="flex gap-3">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    onClick={() => setLocation(action.route)}
                    className={`${action.color} text-white border-0 shadow-md hover:shadow-lg transition-all duration-200`}
                    size="sm"
                  >
                    <action.icon className="h-4 w-4 mr-2" />
                    {action.title}
                  </Button>
                ))}
              </div>
            </div>

            {/* Cards de Estatísticas Principais */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Estatísticas de Hoje</h2>
                <div className="flex items-center text-sm text-gray-500">
                  <Zap className="h-4 w-4 mr-1" />
                  Atualizado em tempo real
                </div>
              </div>
              <TechnicianStatsCards />
            </div>

            {/* Seções Principais - Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Coluna Principal - Gráficos */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Gráficos de Revenue */}
                {user?.role === "admin" && (
                  <div className="space-y-6">
                    <RevenueChart />
                    <RealizedRevenueChart />
                  </div>
                )}

                {/* Serviços Recentes */}
                <RecentServices />
              </div>

              {/* Sidebar Direita */}
              <div className="space-y-6">
                
                {/* Próximos Agendamentos */}
                <UpcomingAppointments />
                
                {/* Top Serviços - Apenas para Admin */}
                {user?.role === "admin" && <TopServices />}
                
                {/* Links Rápidos para Dashboards - Apenas para Admin */}
                {user?.role === "admin" && (
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-semibold flex items-center">
                        <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                        Análises Detalhadas
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {dashboardSections.map((section, index) => (
                        <div
                          key={index}
                          onClick={() => setLocation(section.route)}
                          className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors duration-200 group"
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 bg-gradient-to-r ${section.gradient} rounded-lg flex items-center justify-center`}>
                              <section.icon className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{section.title}</p>
                              <p className="text-xs text-gray-500">{section.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center text-xs text-gray-400">
                            <Eye className="h-3 w-3 mr-1" />
                            <span className="group-hover:text-gray-600 transition-colors">Ver</span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Footer de Estatísticas - Apenas para Admin */}
            {user?.role === "admin" && (
              <Card className="bg-gradient-to-r from-gray-900 to-gray-800 text-white border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="flex flex-col md:flex-row items-center justify-between">
                    <div className="text-center md:text-left mb-4 md:mb-0">
                      <h3 className="text-2xl font-bold mb-2">Sistema de Gestão Completo</h3>
                      <p className="text-gray-300">
                        Controle total do seu negócio com relatórios avançados e insights inteligentes
                      </p>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <TrendingUp className="h-8 w-8 text-green-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-300">Performance</p>
                      </div>
                      <div className="text-center">
                        <BarChart3 className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-300">Relatórios</p>
                      </div>
                      <div className="text-center">
                        <Zap className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-300">Automação</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
