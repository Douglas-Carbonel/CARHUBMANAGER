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
    <header className="bg-gradient-to-r from-white via-blue-50/30 to-white border-b border-blue-100 px-8 py-6 sticky top-0 z-20 shadow-sm backdrop-blur-sm bg-white/95">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 bg-clip-text text-transparent tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-base text-slate-600 mt-1 font-medium">{subtitle}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-700 hover:bg-blue-50/50 rounded-lg transition-all duration-200">
            <Search className="h-5 w-5" />
          </Button>
          
          <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-700 hover:bg-blue-50/50 rounded-lg transition-all duration-200">
            <Bell className="h-5 w-5" />
          </Button>
          
          {user?.role === "admin" && (
            <Link href="/admin">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 shadow-md rounded-lg transition-all duration-200 font-medium"
                title="Painel Administrativo"
              >
                <Shield className="h-4 w-4 mr-2" />
                <span className="hidden md:inline">Admin</span>
              </Button>
            </Link>
          )}
          
          <div className="flex items-center space-x-3 pl-4 border-l border-blue-200">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white text-sm font-semibold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-500 capitalize font-medium">
                {user?.role === "admin" ? "Administrador" : "Técnico"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}