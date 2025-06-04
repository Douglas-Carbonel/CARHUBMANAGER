import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";

export default function UpcomingAppointments() {
  const { data: upcomingAppointments, isLoading } = useQuery({
    queryKey: ["/api/dashboard/upcoming-appointments", { limit: 5 }],
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

  const formatTime = (time: string) => {
    if (!time) return "";
    return time.slice(0, 5); // HH:MM format
  };

  const getTimeNumber = (time: string) => {
    if (!time) return "00";
    return time.slice(0, 2); // Just the hour
  };

  return (
    <Card>
      <CardHeader className="border-b border-gray-100">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Próximos Agendamentos
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {upcomingAppointments?.map((appointment: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-primary text-white rounded-lg flex items-center justify-center mr-3 text-sm font-medium">
                  {getTimeNumber(appointment.scheduledTime)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{appointment.customerName}</p>
                  <p className="text-xs text-gray-500">
                    {formatTime(appointment.scheduledTime)} - {appointment.serviceTypeName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {appointment.vehicleBrand} {appointment.vehicleModel} • {appointment.vehiclePlate}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary/80"
              >
                <Phone className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          {(!upcomingAppointments || upcomingAppointments.length === 0) && (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">Nenhum agendamento próximo</p>
            </div>
          )}
        </div>
        
        {upcomingAppointments && upcomingAppointments.length > 0 && (
          <Button 
            variant="ghost" 
            className="w-full mt-4 text-sm text-primary hover:text-primary/80 font-medium"
          >
            Ver agenda completa
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
