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
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Dashboard"
          subtitle={`Bem-vindo, ${user?.firstName || user?.username}!`}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-8 space-y-8">
            <StatsCards />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              <div className="xl:col-span-8">
                <RevenueChart />
              </div>
              <div className="xl:col-span-4">
                <TopServices />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <RecentServices />
              <UpcomingAppointments />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}