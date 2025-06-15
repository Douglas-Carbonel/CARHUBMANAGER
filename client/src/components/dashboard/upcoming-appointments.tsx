
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Car, Clock } from "lucide-react";

export default function UpcomingAppointments() {
  const { data: appointments, isLoading } = useQuery({
    queryKey: ["/api/dashboard/upcoming-appointments?limit=5"],
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

  const upcomingAppointments = appointments || [];

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    try {
      const [hours, minutes] = timeString.split(':');
      return `${hours}:${minutes}`;
    } catch {
      return timeString;
    }
  };

  const getDaysUntil = (dateString: string) => {
    const today = new Date();
    const appointmentDate = new Date(dateString);
    const diffTime = appointmentDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Amanhã';
    if (diffDays > 1) return `Em ${diffDays} dias`;
    return 'Vencido';
  };

  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">Próximos Agendamentos</CardTitle>
            <p className="text-sm text-gray-600 mt-1">Serviços agendados</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {upcomingAppointments.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum agendamento próximo</p>
            <p className="text-sm text-gray-400">Agende alguns serviços para vê-los aqui</p>
          </div>
        ) : (
          upcomingAppointments.map((appointment: any, index: number) => (
            <div key={appointment.id} className="flex items-center space-x-4 p-3 rounded-xl bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <p className="font-medium text-gray-900 truncate">
                    {appointment.serviceTypeName}
                  </p>
                  <Badge variant="outline" className="text-amber-600 border-amber-200">
                    {getDaysUntil(appointment.scheduledDate)}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                  <div className="flex items-center space-x-1">
                    <User className="h-3 w-3" />
                    <span className="truncate">{appointment.customerName}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Car className="h-3 w-3" />
                    <span>{appointment.vehiclePlate}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-sm">
                    <span className="text-gray-600">
                      {new Date(appointment.scheduledDate).toLocaleDateString('pt-BR')}
                    </span>
                    {appointment.scheduledTime && (
                      <div className="flex items-center space-x-1 text-amber-600">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(appointment.scheduledTime)}</span>
                      </div>
                    )}
                  </div>
                  <Badge className="bg-amber-100 text-amber-800">
                    Agendado
                  </Badge>
                </div>
              </div>
            </div>
          ))
        )}
        
        {upcomingAppointments.length > 0 && (
          <div className="mt-6 p-3 bg-amber-50 rounded-xl">
            <p className="text-sm text-amber-700 font-medium text-center">
              Total de {upcomingAppointments.length} agendamento{upcomingAppointments.length !== 1 ? 's' : ''} próximo{upcomingAppointments.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
