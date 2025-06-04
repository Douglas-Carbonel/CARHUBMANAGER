import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, User, Car, Wrench, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Service, type Customer, type Vehicle, type ServiceType } from "@shared/schema";

const statusColors = {
  scheduled: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800", 
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusLabels = {
  scheduled: "Agendado",
  in_progress: "Em Andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export default function Schedule() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

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

  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ["/api/services"],
    enabled: isAuthenticated,
  });

  const { data: customers } = useQuery({
    queryKey: ["/api/customers"],
    enabled: isAuthenticated,
  });

  const { data: vehicles } = useQuery({
    queryKey: ["/api/vehicles"],
    enabled: isAuthenticated,
  });

  const { data: serviceTypes } = useQuery({
    queryKey: ["/api/service-types"],
    enabled: isAuthenticated,
  });

  const getCustomerName = (customerId: number) => {
    const customer = customers?.find((c: Customer) => c.id === customerId);
    return customer?.name || "Cliente não encontrado";
  };

  const getCustomerPhone = (customerId: number) => {
    const customer = customers?.find((c: Customer) => c.id === customerId);
    return customer?.phone || null;
  };

  const getVehicleInfo = (vehicleId: number) => {
    const vehicle = vehicles?.find((v: Vehicle) => v.id === vehicleId);
    return vehicle ? `${vehicle.brand} ${vehicle.model} - ${vehicle.plate}` : "Veículo não encontrado";
  };

  const getServiceTypeName = (serviceTypeId: number) => {
    const serviceType = serviceTypes?.find((st: ServiceType) => st.id === serviceTypeId);
    return serviceType?.name || "Serviço não encontrado";
  };

  // Filter services for selected date
  const dayServices = services?.filter((service: Service) => 
    service.scheduledDate === selectedDate
  ).sort((a: Service, b: Service) => {
    const timeA = a.scheduledTime || '00:00';
    const timeB = b.scheduledTime || '00:00';
    return timeA.localeCompare(timeB);
  }) || [];

  // Get next 7 days for quick navigation
  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push({
        date: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('pt-BR', { 
          weekday: 'short', 
          day: 'numeric',
          month: 'short'
        }),
        isToday: i === 0
      });
    }
    return days;
  };

  const weekDays = getWeekDays();

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Agenda"
          subtitle="Visualize e gerencie os agendamentos"
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Date Navigation */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold">Navegação Rápida</h3>
            </div>
            <div className="flex space-x-2 overflow-x-auto">
              {weekDays.map((day) => (
                <Button
                  key={day.date}
                  variant={selectedDate === day.date ? "default" : "outline"}
                  className={`min-w-24 ${selectedDate === day.date ? 'bg-green-600 hover:bg-green-700' : ''} ${day.isToday ? 'ring-2 ring-green-200' : ''}`}
                  onClick={() => setSelectedDate(day.date)}
                >
                  <div className="text-center">
                    <div className="text-xs">{day.label}</div>
                    {day.isToday && <div className="text-xs text-green-200">Hoje</div>}
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Date Picker */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ou selecione uma data específica:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          {/* Selected Date Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Agendamentos para {new Date(selectedDate).toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </h2>
            <p className="text-gray-600">
              {dayServices.length} {dayServices.length === 1 ? 'serviço agendado' : 'serviços agendados'}
            </p>
          </div>

          {/* Services List */}
          {servicesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : dayServices.length > 0 ? (
            <div className="space-y-4">
              {dayServices.map((service: Service) => (
                <Card key={service.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="flex items-center bg-green-100 rounded-lg p-2">
                            <Clock className="h-5 w-5 text-green-600 mr-2" />
                            <span className="font-semibold text-green-800">
                              {service.scheduledTime || 'Horário não definido'}
                            </span>
                          </div>
                          <Badge className={statusColors[service.status as keyof typeof statusColors]}>
                            {statusLabels[service.status as keyof typeof statusLabels]}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="flex items-center text-gray-700">
                            <User className="h-4 w-4 mr-2 text-gray-500" />
                            <div>
                              <div className="font-medium">{getCustomerName(service.customerId)}</div>
                              {getCustomerPhone(service.customerId) && (
                                <div className="text-sm text-gray-500">
                                  {getCustomerPhone(service.customerId)}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center text-gray-700">
                            <Car className="h-4 w-4 mr-2 text-gray-500" />
                            <div className="font-medium">{getVehicleInfo(service.vehicleId)}</div>
                          </div>
                          
                          <div className="flex items-center text-gray-700">
                            <Wrench className="h-4 w-4 mr-2 text-gray-500" />
                            <div className="font-medium">{getServiceTypeName(service.serviceTypeId)}</div>
                          </div>
                        </div>
                        
                        {service.estimatedValue && (
                          <div className="mt-3">
                            <span className="text-lg font-semibold text-green-600">
                              R$ {Number(service.estimatedValue).toFixed(2)}
                            </span>
                          </div>
                        )}
                        
                        {service.notes && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-700">{service.notes}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col space-y-2 ml-4">
                        {getCustomerPhone(service.customerId) && (
                          <Button size="sm" variant="outline">
                            <Phone className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum agendamento para esta data
                </h3>
                <p className="text-gray-500">
                  Não há serviços agendados para {new Date(selectedDate).toLocaleDateString('pt-BR')}.
                </p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
