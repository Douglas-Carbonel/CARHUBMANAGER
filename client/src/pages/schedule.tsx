
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, Car } from "lucide-react";
import { insertServiceSchema, type Service, type Customer, type Vehicle, type ServiceType } from "@shared/schema";
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isToday, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import NewServiceModal from "@/components/modals/new-service-modal";

const translateStatus = (status: string): string => {
  const statusTranslations: Record<string, string> = {
    'scheduled': 'Agendado',
    'in_progress': 'Em Andamento',
    'completed': 'Concluído',
    'cancelled': 'Cancelado'
  };
  return statusTranslations[status] || status;
};

export default function SchedulePage() {
  const [location, setLocation] = useLocation();
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'Month' | 'Week' | 'Day'>('Month');
  const [periodFilter, setPeriodFilter] = useState<string>("todos");
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDayAppointmentsModalOpen, setIsDayAppointmentsModalOpen] = useState(false);
  const [selectedDayServices, setSelectedDayServices] = useState<any[]>([]);

  // Fetch data
  const { data: services = [], isLoading: servicesLoading } = useQuery<(Service & { customer: Customer; vehicle: Vehicle; serviceType: ServiceType })[]>({
    queryKey: ["/api/services"],
  });

  // Filter services by period
  const getFilteredServices = () => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    return services.filter(service => {
      if (!service.scheduledDate) return false;
      
      const serviceDate = parseISO(service.scheduledDate);
      
      switch (periodFilter) {
        case "hoje":
          return serviceDate >= startOfToday && serviceDate <= endOfToday;
        case "semana":
          const startWeek = startOfWeek(today, { weekStartsOn: 1 });
          const endWeek = endOfWeek(today, { weekStartsOn: 1 });
          return serviceDate >= startWeek && serviceDate <= endWeek;
        case "mes":
          const startMonth = startOfMonth(today);
          const endMonth = endOfMonth(today);
          return serviceDate >= startMonth && serviceDate <= endMonth;
        default:
          return true;
      }
    });
  };

  const filteredServices = getFilteredServices();

  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const startDate = startOfMonth(currentDate);
    const endDate = endOfMonth(currentDate);
    const startCalendar = startOfWeek(startDate, { weekStartsOn: 1 });
    const endCalendar = endOfWeek(endDate, { weekStartsOn: 1 });

    const days = [];
    let day = startCalendar;

    while (day <= endCalendar) {
      const dayServices = services.filter(service => 
        service.scheduledDate && isSameDay(parseISO(service.scheduledDate), day)
      );
      
      days.push({
        date: new Date(day),
        services: dayServices,
        isCurrentMonth: day.getMonth() === currentDate.getMonth(),
        isToday: isToday(day)
      });
      
      day = addDays(day, 1);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  // Get services for selected date
  const getServicesForDate = (date: Date) => {
    return services.filter(service => 
      service.scheduledDate && isSameDay(parseISO(service.scheduledDate), date)
    );
  };

  // Handle day click
  const handleDayClick = (date: Date) => {
    const dayServices = getServicesForDate(date);
    if (dayServices.length > 1) {
      setSelectedDayServices(dayServices);
      setIsDayAppointmentsModalOpen(true);
    } else if (dayServices.length === 1) {
      setLocation(`/services?openModal=true&serviceId=${dayServices[0].id}`);
    }
    setSelectedDate(date);
  };

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Get count for period filters
  const getFilterCount = (period: string) => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    return services.filter(service => {
      if (!service.scheduledDate) return false;
      
      const serviceDate = parseISO(service.scheduledDate);
      
      switch (period) {
        case "hoje":
          return serviceDate >= startOfToday && serviceDate <= endOfToday;
        case "semana":
          const startWeek = startOfWeek(today, { weekStartsOn: 1 });
          const endWeek = endOfWeek(today, { weekStartsOn: 1 });
          return serviceDate >= startWeek && serviceDate <= endWeek;
        case "mes":
          const startMonth = startOfMonth(today);
          const endMonth = endOfMonth(today);
          return serviceDate >= startMonth && serviceDate <= endMonth;
        default:
          return services.length;
      }
    }).length;
  };

  

  if (servicesLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-900">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header title="Agenda" />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {/* Top Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
              <p className="text-gray-600 text-sm mt-1">Gerencie seus agendamentos</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Calendar Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Calendário</h2>
                {/* View Mode Selector */}
                <div className="flex bg-gray-100 rounded-full p-1">
                  {[
                    { key: 'Month', label: 'Mês' },
                    { key: 'Week', label: 'Semana' },
                    { key: 'Day', label: 'Dia' }
                  ].map(mode => (
                    <Button
                      key={mode.key}
                      variant={viewMode === mode.key ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode(mode.key as any)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs",
                        viewMode === mode.key 
                          ? "bg-teal-600 text-white hover:bg-teal-700" 
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                      )}
                    >
                      {mode.label}
                    </Button>
                  ))}
                </div>
              </div>

              <Card className="bg-white border-gray-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-gray-900">
                    {format(currentDate, "MMMM yyyy", { locale: ptBR })}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePrevMonth}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNextMonth}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {viewMode === 'Month' && (
                    <div className="grid grid-cols-7 gap-1">
                      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
                        <div key={`header-${index}`} className="text-center text-sm font-medium text-gray-600 p-2">
                          {day}
                        </div>
                      ))}
                      {calendarDays.map((day, index) => (
                        <div
                          key={`day-${index}-${day.date.getTime()}`}
                          onClick={() => handleDayClick(day.date)}
                          className={cn(
                            "relative p-2 text-center cursor-pointer rounded-lg transition-colors min-h-[40px] flex items-center justify-center",
                            day.isCurrentMonth 
                              ? "text-gray-900 hover:bg-gray-100" 
                              : "text-gray-400",
                            day.isToday && "bg-teal-600 text-white hover:bg-teal-700",
                            day.services.length > 0 && !day.isToday && "bg-blue-50 border border-blue-200"
                          )}
                        >
                          <span className="text-sm">{format(day.date, "d")}</span>
                          {day.services.length > 0 && (
                            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-1">
                              {day.services.slice(0, 3).map((_, i) => (
                                <div key={i} className="w-1 h-1 bg-teal-500 rounded-full" />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {viewMode === 'Week' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-gray-600 pb-2">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
                          <div key={`week-header-${index}`}>{day}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                        {(() => {
                          const startWeekDay = startOfWeek(currentDate, { weekStartsOn: 0 });
                          const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startWeekDay, i));
                          return weekDays.map((day, index) => {
                            const dayServices = services.filter(service => 
                              service.scheduledDate && isSameDay(parseISO(service.scheduledDate), day)
                            );
                            return (
                              <div
                                key={`week-day-${index}`}
                                onClick={() => handleDayClick(day)}
                                className={cn(
                                  "p-3 rounded-lg cursor-pointer transition-colors min-h-[80px] border border-gray-200",
                                  isToday(day) && "bg-teal-600 text-white",
                                  dayServices.length > 0 && !isToday(day) && "bg-blue-50 border-blue-200",
                                  !dayServices.length && !isToday(day) && "hover:bg-gray-50"
                                )}
                              >
                                <div className="text-sm font-medium mb-1">{format(day, "d")}</div>
                                <div className="space-y-1">
                                  {dayServices.slice(0, 2).map(service => (
                                    <div key={service.id} className="text-xs bg-teal-500 text-white px-1 py-0.5 rounded truncate">
                                      {service.customer.name}
                                    </div>
                                  ))}
                                  {dayServices.length > 2 && (
                                    <div className="text-xs text-gray-500">+{dayServices.length - 2} mais</div>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}

                  {viewMode === 'Day' && (
                    <div className="space-y-3">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {(() => {
                          const dayServices = services.filter(service => 
                            service.scheduledDate && isSameDay(parseISO(service.scheduledDate), currentDate)
                          ).sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));
                          
                          if (dayServices.length === 0) {
                            return (
                              <div className="text-center py-8 text-gray-500">
                                <Calendar className="h-12 w-12 mx-auto mb-3" />
                                <p>Nenhum agendamento para este dia</p>
                              </div>
                            );
                          }

                          return dayServices.map(service => (
                            <Card 
                              key={service.id} 
                              className="bg-white border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                              onClick={() => setLocation(`/services?openModal=true&serviceId=${service.id}`)}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="font-medium text-gray-900 text-sm">{service.customer.name}</h4>
                                  <Badge className={cn(
                                    "text-xs",
                                    service.status === 'completed' && "bg-emerald-100 text-emerald-800",
                                    service.status === 'in_progress' && "bg-blue-100 text-blue-800",
                                    service.status === 'scheduled' && "bg-orange-100 text-orange-800",
                                    service.status === 'cancelled' && "bg-red-100 text-red-800"
                                  )}>
                                    {translateStatus(service.status)}
                                  </Badge>
                                </div>
                                <p className="text-gray-600 text-xs">
                                  <Clock className="inline h-3 w-3 mr-1" />
                                  {service.scheduledTime || "Horário não definido"}
                                </p>
                                <p className="text-gray-600 text-xs">
                                  <Car className="inline h-3 w-3 mr-1" />
                                  {service.vehicle.brand} {service.vehicle.model}
                                </p>
                              </CardContent>
                            </Card>
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Appointments List Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Agendamentos</h2>
                {/* Period Filter Dropdown */}
                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                  <SelectTrigger className="w-40 bg-white border-gray-300 text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300">
                    <SelectItem value="hoje">Hoje ({getFilterCount("hoje")})</SelectItem>
                    <SelectItem value="semana">Esta Semana ({getFilterCount("semana")})</SelectItem>
                    <SelectItem value="mes">Este Mês ({getFilterCount("mes")})</SelectItem>
                    <SelectItem value="todos">Todos ({services.length})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {filteredServices.length === 0 ? (
                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardContent className="p-6 text-center">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhum agendamento encontrado</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredServices.map(service => (
                    <Card 
                      key={service.id} 
                      className="bg-white border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer shadow-sm"
                      onClick={() => setLocation(`/services?openModal=true&serviceId=${service.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900">
                            {service.customer.name}
                          </h3>
                          <Badge 
                            className={cn(
                              "text-xs",
                              service.status === 'completed' && "bg-emerald-100 text-emerald-800",
                              service.status === 'in_progress' && "bg-blue-100 text-blue-800",
                              service.status === 'scheduled' && "bg-orange-100 text-orange-800",
                              service.status === 'cancelled' && "bg-red-100 text-red-800"
                            )}
                          >
                            {translateStatus(service.status)}
                          </Badge>
                        </div>
                        <p className="text-gray-600 text-sm mb-1">
                          <Clock className="inline h-3 w-3 mr-1" />
                          {service.scheduledTime || "Horário não definido"}
                        </p>
                        <p className="text-gray-600 text-sm">
                          <Car className="inline h-3 w-3 mr-1" />
                          {service.vehicle.brand} {service.vehicle.model} - {service.vehicle.licensePlate}
                        </p>
                        {service.serviceType && (
                          <p className="text-teal-600 text-sm mt-1">
                            {service.serviceType.name}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Floating Action Button */}
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-teal-600 hover:bg-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 z-50"
            size="sm"
          >
            <Plus className="h-6 w-6" />
          </Button>

          {/* Multiple Appointments Modal */}
          <Dialog open={isDayAppointmentsModalOpen} onOpenChange={setIsDayAppointmentsModalOpen}>
            <DialogContent className="bg-white border-gray-300 text-gray-900 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-gray-900">
                  Agendamentos para {selectedDate && format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {selectedDayServices.map(service => (
                  <Card 
                    key={service.id} 
                    className="bg-gray-50 border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => {
                      setIsDayAppointmentsModalOpen(false);
                      setLocation(`/services?openModal=true&serviceId=${service.id}`);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">
                          {service.customer.name}
                        </h3>
                        <Badge 
                          className={cn(
                            "text-xs",
                            service.status === 'completed' && "bg-emerald-100 text-emerald-800",
                            service.status === 'in_progress' && "bg-blue-100 text-blue-800",
                            service.status === 'scheduled' && "bg-orange-100 text-orange-800",
                            service.status === 'cancelled' && "bg-red-100 text-red-800"
                          )}
                        >
                          {translateStatus(service.status)}
                        </Badge>
                      </div>
                      <p className="text-gray-600 text-sm mb-1">
                        <Clock className="inline h-3 w-3 mr-1" />
                        {service.scheduledTime || "Horário não definido"}
                      </p>
                      <p className="text-gray-600 text-sm">
                        <Car className="inline h-3 w-3 mr-1" />
                        {service.vehicle.brand} {service.vehicle.model} - {service.vehicle.licensePlate}
                      </p>
                      {service.serviceType && (
                        <p className="text-teal-600 text-sm mt-1">
                          {service.serviceType.name}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          {/* New Service Modal */}
          <NewServiceModal 
            isOpen={isAddModalOpen} 
            onClose={() => setIsAddModalOpen(false)} 
          />
        </main>
      </div>
    </div>
  );
}
