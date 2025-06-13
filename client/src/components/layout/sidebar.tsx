
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Home,
  Users,
  Car,
  Wrench,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const getNavigation = (userRole: string | null) => {
  const baseNavigation = [
    {
      name: "Painel Principal",
      description: "Visão geral do sistema",
      href: "/dashboard",
      icon: Home,
    },
    {
      name: "Gestão de Clientes",
      description: "Cadastro e histórico",
      href: "/customers",
      icon: Users,
    },
    {
      name: "Frota de Veículos",
      description: "Controle de veículos",
      href: "/vehicles",
      icon: Car,
    },
    {
      name: "Ordens de Serviço",
      description: "Serviços executados",
      href: "/services",
      icon: Wrench,
    },
    {
      name: "Agenda & Agendamentos",
      description: "Cronograma de trabalho",
      href: "/schedule",
      icon: Calendar,
    },
    {
      name: "Relatórios & Analytics",
      description: "Análises e estatísticas",
      href: "/reports",
      icon: BarChart3,
    },
  ];

  return baseNavigation;
};

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-800 text-white transition-all duration-300 shadow-2xl",
        isCollapsed ? "w-16" : "w-72"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-teal-600/50 bg-gradient-to-r from-teal-600/20 to-emerald-600/20 backdrop-blur-sm">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-white/20 to-white/10 rounded-lg flex items-center justify-center">
              <Car className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wider">CARHUB</h1>
              <p className="text-xs text-teal-200 font-medium">Sistema de Gestão</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-white hover:bg-white/10 rounded-lg transition-all duration-200"
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {getNavigation(user?.role || null).map((item, index) => {
          const isActive = location === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <div className="group relative">
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-left transition-all duration-200 rounded-xl group-hover:scale-[1.02]",
                    isActive 
                      ? "bg-gradient-to-r from-white/20 to-white/10 text-white shadow-lg border border-white/20" 
                      : "text-teal-100 hover:bg-white/10 hover:text-white",
                    isCollapsed ? "px-3 py-3" : "px-4 py-3 h-auto"
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <div className="flex items-center w-full">
                    <item.icon className={cn(
                      "h-5 w-5 flex-shrink-0",
                      isActive ? "text-white" : "text-teal-200",
                      !isCollapsed && "mr-3"
                    )} />
                    {!isCollapsed && (
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{item.name}</p>
                        <p className="text-xs text-teal-200/80 truncate">{item.description}</p>
                      </div>
                    )}
                  </div>
                </Button>
                
                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl">
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-xs text-gray-300">{item.description}</div>
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User info and logout */}
      <div className="p-4 border-t border-teal-600/50 bg-gradient-to-r from-teal-600/10 to-emerald-600/10">
        {!isCollapsed && user && (
          <div className="mb-4 p-3 bg-white/10 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-white/20 to-white/10 rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-white">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-teal-200 capitalize">
                  {user.role === "admin" ? "Administrador" : "Técnico"}
                </p>
              </div>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className={cn(
            "w-full justify-start text-white hover:bg-red-500/20 hover:text-red-100 disabled:opacity-50 rounded-xl transition-all duration-200",
            isCollapsed ? "px-3 py-3" : "px-4 py-3"
          )}
          title={isCollapsed ? (logoutMutation.isPending ? "Saindo..." : "Sair do Sistema") : undefined}
        >
          <LogOut className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
          {!isCollapsed && (
            <span className="font-medium">
              {logoutMutation.isPending ? "Saindo..." : "Sair do Sistema"}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
