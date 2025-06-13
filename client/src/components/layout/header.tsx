import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Bell, Search, Shield, Settings, Wrench, Users, Car, BarChart3, Calendar, Home } from "lucide-react";
import { Link } from "wouter";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const getPageIcon = (title: string) => {
  const iconMap: Record<string, any> = {
    "Dashboard": Home,
    "Gestão de Clientes": Users,
    "Frota de Veículos": Car,
    "Ordens de Serviço": Wrench,
    "Agenda & Agendamentos": Calendar,
    "Relatórios & Analytics": BarChart3,
  };
  
  return iconMap[title] || Home;
};

const getTitleDisplay = (title: string) => {
  const titleMap: Record<string, { main: string; sub: string }> = {
    "Dashboard": { main: "Central de Controle", sub: "Painel de gestão completa" },
    "Gestão de Clientes": { main: "Central de Clientes", sub: "Cadastro e relacionamento" },
    "Frota de Veículos": { main: "Gestão da Frota", sub: "Controle de veículos" },
    "Ordens de Serviço": { main: "Centro de Serviços", sub: "Ordens e manutenções" },
    "Agenda & Agendamentos": { main: "Central de Agendas", sub: "Cronograma e compromissos" },
    "Relatórios & Analytics": { main: "Inteligência de Negócio", sub: "Analytics e métricas" },
  };
  
  return titleMap[title] || { main: title, sub: "Sistema de gestão automotiva" };
};

export default function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuth();
  const PageIcon = getPageIcon(title);
  const titleDisplay = getTitleDisplay(title);

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="px-6 py-5">
        <div className="flex items-center justify-between">
          {/* Page Title Section */}
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
              <PageIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                {titleDisplay.main}
              </h1>
              <p className="text-sm text-gray-600 font-medium mt-0.5">
                {subtitle || titleDisplay.sub}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all duration-200"
                title="Buscar"
              >
                <Search className="h-5 w-5" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all duration-200 relative"
                title="Notificações"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
              </Button>
            </div>
            
            {/* Admin Button */}
            {user?.role === "admin" && (
              <Link href="/admin">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 border-teal-200 shadow-sm rounded-xl font-medium px-4"
                  title="Painel Administrativo"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  <span className="hidden md:inline">Admin</span>
                </Button>
              </Link>
            )}
            
            {/* User Profile Section */}
            <div className="flex items-center space-x-3 pl-4 border-l border-gray-300">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-white">
                <span className="text-white text-sm font-bold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-teal-600 font-medium capitalize">
                  {user?.role === "admin" ? "Administrador" : "Técnico"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}