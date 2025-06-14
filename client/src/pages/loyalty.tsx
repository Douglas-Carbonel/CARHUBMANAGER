
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  Users, 
  AlertTriangle, 
  Clock, 
  Star, 
  Gift, 
  Search,
  User,
  Car,
  Wrench,
  TrendingUp
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LoyaltyTracking {
  id: number;
  customerId: number;
  vehicleId: number;
  serviceTypeId: number;
  lastServiceDate: string;
  nextDueDate: string;
  status: string;
  points: number;
  notificationSent: boolean;
  customer: {
    id: number;
    name: string;
    phone?: string;
    email?: string;
    loyaltyPoints: number;
  };
  vehicle: {
    id: number;
    licensePlate: string;
    brand: string;
    model: string;
  };
  serviceType: {
    id: number;
    name: string;
    intervalMonths?: number;
    loyaltyPoints?: number;
  };
}

export default function LoyaltyPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"overdue" | "upcoming" | "all">("all");

  const { data: allTracking = [], isLoading } = useQuery<LoyaltyTracking[]>({
    queryKey: ["/api/loyalty/tracking"],
    queryFn: async () => {
      const res = await fetch("/api/loyalty/tracking", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch loyalty tracking");
      return await res.json();
    },
  });

  const { data: overdueServices = [] } = useQuery<LoyaltyTracking[]>({
    queryKey: ["/api/loyalty/overdue"],
    queryFn: async () => {
      const res = await fetch("/api/loyalty/overdue", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch overdue services");
      return await res.json();
    },
  });

  const { data: upcomingServices = [] } = useQuery<LoyaltyTracking[]>({
    queryKey: ["/api/loyalty/upcoming", 30],
    queryFn: async () => {
      const res = await fetch("/api/loyalty/upcoming/30", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch upcoming services");
      return await res.json();
    },
  });

  const getDisplayData = () => {
    switch (viewMode) {
      case "overdue":
        return overdueServices;
      case "upcoming":
        return upcomingServices;
      default:
        return allTracking;
    }
  };

  const filteredTracking = getDisplayData().filter((tracking) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      tracking.customer.name.toLowerCase().includes(searchLower) ||
      tracking.vehicle.licensePlate.toLowerCase().includes(searchLower) ||
      tracking.vehicle.brand.toLowerCase().includes(searchLower) ||
      tracking.serviceType.name.toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === "all" || tracking.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (tracking: LoyaltyTracking) => {
    const today = new Date();
    const dueDate = new Date(tracking.nextDueDate);
    const daysUntilDue = differenceInDays(dueDate, today);

    if (daysUntilDue < 0) {
      return <Badge variant="destructive">Vencido ({Math.abs(daysUntilDue)} dias)</Badge>;
    } else if (daysUntilDue <= 7) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Vence em {daysUntilDue} dias</Badge>;
    } else if (daysUntilDue <= 30) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Vence em {daysUntilDue} dias</Badge>;
    } else {
      return <Badge variant="outline">Vence em {daysUntilDue} dias</Badge>;
    }
  };

  const totalCustomers = [...new Set(allTracking.map(t => t.customerId))].length;
  const totalPoints = allTracking.reduce((sum, t) => sum + (t.customer.loyaltyPoints || 0), 0);

  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Header 
          title="Sistema de Fidelização"
          subtitle="Gerencie a fidelidade dos seus clientes"
        />

        <main className="flex-1 p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-700 via-pink-600 to-rose-600 bg-clip-text text-transparent tracking-tight">
                Programa de Fidelidade
              </h1>
              <p className="text-purple-700 mt-2 font-medium">Acompanhe serviços recorrentes e pontos de fidelidade</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-700">Clientes Ativos</CardTitle>
                <Users className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-900">{totalCustomers}</div>
                <p className="text-xs text-purple-600 mt-1">No programa de fidelidade</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-rose-700">Serviços Vencidos</CardTitle>
                <AlertTriangle className="h-4 w-4 text-rose-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-900">{overdueServices.length}</div>
                <p className="text-xs text-rose-600 mt-1">Precisam ser reagendados</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-amber-700">Próximos 30 Dias</CardTitle>
                <Clock className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-900">{upcomingServices.length}</div>
                <p className="text-xs text-amber-600 mt-1">Serviços a vencer</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-emerald-700">Total de Pontos</CardTitle>
                <Star className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-900">{totalPoints}</div>
                <p className="text-xs text-emerald-600 mt-1">Distribuídos aos clientes</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters and View Mode */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-500 h-4 w-4" />
              <Input
                placeholder="Buscar por cliente, veículo, serviço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 border-2 border-purple-200 focus:border-pink-400 rounded-xl shadow-sm bg-white/90 backdrop-blur-sm"
              />
            </div>
            
            <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
              <SelectTrigger className="w-48 h-12 border-2 border-purple-200 focus:border-pink-400 rounded-xl shadow-sm bg-white/90 backdrop-blur-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Serviços</SelectItem>
                <SelectItem value="overdue">Vencidos</SelectItem>
                <SelectItem value="upcoming">Próximos 30 Dias</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 h-12 border-2 border-purple-200 focus:border-pink-400 rounded-xl shadow-sm bg-white/90 backdrop-blur-sm">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="overdue">Vencido</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
              </SelectContent>
            </Select>

            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg shadow-md">
              <span className="font-semibold">{filteredTracking.length}</span>
              <span className="ml-1 text-sm">rastreamentos</span>
            </div>
          </div>

          {/* Loyalty Tracking Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse bg-white/80 backdrop-blur-sm border border-purple-200">
                  <CardHeader>
                    <div className="h-5 bg-purple-200 rounded w-3/4"></div>
                    <div className="h-4 bg-purple-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="h-4 bg-purple-200 rounded"></div>
                      <div className="h-4 bg-purple-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTracking.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Card className="w-full max-w-md text-center bg-white/80 backdrop-blur-sm border border-purple-200">
                <CardContent className="pt-8 pb-6">
                  <Gift className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Nenhum rastreamento encontrado
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {searchTerm || statusFilter !== "all" ? 'Tente ajustar os filtros de busca.' : 'Aguarde a conclusão de serviços recorrentes.'}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTracking.map((tracking) => (
                <Card key={tracking.id} className="bg-white/90 backdrop-blur-sm border border-purple-200 hover:shadow-lg transition-all duration-300 hover:border-pink-300">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-bold text-purple-800 mb-1">
                          {tracking.serviceType.name}
                        </CardTitle>
                        <div className="flex items-center text-sm text-gray-600 mb-1">
                          <User className="h-4 w-4 mr-1" />
                          {tracking.customer.name}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Car className="h-4 w-4 mr-1" />
                          {tracking.vehicle.licensePlate} - {tracking.vehicle.brand} {tracking.vehicle.model}
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        {getStatusBadge(tracking)}
                        {tracking.customer.loyaltyPoints > 0 && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            <Star className="h-3 w-3 mr-1" />
                            {tracking.customer.loyaltyPoints} pts
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span className="font-medium">Último serviço:</span>
                        <span className="ml-1">{format(new Date(tracking.lastServiceDate), 'dd/MM/yyyy', { locale: ptBR })}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        <span className="font-medium">Próximo vencimento:</span>
                        <span className="ml-1">{format(new Date(tracking.nextDueDate), 'dd/MM/yyyy', { locale: ptBR })}</span>
                      </div>
                      {tracking.serviceType.intervalMonths && (
                        <div className="flex items-center text-sm text-purple-600">
                          <TrendingUp className="h-4 w-4 mr-2" />
                          <span className="font-medium">Intervalo: {tracking.serviceType.intervalMonths} meses</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
