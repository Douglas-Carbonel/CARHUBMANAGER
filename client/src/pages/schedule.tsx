

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, User, Car, Wrench, Phone, Plus, ChevronLeft, ChevronRight, Filter, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Service, type Customer, type Vehicle, type ServiceType } from "@shared/schema";
import NewServiceModal from "@/components/modals/new-service-modal";

const statusColors = {
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-orange-100 text-orange-800 border-orange-200", 
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const statusLabels = {
  scheduled: "Agendado",
  in_progress: "Em Andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const priorityColors = {
  high: "border-l-red-500 bg-red-50",
  medium: "border-l-yellow-500 bg-yellow-50",
  low: "border-l-green-500 bg-green-50",
  normal: "border-l-blue-500 bg-blue-50",
};

export default function Schedule() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isNewServiceModalOpen, setIsNewServiceModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"timeline" | "grid">("timeline");

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

  // Filter services for selected date and status
  let dayServices = services?.filter((service: Service) => 
    service.scheduledDate === selectedDate &&
    (statusFilter === "all" || service.status === statusFilter)
  ).sort((a: Service, b: Service) => {
    const timeA = a.scheduledTime || '00:00';
    const timeB = b.scheduledTime || '00:00';
    return timeA.localeCompare(timeB);
  }) || [];

  // Group services by time slots for grid view
  const timeSlots = [
    "08:00", "09:00", "10:00", "11:00", "12:00", 
    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
  ];

  const getServicesForTimeSlot = (time: string) => {
    return dayServices.filter((service: Service) => {
      const serviceTime = service.scheduledTime?.substring(0, 5);
      return serviceTime === time;
    });
  };

  // Navigation functions
  const navigateDate = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedDate);
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const getServicePriority = (service: Service) => {
    if (service.status === 'in_progress') return 'high';
    if (service.estimatedValue && Number(service.estimatedValue) > 500) return 'medium';
    return 'normal';
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const ServiceCard = ({ service, isCompact = false }: { service: Service, isCompact?: boolean }) => (
    <Card className={`hover:shadow-lg transition-all duration-200 border-l-4 ${priorityColors[getServicePriority(service) as keyof typeof priorityColors]} ${isCompact ? 'mb-2' : 'mb-4'}`}>
      <CardContent className={isCompact ? "p-3" : "p-4"}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <div className="flex items-center bg-white rounded-md px-2 py-1 border shadow-sm">
                <Clock className="h-3 w-3 text-gray-600 mr-1" />
                <span className="font-medium text-gray-800 text-xs">
                  {service.scheduledTime || 'Horário não definido'}
                </span>
              </div>
              <Badge className={`${statusColors[service.status as keyof typeof statusColors]} border text-xs`}>
                {statusLabels[service.status as keyof typeof statusLabels]}
              </Badge>
            </div>
            
            <div className={`${isCompact ? 'space-y-2' : 'grid grid-cols-1 lg:grid-cols-2 gap-4'}`}>
              <div className="space-y-1">
                <div className="flex items-center text-gray-700">
                  <User className="h-3 w-3 mr-2 text-gray-500" />
                  <div className="text-sm">
                    <div className="font-medium">{getCustomerName(service.customerId)}</div>
                    {getCustomerPhone(service.customerId) && !isCompact && (
                      <div className="text-xs text-gray-500 flex items-center mt-1">
                        <Phone className="h-3 w-3 mr-1" />
                        {getCustomerPhone(service.customerId)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center text-gray-700">
                  <Car className="h-3 w-3 mr-2 text-gray-500" />
                  <div className="text-sm font-medium">{getVehicleInfo(service.vehicleId)}</div>
                </div>
                <div className="flex items-center text-gray-700">
                  <Wrench className="h-3 w-3 mr-2 text-gray-500" />
                  <div className="text-sm">{getServiceTypeName(service.serviceTypeId)}</div>
                </div>
              </div>
            </div>
            
            {service.estimatedValue && !isCompact && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className="text-lg font-semibold text-green-600">
                  R$ {Number(service.estimatedValue).toFixed(2)}
                </span>
              </div>
            )}
            
            {service.notes && !isCompact && (
              <div className="mt-3 p-2 bg-gray-50 rounded-md border">
                <p className="text-xs text-gray-700">{service.notes}</p>
              </div>
            )}
          </div>
          
          <div className="flex flex-col space-y-1 ml-3">
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
              <Eye className="h-3 w-3" />
            </Button>
            {getCustomerPhone(service.customerId) && (
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                <Phone className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Agenda"
          subtitle="Visualize e gerencie os agendamentos"
        />
        
        <main className="flex-1 overflow-y-auto">
          {/* Enhanced Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateDate('prev')}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="text-center min-w-[200px]">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {new Date(selectedDate).toLocaleDateString('pt-BR', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long'
                      })}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {dayServices.length} {dayServices.length === 1 ? 'agendamento' : 'agendamentos'}
                    </p>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateDate('next')}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="scheduled">Agendado</SelectItem>
                      <SelectItem value="in_progress">Em Andamento</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <Button
                      size="sm"
                      variant={viewMode === "timeline" ? "default" : "ghost"}
                      onClick={() => setViewMode("timeline")}
                      className="text-xs"
                    >
                      Timeline
                    </Button>
                    <Button
                      size="sm"
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      onClick={() => setViewMode("grid")}
                      className="text-xs"
                    >
                      Grade
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {!isToday && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToToday}
                  >
                    Hoje
                  </Button>
                )}
                
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
                
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => setIsNewServiceModalOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Serviço
                </Button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6">
            {servicesLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : dayServices.length > 0 ? (
              viewMode === "timeline" ? (
                <div className="space-y-3">
                  {dayServices.map((service: Service) => (
                    <ServiceCard key={service.id} service={service} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {timeSlots.map((timeSlot) => {
                    const slotServices = getServicesForTimeSlot(timeSlot);
                    return (
                      <Card key={timeSlot} className="min-h-[200px]">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center">
                            <Clock className="h-5 w-5 mr-2 text-gray-600" />
                            {timeSlot}
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {slotServices.length}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          {slotServices.length > 0 ? (
                            <div className="space-y-2">
                              {slotServices.map((service) => (
                                <ServiceCard key={service.id} service={service} isCompact />
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-400">
                              <div className="text-sm">Horário livre</div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )
            ) : (
              <Card className="border-dashed border-2 border-gray-300">
                <CardContent className="text-center py-16">
                  <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-6" />
                  <h3 className="text-xl font-medium text-gray-900 mb-3">
                    Nenhum agendamento para esta data
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Não há serviços agendados para {new Date(selectedDate).toLocaleDateString('pt-BR')}.
                  </p>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => setIsNewServiceModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agendar Primeiro Serviço
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>

      <NewServiceModal
        isOpen={isNewServiceModalOpen}
        onClose={() => setIsNewServiceModalOpen(false)}
      />
    </div>
  );
}

