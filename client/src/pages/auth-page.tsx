
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { User, Lock, Car, Users, Wrench, Calendar } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Nome de usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  firstName: z.string().min(1, "Nome é obrigatório"),
  lastName: z.string().min(1, "Sobrenome é obrigatório"),
  role: z.enum(["admin", "technician"]),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("login");

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      firstName: "",
      lastName: "",
      role: "technician",
    },
  });

  const onLoginSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data, {
      onSuccess: () => {
        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando para o dashboard...",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Erro no login",
          description: error.message || "Credenciais inválidas",
          variant: "destructive",
        });
      },
    });
  };

  const onRegisterSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data, {
      onSuccess: () => {
        toast({
          title: "Registro realizado com sucesso!",
          description: "Você foi logado automaticamente.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Erro no registro",
          description: error.message || "Erro ao criar conta",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-100 via-teal-50 to-emerald-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-gradient-to-br from-teal-200/30 to-cyan-300/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-gradient-to-br from-emerald-200/30 to-teal-300/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-gradient-to-br from-cyan-300/20 to-teal-400/20 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-6xl flex items-center justify-center gap-16">
        {/* Left side - Branding */}
        <div className="hidden lg:flex flex-col items-center space-y-12 flex-1">
          <div className="text-center">
            <h1 className="text-7xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent mb-6 tracking-wider drop-shadow-lg">
              CARHUB
            </h1>
            <p className="text-2xl text-gray-700 mb-8 font-medium">
              Sistema de Gestão Automotiva
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-8 w-full max-w-md">
            <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-white/20">
              <Car className="h-14 w-14 text-teal-600 mx-auto mb-4 drop-shadow-md" />
              <h3 className="font-bold text-gray-800 text-lg">Veículos</h3>
              <p className="text-sm text-gray-600 mt-1">Gerencie frota</p>
            </div>
            <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-white/20">
              <Users className="h-14 w-14 text-teal-600 mx-auto mb-4 drop-shadow-md" />
              <h3 className="font-bold text-gray-800 text-lg">Clientes</h3>
              <p className="text-sm text-gray-600 mt-1">Base de dados</p>
            </div>
            <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-white/20">
              <Wrench className="h-14 w-14 text-teal-600 mx-auto mb-4 drop-shadow-md" />
              <h3 className="font-bold text-gray-800 text-lg">Serviços</h3>
              <p className="text-sm text-gray-600 mt-1">Manutenções</p>
            </div>
            <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-white/20">
              <Calendar className="h-14 w-14 text-teal-600 mx-auto mb-4 drop-shadow-md" />
              <h3 className="font-bold text-gray-800 text-lg">Agenda</h3>
              <p className="text-sm text-gray-600 mt-1">Compromissos</p>
            </div>
          </div>
        </div>

        {/* Right side - Login geometric form */}
        <div className="w-full max-w-lg">
          {/* Geometric login container inspired by the image */}
          <div className="relative">
            {/* Main hexagonal shape */}
            <div 
              className="relative bg-gradient-to-br from-teal-600 to-emerald-700 shadow-2xl transform rotate-0 hover:rotate-1 transition-all duration-700"
              style={{
                clipPath: "polygon(20% 0%, 80% 0%, 100% 35%, 80% 100%, 20% 100%, 0% 35%)",
                padding: "60px 80px"
              }}
            >
              {/* Inner container */}
              <div className="bg-gradient-to-br from-teal-700 to-emerald-800 rounded-lg p-8 shadow-inner">
                {/* Header */}
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-cyan-100 tracking-wider mb-2">
                    MEMBER LOGIN
                  </h2>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                  <TabsList className="grid w-full grid-cols-2 bg-teal-800/50 border border-teal-600/30">
                    <TabsTrigger 
                      value="login" 
                      className="text-cyan-100 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
                    >
                      Entrar
                    </TabsTrigger>
                    <TabsTrigger 
                      value="register" 
                      className="text-cyan-100 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
                    >
                      Registrar
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                          <User className="h-5 w-5 text-cyan-300" />
                        </div>
                        <Input
                          {...loginForm.register("username")}
                          placeholder="Username"
                          className="pl-12 bg-teal-800/50 border-teal-600/50 text-cyan-100 placeholder:text-cyan-300 focus:border-emerald-400 focus:ring-emerald-400/30 rounded-lg h-12"
                        />
                        {loginForm.formState.errors.username && (
                          <p className="text-sm text-red-300 mt-1">
                            {loginForm.formState.errors.username.message}
                          </p>
                        )}
                      </div>

                      <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                          <Lock className="h-5 w-5 text-cyan-300" />
                        </div>
                        <Input
                          type="password"
                          {...loginForm.register("password")}
                          placeholder="••••••••••"
                          className="pl-12 bg-teal-800/50 border-teal-600/50 text-cyan-100 placeholder:text-cyan-300 focus:border-emerald-400 focus:ring-emerald-400/30 rounded-lg h-12"
                        />
                        {loginForm.formState.errors.password && (
                          <p className="text-sm text-red-300 mt-1">
                            {loginForm.formState.errors.password.message}
                          </p>
                        )}
                      </div>

                      <Button
                        type="submit"
                        disabled={loginMutation.isPending}
                        className="w-full bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-500 hover:to-cyan-500 text-teal-900 font-bold py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-lg tracking-wider"
                      >
                        {loginMutation.isPending ? "ENTRANDO..." : "LOGIN"}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="register">
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4 max-h-96 overflow-y-auto pr-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Input
                            {...registerForm.register("firstName")}
                            placeholder="Nome"
                            className="bg-teal-800/50 border-teal-600/50 text-cyan-100 placeholder:text-cyan-300 focus:border-emerald-400 focus:ring-emerald-400/30 rounded-lg"
                          />
                          {registerForm.formState.errors.firstName && (
                            <p className="text-sm text-red-300 mt-1">
                              {registerForm.formState.errors.firstName.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Input
                            {...registerForm.register("lastName")}
                            placeholder="Sobrenome"
                            className="bg-teal-800/50 border-teal-600/50 text-cyan-100 placeholder:text-cyan-300 focus:border-emerald-400 focus:ring-emerald-400/30 rounded-lg"
                          />
                          {registerForm.formState.errors.lastName && (
                            <p className="text-sm text-red-300 mt-1">
                              {registerForm.formState.errors.lastName.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Input
                          {...registerForm.register("username")}
                          placeholder="Digite um usuário"
                          className="bg-teal-800/50 border-teal-600/50 text-cyan-100 placeholder:text-cyan-300 focus:border-emerald-400 focus:ring-emerald-400/30 rounded-lg"
                        />
                        {registerForm.formState.errors.username && (
                          <p className="text-sm text-red-300 mt-1">
                            {registerForm.formState.errors.username.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Input
                          type="email"
                          {...registerForm.register("email")}
                          placeholder="Email (opcional)"
                          className="bg-teal-800/50 border-teal-600/50 text-cyan-100 placeholder:text-cyan-300 focus:border-emerald-400 focus:ring-emerald-400/30 rounded-lg"
                        />
                        {registerForm.formState.errors.email && (
                          <p className="text-sm text-red-300 mt-1">
                            {registerForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Input
                          type="password"
                          {...registerForm.register("password")}
                          placeholder="Digite uma senha"
                          className="bg-teal-800/50 border-teal-600/50 text-cyan-100 placeholder:text-cyan-300 focus:border-emerald-400 focus:ring-emerald-400/30 rounded-lg"
                        />
                        {registerForm.formState.errors.password && (
                          <p className="text-sm text-red-300 mt-1">
                            {registerForm.formState.errors.password.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Select
                          value={registerForm.watch("role")}
                          onValueChange={(value: "admin" | "technician") =>
                            registerForm.setValue("role", value)
                          }
                        >
                          <SelectTrigger className="bg-teal-800/50 border-teal-600/50 text-cyan-100 focus:border-emerald-400 focus:ring-emerald-400/30 rounded-lg">
                            <SelectValue placeholder="Selecione uma função" />
                          </SelectTrigger>
                          <SelectContent className="bg-teal-800 border-teal-600">
                            <SelectItem value="technician" className="text-cyan-100">Técnico</SelectItem>
                            <SelectItem value="admin" className="text-cyan-100">Administrador</SelectItem>
                          </SelectContent>
                        </Select>
                        {registerForm.formState.errors.role && (
                          <p className="text-sm text-red-300 mt-1">
                            {registerForm.formState.errors.role.message}
                          </p>
                        )}
                      </div>

                      <Button
                        type="submit"
                        disabled={registerMutation.isPending}
                        className="w-full bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-500 hover:to-cyan-500 text-teal-900 font-bold py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-lg tracking-wider"
                      >
                        {registerMutation.isPending ? "REGISTRANDO..." : "REGISTRAR"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
