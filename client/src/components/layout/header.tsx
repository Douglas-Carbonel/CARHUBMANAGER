import { Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import NewServiceModal from "@/components/modals/new-service-modal";

interface HeaderProps {
  title: string;
  subtitle: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const [isNewServiceModalOpen, setIsNewServiceModalOpen] = useState(false);

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-600">{subtitle}</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => setIsNewServiceModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Serviço
            </Button>
            <div className="relative">
              <Button variant="ghost" size="sm" className="p-2">
                <Bell className="h-5 w-5 text-gray-400" />
                <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <NewServiceModal
        isOpen={isNewServiceModalOpen}
        onClose={() => setIsNewServiceModalOpen(false)}
      />
    </>
  );
}
