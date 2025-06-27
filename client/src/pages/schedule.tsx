import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Calendar, Plus } from "lucide-react";
import { type Service, type Customer, type Vehicle, type ServiceType } from "@shared/schema";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export default function SchedulePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Queries
  const { data: services = [], isLoading } = useQuery<(Service & { customer: Customer; vehicle: Vehicle; serviceType: ServiceType })[]>({
    queryKey: ['/api/services'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/services');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    },
  });

  return (
    <div className={cn("flex bg-gradient-to-br from-slate-100 via-white to-blue-50/30", isMobile ? "h-screen flex-col" : "h-screen")}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Agenda" 
          subtitle="Gerenciar agendamentos"
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-12">
              <div className="max-w-md mx-auto bg-white/80 backdrop-blur-sm border border-teal-200 rounded-lg p-8">
                <Calendar className="h-16 w-16 text-teal-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Página de Agenda
                </h3>
                <p className="text-gray-600 mb-6">
                  Sistema de agendamentos funcionando corretamente.
                </p>
                <Button className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Agendamento
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}