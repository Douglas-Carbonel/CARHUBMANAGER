import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UseConfirmNavigationReturn {
  ConfirmDialog: React.ComponentType;
  confirmNavigation: (callback: () => void) => Promise<void>;
  showConfirmDialog: boolean;
  setShowConfirmDialog: (show: boolean) => void;
}

export function useConfirmNavigation(): UseConfirmNavigationReturn {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  const confirmNavigation = async (callback: () => void) => {
    setPendingCallback(() => callback);
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    if (pendingCallback) {
      pendingCallback();
    }
    setShowConfirmDialog(false);
    setPendingCallback(null);
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    setPendingCallback(null);
  };

  const ConfirmDialog = () => (
    <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
          <AlertDialogDescription>
            Você tem alterações não salvas. Deseja realmente sair? Todas as alterações serão perdidas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Sair sem salvar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return {
    ConfirmDialog,
    confirmNavigation,
    showConfirmDialog,
    setShowConfirmDialog,
  };
}