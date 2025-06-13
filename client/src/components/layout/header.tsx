import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Bell, Search, Shield, Settings, Car } from "lucide-react";
import { Link } from "wouter";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="bg-gradient-to-r from-white via-gray-50 to-white border-b border-gray-200 shadow-sm backdrop-blur-md">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {/* Logo/Brand Section */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <Car className="h-5 w-5 text-white" />
              </div>
              <div className="hidden md:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                  CARHUB
                </h1>
                <p className="text-xs text-gray-500 font-medium">Sistema de Gestão</p>
              </div>
            </div>
            
            {/* Page Title Section */}
            <div className="border-l border-gray-300 pl-6">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                {title}
              </h2>
              {subtitle && (
                <p className="text-sm text-gray-600 font-medium mt-1">{subtitle}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all duration-200"
              >
                <Search className="h-5 w-5" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all duration-200 relative"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs"></span>
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
                  <span className="hidden md:inline">Administração</span>
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