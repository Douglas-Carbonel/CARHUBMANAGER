import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Droplets, Cog, SprayCan } from "lucide-react";

const serviceIcons: { [key: string]: any } = {
  "Troca de Óleo": Droplets,
  "Revisão Geral": Cog,
  "Lavagem Completa": SprayCan,
  "Balanceamento": Wrench,
};

const serviceIconColors: { [key: string]: string } = {
  "Troca de Óleo": "bg-green-100 text-green-600",
  "Revisão Geral": "bg-blue-100 text-blue-600",
  "Lavagem Completa": "bg-purple-100 text-purple-600",
  "Balanceamento": "bg-orange-100 text-orange-600",
};

export default function TopServices() {
  const { data: topServices, isLoading } = useQuery({
    queryKey: ["/api/dashboard/top-services"],
  });

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Serviços Mais Solicitados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topServices?.map((service: any, index: number) => {
            const IconComponent = serviceIcons[service.name] || Wrench;
            const iconStyle = serviceIconColors[service.name] || "bg-gray-100 text-gray-600";
            
            return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${iconStyle}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{service.name}</p>
                    <p className="text-xs text-gray-500">{service.count} serviços</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  R$ {service.revenue.toLocaleString('pt-BR')}
                </span>
              </div>
            );
          })}
          
          {(!topServices || topServices.length === 0) && (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">Nenhum serviço encontrado</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
