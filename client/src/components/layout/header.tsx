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
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-gray-600">{subtitle}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800 hover:bg-gray-100">
            <Search className="h-5 w-5" />
          </Button>
          
          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800 hover:bg-gray-100">
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
          
          <div className="flex items-center space-x-3 pl-2 border-l border-gray-200">
            <div className="w-9 h-9 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full flex items-center justify-center shadow-md">
              <span className="text-white text-sm font-medium">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-800">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.role === "admin" ? "Administrador" : "Técnico"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}