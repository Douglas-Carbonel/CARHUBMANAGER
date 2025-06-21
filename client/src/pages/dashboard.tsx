
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
  Zap,
  Plus,
  Activity
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
      color: "bg-blue-600 hover:bg-blue-700",
      route: "/schedule"
    },
    {
      title: "Novo Cliente",
      description: "Cadastrar cliente",
      icon: Users,
      color: "bg-emerald-600 hover:bg-emerald-700",
      route: "/customers"
    },
    {
      title: "Serviços",
      description: "Gerenciar serviços",
      icon: Wrench,
      color: "bg-purple-600 hover:bg-purple-700",
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

        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {user?.role === "admin" ? "Dashboard Executivo" : "Meus Agendamentos"}
                </h1>
                <p className="text-gray-600">
                  {user?.role === "admin" 
                    ? "Monitore o desempenho do negócio em tempo real" 
                    : "Acompanhe suas atividades e próximos compromissos"
                  }
                </p>
              </div>
              
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    onClick={() => setLocation(action.route)}
                    className={`${action.color} text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 h-11 px-6`}
                    size="sm"
                  >
                    <action.icon className="h-4 w-4 mr-2" />
                    {action.title}
                  </Button>
                ))}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Métricas de Hoje</h2>
                <div className="flex items-center text-sm text-gray-500 bg-white px-3 py-1.5 rounded-full border">
                  <Activity className="h-4 w-4 mr-1.5" />
                  Atualizado em tempo real
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <TechnicianStatsCards />
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              
              {/* Charts Section */}
              <div className="xl:col-span-2 space-y-8">
                
                {/* Revenue Charts */}
                {user?.role === "admin" && (
                  <div className="space-y-8">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">Receita Estimada</h3>
                          <div className="flex items-center text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                            <TrendingUp className="h-4 w-4 mr-1" />
                            Últimos 7 dias
                          </div>
                        </div>
                      </div>
                      <div className="p-6">
                        <RevenueChart />
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">Receita Realizada</h3>
                          <div className="flex items-center text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                            <BarChart3 className="h-4 w-4 mr-1" />
                            Pagamentos confirmados
                          </div>
                        </div>
                      </div>
                      <div className="p-6">
                        <RealizedRevenueChart />
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Services */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Serviços Recentes</h3>
                  </div>
                  <div className="p-6">
                    <RecentServices />
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-8">
                
                {/* Upcoming Appointments */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Próximos Agendamentos</h3>
                  </div>
                  <div className="p-6">
                    <UpcomingAppointments />
                  </div>
                </div>
                
                {/* Top Services - Admin Only */}
                {user?.role === "admin" && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                      <h3 className="text-lg font-semibold text-gray-900">Serviços Populares</h3>
                    </div>
                    <div className="p-6">
                      <TopServices />
                    </div>
                  </div>
                )}
                
                {/* Quick Analytics Links - Admin Only */}
                {user?.role === "admin" && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                        Análises Detalhadas
                      </h3>
                    </div>
                    <div className="p-6 space-y-3">
                      {dashboardSections.map((section, index) => (
                        <div
                          key={index}
                          onClick={() => setLocation(section.route)}
                          className="group flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-all duration-200 border border-gray-100 hover:border-gray-200"
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 bg-gradient-to-r ${section.gradient} rounded-xl flex items-center justify-center shadow-sm`}>
                              <section.icon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{section.title}</p>
                              <p className="text-xs text-gray-500">{section.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center text-xs text-gray-400 group-hover:text-gray-600 transition-colors">
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Premium Footer - Admin Only */}
            {user?.role === "admin" && (
              <div className="bg-gradient-to-r from-slate-900 via-gray-900 to-slate-900 rounded-2xl border border-gray-800 shadow-xl overflow-hidden">
                <div className="p-8">
                  <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                    <div className="text-center lg:text-left">
                      <h3 className="text-2xl font-bold text-white mb-3">
                        Sistema de Gestão Profissional
                      </h3>
                      <p className="text-gray-300 text-lg">
                        Controle completo com relatórios avançados e insights em tempo real
                      </p>
                    </div>
                    <div className="flex items-center space-x-8">
                      <div className="text-center">
                        <div className="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center mb-3 mx-auto">
                          <TrendingUp className="h-7 w-7 text-white" />
                        </div>
                        <p className="text-sm text-gray-300 font-medium">Performance</p>
                      </div>
                      <div className="text-center">
                        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-3 mx-auto">
                          <BarChart3 className="h-7 w-7 text-white" />
                        </div>
                        <p className="text-sm text-gray-300 font-medium">Relatórios</p>
                      </div>
                      <div className="text-center">
                        <div className="w-14 h-14 bg-yellow-600 rounded-2xl flex items-center justify-center mb-3 mx-auto">
                          <Zap className="h-7 w-7 text-white" />
                        </div>
                        <p className="text-sm text-gray-300 font-medium">Automação</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
