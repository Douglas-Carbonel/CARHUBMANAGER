
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
import PaymentStatusOverview from "@/components/dashboard/payment-status-overview";
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
      color: "bg-gray-800 hover:bg-gray-900",
      route: "/schedule"
    },
    {
      title: "Novo Cliente",
      description: "Cadastrar cliente",
      icon: Users,
      color: "bg-gray-800 hover:bg-gray-900",
      route: "/customers"
    },
    {
      title: "Serviços",
      description: "Gerenciar serviços",
      icon: Wrench,
      color: "bg-gray-800 hover:bg-gray-900",
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

        <main className="flex-1 overflow-y-auto bg-gray-50/50">
          <div className="max-w-full mx-auto px-8 py-6 space-y-6">

            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div>
                <h1 className="text-3xl font-semibold text-gray-900 mb-2">
                  Dashboard
                </h1>
                <div className="flex items-center text-sm text-gray-500">
                  <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  <span className="mx-2">•</span>
                  <span>Bem-vindo, {user?.firstName || user?.username}</span>
                </div>
              </div>
              
              {/* Search and Actions */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Buscar..." 
                    className="w-80 pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                  <div className="absolute left-3 top-2.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    onClick={() => setLocation(action.route)}
                    className={`${action.color} text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 h-9 px-4`}
                    size="sm"
                  >
                    <action.icon className="h-4 w-4 mr-2" />
                    {action.title}
                  </Button>
                ))}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="space-y-6">
              <TechnicianStatsCards />
            </div>

            {/* Main Content Grid - Maximized Layout */}
            <div className="grid grid-cols-12 gap-6">
              
              {/* Left Column - Payment Status & Appointments */}
              <div className="col-span-4 space-y-6">
                
                {/* Payment Status Overview - Primeiro card */}
                {user?.role === "admin" && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="p-6 border-b border-gray-100">
                      <h3 className="text-lg font-semibold text-gray-900">Status de Pagamentos</h3>
                    </div>
                    <div className="p-6">
                      <PaymentStatusOverview />
                    </div>
                  </div>
                )}

                {/* Current Appointments - Melhorado */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Próximos Agendamentos</h3>
                      <button 
                        onClick={() => setLocation("/schedule")}
                        className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                      >
                        Ver Todos
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <UpcomingAppointments />
                  </div>
                </div>
              </div>

              {/* Center Column - Revenue Chart */}
              <div className="col-span-5 space-y-6">
                {user?.role === "admin" && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="p-6 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Receita Estimada vs Realizada</h3>
                        <div className="flex space-x-2">
                          <button className="px-3 py-1 bg-gray-800 text-white text-xs rounded-md">
                            Últimos 7 dias
                          </button>
                          <button className="px-3 py-1 text-gray-600 text-xs rounded-md hover:bg-gray-100">
                            30 dias
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <RevenueChart />
                    </div>
                  </div>
                )}

                {user?.role === "admin" && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="p-6 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Receita Realizada (R$)</h3>
                        <div className="flex space-x-2">
                          <button className="px-3 py-1 bg-gray-800 text-white text-xs rounded-md">
                            Semanal
                          </button>
                          <button className="px-3 py-1 text-gray-600 text-xs rounded-md hover:bg-gray-100">
                            Mensal
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <RealizedRevenueChart />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Activity & Services */}
              <div className="col-span-3 space-y-6">
                
                {/* Most Popular Services - Admin Only */}
                {user?.role === "admin" && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="p-6 border-b border-gray-100">
                      <h3 className="text-lg font-semibold text-gray-900">Serviços Populares</h3>
                    </div>
                    <div className="p-6">
                      <TopServices />
                    </div>
                  </div>
                )}
                
                {/* Recent Services */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Atividade Recente</h3>
                      <button 
                        onClick={() => setLocation("/services")}
                        className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                      >
                        Ver Todos
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <RecentServices />
                  </div>
                </div>
              </div>
            </div>



          </div>
        </main>
      </div>
    </div>
  );
}
