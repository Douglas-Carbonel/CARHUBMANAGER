import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Bell, Search } from "lucide-react";

export default function Header() {
  const { user } = useAuth();

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-emerald-100/50 px-6 py-4 shadow-sm shadow-emerald-500/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            Dashboard
          </h2>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="text-gray-600">
            <Search className="h-5 w-5" />
          </Button>
          
          <Button variant="ghost" size="sm" className="text-gray-600">
            <Bell className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <span className="text-white text-sm font-medium">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <span className="text-sm font-medium text-gray-700">
              {user?.firstName} {user?.lastName}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}