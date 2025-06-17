import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  TrendingUp,
  Users,
  Car,
  Wrench,
  Calendar,
  DollarSign,
  Download,
  Filter,
  AlertCircle,
  Shield,
} from "lucide-react";

import { ServiceAnalytics } from "@/components/dashboard/service-analytics";
import { CustomerAnalytics } from "@/components/dashboard/customer-analytics";
import { VehicleAnalytics } from "@/components/dashboard/vehicle-analytics";
import { useAuth } from "@/hooks/useAuth";

export default function ReportsPage() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [selectedReport, setSelectedReport] = useState("overview");

  // Redirect non-admin users
  if (user?.role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
          <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  // Verificar se o usuário é admin
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-red-100 rounded-full">
                  <Shield className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Acesso Negado</h2>
                <p className="text-gray-600 max-w-md">
                  Você não tem permissão para acessar esta página. Apenas administradores podem visualizar relatórios.
                </p>
                <Button 
                  onClick={() => window.history.back()}
                  className="mt-4"
                >
                  Voltar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
}