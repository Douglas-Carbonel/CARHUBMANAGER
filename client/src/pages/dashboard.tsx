
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import StatsCards from "@/components/dashboard/stats-cards";
import RevenueChart from "@/components/dashboard/revenue-chart";
import TopServices from "@/components/dashboard/top-services";
import RecentServices from "@/components/dashboard/recent-services";
import UpcomingAppointments from "@/components/dashboard/upcoming-appointments";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-green-600 border-t-transparent"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border-2 border-green-600 opacity-20"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Dashboard"
          subtitle="Visão geral da sua oficina"
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
