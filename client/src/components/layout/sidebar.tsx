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
  const { logout } = useAuth();
  const [location] = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home, description: "Visão geral" },
    { name: "Clientes", href: "/customers", icon: Users, description: "Gestão de clientes" },
    { name: "Veículos", href: "/vehicles", icon: Car, description: "Controle da frota" },
    { name: "Serviços", href: "/services", icon: Wrench, description: "Ordens de serviço" },
    { name: "Agenda", href: "/schedule", icon: Calendar, description: "Agendamentos" },
    { name: "Relatórios", href: "/reports", icon: BarChart3, description: "Analytics" },
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 z-50 h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700/50 shadow-2xl transition-all duration-300 flex flex-col",
          isExpanded ? "w-72" : "w-16",
          "lg:relative lg:z-auto"
        )}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Header */}
        <div className="flex items-center p-4 border-b border-slate-700/50 bg-slate-800/50">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg ring-2 ring-teal-500/20">
            <span className="text-white text-lg font-bold">C</span>
          </div>
          {isExpanded && (
            <div className="ml-3">
              <h1 className="text-white text-xl font-bold tracking-tight">CarHub</h1>
              <p className="text-slate-400 text-xs font-medium">Sistema de Gestão Automotiva</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto lg:hidden text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-3">
            {navigation.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;

              return (
                <li key={item.name}>
                  <Link href={item.href}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start text-left transition-all duration-200 rounded-xl group relative overflow-hidden",
                        isActive
                          ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg ring-2 ring-teal-500/30 hover:from-teal-700 hover:to-emerald-700"
                          : "text-slate-300 hover:text-white hover:bg-slate-700/50 hover:shadow-lg",
                        !isExpanded && "px-3"
                      )}
                    >
                      <Icon className={cn(
                        "h-5 w-5 flex-shrink-0 transition-all duration-200",
                        isActive ? "text-white" : "text-slate-400 group-hover:text-teal-400"
                      )} />
                      {isExpanded && (
                        <div className="ml-3 flex flex-col">
                          <span className="font-semibold text-sm">{item.name}</span>
                          <span className={cn(
                            "text-xs transition-colors duration-200",
                            isActive ? "text-white/80" : "text-slate-500 group-hover:text-slate-300"
                          )}>
                            {item.description}
                          </span>
                        </div>
                      )}
                      {isActive && (
                        <div className="absolute right-2 w-2 h-2 bg-white rounded-full opacity-80" />
                      )}
                    </Button>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              "w-full justify-start text-slate-300 hover:text-white hover:bg-red-600/20 hover:border-red-500/30 transition-all duration-200 rounded-xl border border-transparent group",
              !isExpanded && "px-3"
            )}
          >
            <LogOut className="h-5 w-5 flex-shrink-0 text-slate-400 group-hover:text-red-400 transition-colors duration-200" />
            {isExpanded && (
              <div className="ml-3 flex flex-col">
                <span className="font-semibold text-sm">Sair</span>
                <span className="text-xs text-slate-500 group-hover:text-slate-300">
                  Encerrar sessão
                </span>
              </div>
            )}
          </Button>

          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
                <p className="text-xs text-slate-500 font-medium">
                  CarHub v1.0.0
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}