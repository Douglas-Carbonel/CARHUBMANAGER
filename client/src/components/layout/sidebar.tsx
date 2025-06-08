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

const navigation = [
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
  {
    name: "Administração",
    href: "/admin",
    icon: Settings,
    adminOnly: true,
  },
];

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
        "flex flex-col h-screen bg-slate-800 text-white transition-all duration-300 shadow-xl border-r border-slate-700",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-900/50">
        {!isCollapsed && (
          <h1 className="text-xl font-bold tracking-wider text-white">CARHUB</h1>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-white hover:bg-slate-700 transition-all duration-200"
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.filter(item => !item.adminOnly || user?.role === 'admin').map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-left text-white hover:bg-slate-700 transition-all duration-200",
                  isActive && "bg-blue-600 shadow-md border-l-2 border-blue-400",
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
      <div className="p-4 border-t border-slate-700 bg-slate-900/30">
        {!isCollapsed && user && (
          <div className="mb-3 p-3 bg-slate-700/50 rounded-lg">
            <p className="text-sm font-medium text-white">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-slate-300">{user.role}</p>
          </div>
        )}
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            "w-full justify-start text-white hover:bg-red-600 transition-all duration-200",
            isCollapsed && "px-2"
          )}
        >
          <LogOut className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
          {!isCollapsed && "Sair"}
        </Button>
      </div>
    </div>
  );
}