import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Lock } from "lucide-react";
import { useLocation } from "wouter";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { loginMutation } = useAuth();
  const { toast } = useToast();

  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginMutation.mutateAsync(loginData);
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: error.response?.data?.message || "Credenciais inválidas",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" 
         style={{
           background: 'linear-gradient(135deg, #a7f3d0 0%, #4d7c0f 25%, #059669 50%, #0f766e 75%, #164e63 100%)'
         }}>

      {/* Background geometric shapes */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large hexagon in background */}
        <div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-20"
          style={{
            width: '800px',
            height: '692px',
            clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
            background: 'linear-gradient(45deg, #065f46, #047857)'
          }}
        />

        {/* Smaller decorative shapes */}
        <div 
          className="absolute top-20 right-20 opacity-10"
          style={{
            width: '200px',
            height: '173px',
            clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
            background: '#10b981'
          }}
        />

        <div 
          className="absolute bottom-20 left-20 opacity-10"
          style={{
            width: '150px',
            height: '130px',
            clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
            background: '#059669'
          }}
        />
      </div>

      {/* Main login card */}
      <div className="relative z-10">
        <Card className="w-[400px] bg-white/95 backdrop-blur-sm shadow-2xl border-0">
          <CardHeader className="text-center pb-2">
            <div 
              className="mx-auto mb-4 relative"
              style={{
                width: '300px',
                height: '120px',
                clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                background: 'linear-gradient(135deg, #047857 0%, #059669 50%, #10b981 100%)',
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <h2 className="text-white text-sm font-light tracking-[0.3em] uppercase">
                  MEMBER LOGIN
                </h2>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 px-8 pb-8">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Username"
                    value={loginData.username}
                    onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                    className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 h-12"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••••"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 h-12"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-sm font-medium tracking-[0.1em] uppercase"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none'
                }}
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "LOGIN"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}