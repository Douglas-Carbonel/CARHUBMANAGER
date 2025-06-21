
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { CheckCircle, Clock, AlertTriangle, XCircle, Activity } from "lucide-react";
import { useState } from "react";

const statusConfig = {
  completed: {
    label: "Concluídos",
    color: "#10b981",
    lightColor: "#d1fae5",
    icon: CheckCircle,
    description: "Serviços finalizados"
  },
  scheduled: {
    label: "Agendados",
    color: "#3b82f6",
    lightColor: "#dbeafe",
    icon: Clock,
    description: "Aguardando execução"
  },
  in_progress: {
    label: "Em Andamento",
    color: "#f59e0b",
    lightColor: "#fef3c7",
    icon: Activity,
    description: "Sendo executados"
  },
  cancelled: {
    label: "Cancelados",
    color: "#ef4444",
    lightColor: "#fee2e2",
    icon: XCircle,
    description: "Serviços cancelados"
  }
};

export default function ServiceStatusChart() {
  const [activeStatus, setActiveStatus] = useState<string | null>(null);

  const { data: statusData, isLoading } = useQuery({
    queryKey: ["/api/dashboard/service-status"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/service-status", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return await res.json();
    },
  });

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!statusData || statusData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Status dos Serviços
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            Nenhum serviço encontrado
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = statusData.map((item: any) => ({
    name: statusConfig[item.status as keyof typeof statusConfig]?.label || item.status,
    value: item.count,
    status: item.status,
    color: statusConfig[item.status as keyof typeof statusConfig]?.color || "#6b7280"
  }));

  const totalServices = chartData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const config = statusConfig[data.status as keyof typeof statusConfig];
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            {config?.icon && <config.icon className="h-4 w-4" style={{ color: data.color }} />}
            <span className="font-semibold">{data.name}</span>
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {data.value} serviços ({((data.value / totalServices) * 100).toFixed(1)}%)
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {config?.description}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {payload.map((entry: any, index: number) => {
          const config = statusConfig[entry.payload.status as keyof typeof statusConfig];
          const isActive = activeStatus === entry.payload.status || activeStatus === null;
          const opacity = activeStatus === null ? 1 : isActive ? 1 : 0.3;
          
          return (
            <div
              key={index}
              className={`flex items-center space-x-2 cursor-pointer transition-all duration-200 p-2 rounded-lg hover:bg-gray-50 ${
                isActive ? 'transform scale-105' : ''
              }`}
              style={{ opacity }}
              onClick={() => setActiveStatus(activeStatus === entry.payload.status ? null : entry.payload.status)}
            >
              {config?.icon && (
                <config.icon 
                  className="h-4 w-4" 
                  style={{ color: entry.color }} 
                />
              )}
              <span className="text-sm font-medium" style={{ color: entry.color }}>
                {entry.value}
              </span>
              <span className="text-sm text-gray-600">{entry.payload.name}</span>
              <Badge 
                variant="secondary" 
                className="text-xs"
                style={{ 
                  backgroundColor: config?.lightColor || '#f3f4f6',
                  color: entry.color
                }}
              >
                {((entry.payload.value / totalServices) * 100).toFixed(0)}%
              </Badge>
            </div>
          );
        })}
      </div>
    );
  };

  const filteredData = activeStatus 
    ? chartData.filter(item => item.status === activeStatus)
    : chartData;

  return (
    <Card className="bg-white/95 backdrop-blur-sm border border-gray-200/50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Activity className="h-5 w-5 mr-2 text-gray-700" />
            Status dos Serviços
          </div>
          <Badge variant="outline" className="text-sm">
            {totalServices} total
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={filteredData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
              >
                {filteredData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    stroke="white"
                    strokeWidth={2}
                    style={{
                      filter: activeStatus === entry.status || activeStatus === null 
                        ? 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' 
                        : 'none'
                    }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                content={<CustomLegend />}
                wrapperStyle={{ paddingTop: '20px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {activeStatus && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Filtro ativo:</span>
              <button
                onClick={() => setActiveStatus(null)}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Limpar filtro
              </button>
            </div>
            <div className="mt-1">
              <Badge 
                variant="secondary" 
                style={{ 
                  backgroundColor: statusConfig[activeStatus as keyof typeof statusConfig]?.lightColor,
                  color: statusConfig[activeStatus as keyof typeof statusConfig]?.color
                }}
              >
                {statusConfig[activeStatus as keyof typeof statusConfig]?.label}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
