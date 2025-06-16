import React from "react";
import { useAuth } from "../hooks/useAuth";
import Sidebar from "../components/layout/sidebar";
import Header from "../components/layout/header";
import SimpleStatsCards from "../components/dashboard/simple-stats-cards";
import SimpleRevenueChart from "../components/dashboard/simple-revenue-chart";
import TopServices from "../components/dashboard/top-services";
import RecentServices from "../components/dashboard/recent-services";
import UpcomingAppointments from "../components/dashboard/upcoming-appointments";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Dashboard"
          subtitle={`Bem-vindo, ${user?.firstName || user?.username}! Visão geral do negócio`}
        />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Stats Cards Básicos */}
            <SimpleStatsCards />

            {/* Gráfico de Faturamento */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SimpleRevenueChart />
              <TopServices />
            </div>

            {/* Serviços e Agendamentos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentServices />
              <UpcomingAppointments />
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}