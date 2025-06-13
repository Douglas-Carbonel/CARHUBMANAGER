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
    <header className="bg-gradient-to-r from-white via-teal-50/30 to-white border-b border-teal-100 px-8 py-6 sticky top-0 z-20 shadow-sm backdrop-blur-sm bg-white/95">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-700 via-emerald-600 to-cyan-600 bg-clip-text text-transparent tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-base text-teal-700 mt-1 font-medium">{subtitle}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="text-teal-600 hover:text-teal-700 hover:bg-teal-50/50 rounded-lg transition-all duration-200">
            <Search className="h-5 w-5" />
          </Button>
          
          <Button variant="ghost" size="sm" className="text-teal-600 hover:text-teal-700 hover:bg-teal-50/50 rounded-lg transition-all duration-200">
            <Bell className="h-5 w-5" />
          </Button>
          
          {user?.role === "admin" && (
            <Link href="/admin">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-200 shadow-md rounded-lg transition-all duration-200 font-medium"
                title="Painel Administrativo"
              >
                <Shield className="h-4 w-4 mr-2" />
                <span className="hidden md:inline">Admin</span>
              </Button>
            </Link>
          )}
          
          <div className="flex items-center space-x-3 pl-4 border-l border-teal-200">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-600 via-emerald-600 to-cyan-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white text-sm font-semibold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-teal-800">
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