import { useEffect, useState } from 'react';
import { notificationManager } from '@/lib/notifications';
import { useToast } from '@/hooks/use-toast';

export function useNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkSupport();
  }, []);

  const checkSupport = async () => {
    const supported = await notificationManager.initialize();
    setIsSupported(supported);

    if (supported) {
      const subscribed = await notificationManager.isSubscribed();
      setIsSubscribed(subscribed);
    }
  };

  const requestPermission = async () => {
    if (!isSupported) return;

    setIsLoading(true);
    try {
      const permissionGranted = await notificationManager.requestPermission();

      if (permissionGranted) {
        const subscribed = await notificationManager.subscribe();
        setIsSubscribed(subscribed);

        if (subscribed) {
          toast({
            title: "Notificações ativadas",
            description: "Você receberá notificações sobre seus serviços.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Não foi possível ativar as notificações. Verifique se o service worker está funcionando.",
          });
        }
      } else {
        toast({
          variant: "destructive",
          title: "Permissão negada",
          description: "As notificações foram bloqueadas pelo usuário.",
        });
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao solicitar permissão para notificações.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    setIsLoading(true);

    try {
      const success = await notificationManager.unsubscribe();

      if (success) {
        setIsSubscribed(false);
        toast({
          title: "Notificações desativadas",
          description: "Você não receberá mais notificações push.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível desativar as notificações.",
        });
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao desativar as notificações.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      const success = await notificationManager.sendTestNotification();

      if (success) {
        toast({
          title: "Notificação de teste enviada",
          description: "Verifique se recebeu a notificação no seu dispositivo.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível enviar a notificação de teste.",
        });
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao enviar a notificação de teste.",
      });
    }
  };

  return {
    isSupported,
    isSubscribed,
    isLoading,
    requestPermission,
    unsubscribe,
    sendTestNotification,
  };
}