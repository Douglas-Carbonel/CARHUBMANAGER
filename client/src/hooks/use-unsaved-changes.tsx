import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";

interface UseUnsavedChangesProps {
  hasUnsavedChanges: boolean;
  message?: string;
}

export function useUnsavedChanges({ 
  hasUnsavedChanges, 
  message = "Você tem alterações não salvas. Deseja realmente sair?" 
}: UseUnsavedChangesProps) {
  const [location, setLocation] = useLocation();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);
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
        if (hasUnsavedChanges && path !== location) {
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
  }, [hasUnsavedChanges, message, location]);

  const confirmNavigation = (callback?: () => void) => {
    if (callback) {
      callback();
    } else if (pendingCallback) {
      pendingCallback();
    } else if (pendingNavigation) {
      originalSetLocation.current(pendingNavigation);
    }
    setPendingCallback(null);
    setPendingNavigation(null);
    setShowConfirmDialog(false);
  };

  const cancelNavigation = () => {
    setPendingCallback(null);
    setPendingNavigation(null);
    setShowConfirmDialog(false);
  };

  // Add method to trigger confirmation with custom callback
  const triggerConfirmation = (callback: () => void) => {
    if (hasUnsavedChanges) {
      setPendingCallback(() => callback);
      setShowConfirmDialog(true);
    } else {
      callback();
    }
  };

  return {
    showConfirmDialog,
    confirmNavigation,
    cancelNavigation,
    triggerConfirmation,
    message
  };
}