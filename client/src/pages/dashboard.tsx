
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import StatsCards from "@/components/dashboard/stats-cards";
import RevenueChart from "@/components/dashboard/revenue-chart";
import TopServices from "@/components/dashboard/top-services";
import RecentServices from "@/components/dashboard/recent-services";
import UpcomingAppointments from "@/components/dashboard/upcoming-appointments";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Dashboard"
          subtitle={`Bem-vindo de volta, ${user?.firstName || user?.username}! Aqui está um resumo do seu negócio.`}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-8">
            {/* Stats Cards */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Visão Geral</h2>
              <StatsCards />
            </div>

            {/* Revenue Chart and Top Services */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2">
                <RevenueChart />
              </div>
              <div className="xl:col-span-1">
                <TopServices />
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Atividade Recente</h2>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <RecentServices />
                <UpcomingAppointments />
              </div>
            </div>

            {/* Footer Info */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border-0 shadow-sm">
              <div className="text-center text-gray-600">
                <p className="text-sm">
                  Dashboard atualizado automaticamente. Últimas informações em tempo real.
                </p>
                <p className="text-xs mt-1 text-gray-500">
                  Sistema de Gestão Automotiva - CarHub
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
