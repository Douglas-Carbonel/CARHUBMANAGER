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
    setIsLoading(true);
    
    try {
      const granted = await notificationManager.requestPermission();
      
      if (granted) {
        const success = await notificationManager.subscribe();
        
        if (success) {
          setIsSubscribed(true);
          toast({
            title: "Notificações ativadas",
            description: "Você receberá lembretes de serviços agendados.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Não foi possível ativar as notificações.",
          });
        }
      } else {
        toast({
          variant: "destructive",
          title: "Permissão negada",
          description: "É necessário permitir notificações para usar este recurso.",
        });
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao configurar as notificações.",
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