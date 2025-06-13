import { Car, Heart, Code, Globe } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 border-t border-gray-700">
      <div className="px-6 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          {/* Brand Section */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg">
              <Car className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                CARHUB
              </h3>
              <p className="text-xs text-gray-400 font-medium">
                Sistema de Gestão para Oficinas
              </p>
            </div>
          </div>

          {/* Status & Info */}
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-300 font-medium">Sistema Online</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-2 text-gray-400">
              <Globe className="h-4 w-4" />
              <span>Versão 2.1.0</span>
            </div>
          </div>

          {/* Copyright */}
          <div className="flex items-center space-x-2 text-gray-400 text-sm">
            <span>© {currentYear} CarHub</span>
            <span className="text-gray-600">•</span>
            <div className="flex items-center space-x-1">
              <span>Feito com</span>
              <Heart className="h-3 w-3 text-red-500 fill-current animate-pulse" />
              <span>para oficinas</span>
            </div>
          </div>
        </div>

        {/* Additional Info Bar */}
        <div className="mt-4 pt-4 border-t border-gray-700/50">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0 text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span>Desenvolvido para gestão completa de oficinas mecânicas</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>Suporte técnico disponível</span>
              <span className="text-gray-600">•</span>
              <span>Backup automático ativo</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}