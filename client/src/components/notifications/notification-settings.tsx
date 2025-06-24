import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { notificationManager } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, BellOff, TestTube } from "lucide-react";

export default function NotificationSettings() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    try {
      setPermission(Notification.permission);
      
      if (Notification.permission === 'granted') {
        await notificationManager.initialize();
        const subscribed = await notificationManager.isSubscribed();
        setIsSubscribed(subscribed);
      }
    } catch (error) {
      console.error('Error checking notification status:', error);
    }
  };

  const handleToggleNotifications = async () => {
    setIsLoading(true);
    
    try {
      if (isSubscribed) {
        // Unsubscribe
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
      } else {
        // Request permission and subscribe
        const permissionGranted = await notificationManager.requestPermission();
        
        if (!permissionGranted) {
          toast({
            variant: "destructive",
            title: "Permissão negada",
            description: "É necessário permitir notificações para usar este recurso.",
          });
          return;
        }

        await notificationManager.initialize();
        const success = await notificationManager.subscribe();
        
        if (success) {
          setIsSubscribed(true);
          setPermission('granted');
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
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao configurar as notificações.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      const success = await notificationManager.sendTestNotification(
        "Teste do CarHub",
        "Esta é uma notificação de teste. Se você recebeu esta mensagem, as notificações estão funcionando!"
      );
      
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Configurações de Notificação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="notifications-toggle">Notificações Push</Label>
            <p className="text-sm text-muted-foreground">
              Receba lembretes 15-30 minutos antes dos serviços agendados
            </p>
          </div>
          <Switch
            id="notifications-toggle"
            checked={isSubscribed}
            onCheckedChange={handleToggleNotifications}
            disabled={isLoading || permission === 'denied'}
          />
        </div>

        {permission === 'denied' && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            <div className="flex items-center gap-2">
              <BellOff className="h-4 w-4" />
              <span>Notificações bloqueadas pelo navegador</span>
            </div>
            <p className="mt-1">
              Para ativar, vá nas configurações do navegador e permita notificações para este site.
            </p>
          </div>
        )}

        {isSubscribed && (
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleTestNotification}
              className="w-full"
            >
              <TestTube className="h-4 w-4 mr-2" />
              Enviar Notificação de Teste
            </Button>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>
            <strong>Como funciona:</strong> Quando você agenda um serviço com lembrete ativado,
            o sistema enviará uma notificação para seu dispositivo antes do horário marcado,
            mesmo se o navegador não estiver aberto.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}