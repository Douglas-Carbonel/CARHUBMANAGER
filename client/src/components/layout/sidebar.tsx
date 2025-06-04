import { Link, useLocation } from "wouter";
import { Car, BarChart3, Users, Calendar, Wrench, Settings, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Clientes", href: "/customers", icon: Users },
  { name: "Veículos", href: "/vehicles", icon: Car },
  { name: "Serviços", href: "/services", icon: Wrench },
  { name: "Agenda", href: "/schedule", icon: Calendar },
  { name: "Configurações", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="flex-shrink-0 w-64 bg-sidebar text-sidebar-foreground">
      {/* Logo & Brand */}
      <div className="flex items-center justify-center h-16 bg-primary">
        <Car className="h-8 w-8 text-white mr-3" />
        <span className="text-xl font-bold text-white">CarHub</span>
      </div>
      
      {/* Navigation */}
      <nav className="mt-8">
        <div className="px-4">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <a
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg mb-2 transition-colors ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-gray-300 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </a>
              </Link>
            );
          })}
        </div>
      </nav>
      
      {/* User Profile */}
      <div className="absolute bottom-0 w-64 p-4 border-t border-sidebar-border">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            {user?.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <User className="h-5 w-5 text-white" />
            )}
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-sidebar-foreground">
              {user?.firstName || user?.email || "Usuário"}
            </p>
            <p className="text-xs text-gray-400">
              {user?.role === "admin" ? "Administrador" : "Técnico"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-gray-400 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
