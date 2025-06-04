import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusColors = {
  completed: "bg-green-100 text-green-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  scheduled: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusLabels = {
  completed: "Concluído",
  in_progress: "Em Andamento",
  scheduled: "Agendado",
  cancelled: "Cancelado",
};

export default function RecentServices() {
  const { data: recentServices, isLoading } = useQuery({
    queryKey: ["/api/dashboard/recent-services", { limit: 5 }],
  });

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader className="border-b border-gray-100">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Serviços Recentes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {recentServices?.map((service: any, index: number) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-sm font-medium text-gray-600">
                    {getInitials(service.customerName)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{service.customerName}</p>
                  <p className="text-xs text-gray-500">
                    {service.vehicleBrand} {service.vehicleModel} • {service.vehiclePlate}
                  </p>
                  <p className="text-xs text-gray-500">{service.serviceTypeName}</p>
                </div>
              </div>
              <div className="text-right">
                <Badge className={statusColors[service.status as keyof typeof statusColors]}>
                  {statusLabels[service.status as keyof typeof statusLabels]}
                </Badge>
                <p className="text-xs text-gray-500 mt-1">
                  R$ {(service.finalValue || service.estimatedValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          ))}
          
          {(!recentServices || recentServices.length === 0) && (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">Nenhum serviço recente</p>
            </div>
          )}
        </div>
        
        {recentServices && recentServices.length > 0 && (
          <Button 
            variant="ghost" 
            className="w-full mt-4 text-sm text-primary hover:text-primary/80 font-medium"
          >
            Ver todos os serviços
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
