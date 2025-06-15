
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, TrendingUp } from "lucide-react";

export default function TopServices() {
  const { data: topServices, isLoading } = useQuery({
    queryKey: ["/api/dashboard/top-services"],
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const services = topServices || [];

  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <Wrench className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">Top Serviços</CardTitle>
            <p className="text-sm text-gray-600 mt-1">Serviços mais solicitados</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {services.length === 0 ? (
          <div className="text-center py-8">
            <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum serviço encontrado</p>
            <p className="text-sm text-gray-400">Cadastre alguns serviços para ver as estatísticas</p>
          </div>
        ) : (
          services.map((service: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">#{index + 1}</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{service.name}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {service.count} serviços
                    </Badge>
                    <span className="text-sm text-emerald-600 font-medium">
                      {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      }).format(service.revenue || 0)}
                    </span>
                  </div>
                </div>
              </div>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
          ))
        )}
        
        {services.length > 0 && (
          <div className="mt-6 p-3 bg-blue-50 rounded-xl">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700 font-medium">Total de Serviços:</span>
              <span className="text-blue-900 font-bold">
                {services.reduce((sum: number, service: any) => sum + service.count, 0)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-blue-700 font-medium">Receita Total:</span>
              <span className="text-blue-900 font-bold">
                {new Intl.NumberFormat('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL' 
                }).format(services.reduce((sum: number, service: any) => sum + (service.revenue || 0), 0))}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
