import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Bell, Search, Shield, Settings } from "lucide-react";
import { Link } from "wouter";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="bg-gradient-to-r from-white to-gray-50 border-b border-gray-200 shadow-sm px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-gray-600 font-medium mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-teal-600 hover:bg-teal-50 transition-all duration-200">
            <Search className="h-5 w-5" />
          </Button>
          
          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-teal-600 hover:bg-teal-50 transition-all duration-200">
            <Bell className="h-5 w-5" />
          </Button>
          
          {user?.role === "admin" && (
            <Link href="/admin">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 border border-teal-200 shadow-sm"
                title="Painel Administrativo"
              >
                <Shield className="h-5 w-5 mr-2" />
                <span className="hidden md:inline">Admin</span>
              </Button>
            </Link>
          )}
          
          <div className="flex items-center space-x-3 pl-3 border-l border-gray-300">
            <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg ring-2 ring-teal-100">
              <span className="text-white text-sm font-semibold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-gray-800">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-teal-600 capitalize font-medium">
                {user?.role === "admin" ? "Administrador" : "Técnico"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}