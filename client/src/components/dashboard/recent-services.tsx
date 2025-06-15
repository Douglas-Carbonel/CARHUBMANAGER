
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Car } from "lucide-react";

export default function RecentServices() {
  const { data: recentServices, isLoading } = useQuery({
    queryKey: ["/api/dashboard/recent-services?limit=5"],
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const getStatusColor = (status: string) => {
    const colors = {
      'scheduled': 'bg-yellow-100 text-yellow-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string) => {
    const texts = {
      'scheduled': 'Agendado',
      'in_progress': 'Em Andamento',
      'completed': 'Concluído',
      'cancelled': 'Cancelado'
    };
    return texts[status as keyof typeof texts] || status;
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const services = recentServices || [];

  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">Serviços Recentes</CardTitle>
            <p className="text-sm text-gray-600 mt-1">Últimos serviços cadastrados</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {services.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum serviço recente</p>
            <p className="text-sm text-gray-400">Cadastre alguns serviços para vê-los aqui</p>
          </div>
        ) : (
          services.map((service: any, index: number) => (
            <div key={service.id} className="flex items-center space-x-4 p-3 rounded-xl bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 font-bold text-sm">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <p className="font-medium text-gray-900 truncate">
                    {service.serviceTypeName}
                  </p>
                  <Badge className={getStatusColor(service.status)}>
                    {getStatusText(service.status)}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <User className="h-3 w-3" />
                    <span className="truncate">{service.customerName}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Car className="h-3 w-3" />
                    <span>{service.vehiclePlate}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    {new Date(service.scheduledDate).toLocaleDateString('pt-BR')}
                  </span>
                  <span className="text-sm font-medium text-emerald-600">
                    {new Intl.NumberFormat('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL' 
                    }).format(Number(service.finalValue || service.estimatedValue || 0))}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
