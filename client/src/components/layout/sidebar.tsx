
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
  Shield,
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

  // Adiciona Admin apenas para usuários admin
  if (userRole === "admin") {
    baseNavigation.push({
      name: "Admin",
      href: "/admin",
      icon: Shield,
    });
  }

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
        "flex flex-col h-screen bg-gradient-to-b from-teal-700 to-teal-800 text-white transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-teal-600">
        {!isCollapsed && (
          <h1 className="text-xl font-bold tracking-wider">CARHUB</h1>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-white hover:bg-teal-600"
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
                  "w-full justify-start text-left text-white hover:bg-teal-600",
                  isActive && "bg-teal-600",
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
      <div className="p-4 border-t border-teal-600">
        {!isCollapsed && user && (
          <div className="mb-3">
            <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-teal-200">{user.role}</p>
          </div>
        )}
        <Button
          variant="ghost"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className={cn(
            "w-full justify-start text-white hover:bg-red-600 disabled:opacity-50",
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
