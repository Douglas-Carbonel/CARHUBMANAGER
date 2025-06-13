

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
        "flex flex-col h-screen bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 text-white transition-all duration-300 shadow-2xl",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800 to-slate-700">
        {!isCollapsed && (
          <h1 className="text-xl font-bold tracking-wider bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
            CARHUB
          </h1>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200"
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
                  "w-full justify-start text-left text-white hover:bg-slate-700/50 transition-all duration-200 rounded-lg",
                  isActive && "bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg hover:from-teal-500 hover:to-emerald-500",
                  isCollapsed && "px-2"
                )}
              >
                <item.icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                {!isCollapsed && <span className="font-medium">{item.name}</span>}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* User info and logout */}
      <div className="p-4 border-t border-slate-700/50 bg-gradient-to-r from-slate-900 to-slate-800">
        {!isCollapsed && user && (
          <div className="mb-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/30">
            <p className="text-sm font-semibold text-white">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-teal-300 capitalize font-medium">{user.role}</p>
          </div>
        )}
        <Button
          variant="ghost"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className={cn(
            "w-full justify-start text-white hover:bg-red-600/20 hover:text-red-300 disabled:opacity-50 transition-all duration-200 rounded-lg border border-transparent hover:border-red-500/30",
            isCollapsed && "px-2"
          )}
        >
          <LogOut className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
          {!isCollapsed && <span className="font-medium">{logoutMutation.isPending ? "Saindo..." : "Sair"}</span>}
        </Button>
      </div>
    </div>
  );
}

