
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';

interface UseUnsavedChangesProps {
  hasUnsavedChanges: boolean;
  message?: string;
}

export function useUnsavedChanges({ 
  hasUnsavedChanges, 
  message = "Você tem alterações não salvas. Deseja realmente sair?" 
}: UseUnsavedChangesProps) {
  const [, setLocation] = useLocation();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const originalSetLocation = useRef(setLocation);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      // Override setLocation to show confirmation
      const interceptedSetLocation = (path: string) => {
        if (hasUnsavedChanges) {
          setPendingNavigation(path);
          setShowConfirmDialog(true);
        } else {
          originalSetLocation.current(path);
        }
      };
      
      // This is a bit hacky but works for our use case
      (window as any).__interceptedSetLocation = interceptedSetLocation;
    } else {
      // Restore original navigation
      (window as any).__interceptedSetLocation = null;
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      (window as any).__interceptedSetLocation = null;
    };
  }, [hasUnsavedChanges, message]);

  const confirmNavigation = () => {
    if (pendingNavigation) {
      originalSetLocation.current(pendingNavigation);
      setPendingNavigation(null);
    }
    setShowConfirmDialog(false);
  };

  const cancelNavigation = () => {
    setPendingNavigation(null);
    setShowConfirmDialog(false);
  };

  return {
    showConfirmDialog,
    confirmNavigation,
    cancelNavigation,
    message
  };
}
