
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
      name: "Dashboard",
      href: "/dashboard",
      icon: Home,
    },
    {
      name: "Clientes",
      href: "/customers",
      icon: Users,
    },
    {
      name: "Veículos",
      href: "/vehicles",
      icon: Car,
    },
    {
      name: "Serviços",
      href: "/services",
      icon: Wrench,
    },
    {
      name: "Agenda",
      href: "/schedule",
      icon: Calendar,
    },
    {
      name: "Relatórios",
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
        "flex flex-col h-screen bg-gradient-to-b from-teal-700 via-emerald-800 to-teal-900 text-white transition-all duration-300 shadow-2xl border-r border-teal-600",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-teal-600/50 bg-gradient-to-r from-teal-700 to-emerald-700">
        {!isCollapsed && (
          <div className="flex flex-col items-start">
            <div className="relative">
              <h1 className="text-2xl font-serif text-white tracking-tight leading-none">
                <span className="font-light italic">Car</span>
                <span className="font-bold ml-1">Hub</span>
              </h1>
              <div className="absolute -bottom-1 left-0 w-full h-px bg-gradient-to-r from-cyan-300 via-white to-transparent opacity-60"></div>
            </div>
            <p className="text-xs text-cyan-100/70 font-light tracking-[0.2em] mt-1 ml-0.5">
              Sistema de Gestão
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-cyan-200 hover:text-white hover:bg-teal-600/50 rounded-lg transition-all duration-200"
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {getNavigation(user?.role || null).map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-left text-cyan-200 hover:text-white hover:bg-teal-600/50 rounded-lg transition-all duration-200 font-medium",
                  isActive && "bg-gradient-to-r from-emerald-400 to-cyan-400 text-teal-900 shadow-lg font-semibold",
                  isCollapsed && "px-2"
                )}
              >
                <item.icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                {!isCollapsed && item.name}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* User info and logout */}
      <div className="p-4 border-t border-teal-600/50 bg-gradient-to-r from-emerald-800 to-teal-900">
        <Button
          variant="ghost"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className={cn(
            "w-full justify-start text-cyan-200 hover:text-white hover:bg-red-600/80 disabled:opacity-50 rounded-lg transition-all duration-200 font-medium border border-red-300/30 hover:border-red-400/60",
            isCollapsed && "px-2"
          )}
        >
          <LogOut className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
          {!isCollapsed && (logoutMutation.isPending ? "Saindo..." : "Sair")}
        </Button>
      </div>
    </div>
  );
}
