
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
import { Car, Users, Wrench, Calendar } from "lucide-react";

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
        // O AuthGuard irá lidar com o redirecionamento
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
        // O AuthGuard irá lidar com o redirecionamento
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50 p-4">
      <div className="w-full max-w-6xl flex items-center justify-center gap-12">
        {/* Left side - Branding */}
        <div className="hidden lg:flex flex-col items-center space-y-8 flex-1">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-teal-700 mb-4 tracking-wider">
              CARHUB
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Sistema de Gestão Automotiva
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-6 w-full max-w-md">
            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <Car className="h-12 w-12 text-teal-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-800">Veículos</h3>
              <p className="text-sm text-gray-600">Gerencie frota</p>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <Users className="h-12 w-12 text-teal-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-800">Clientes</h3>
              <p className="text-sm text-gray-600">Base de dados</p>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <Wrench className="h-12 w-12 text-teal-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-800">Serviços</h3>
              <p className="text-sm text-gray-600">Manutenções</p>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <Calendar className="h-12 w-12 text-teal-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-800">Agenda</h3>
              <p className="text-sm text-gray-600">Compromissos</p>
            </div>
          </div>
        </div>

        {/* Right side - Auth forms */}
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold text-gray-800">
                Bem-vindo ao CARHUB
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="register">Registrar</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <div>
                      <Label htmlFor="username">Usuário</Label>
                      <Input
                        id="username"
                        {...loginForm.register("username")}
                        className="mt-1"
                        placeholder="Digite seu usuário"
                      />
                      {loginForm.formState.errors.username && (
                        <p className="text-sm text-red-600 mt-1">
                          {loginForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="password">Senha</Label>
                      <Input
                        id="password"
                        type="password"
                        {...loginForm.register("password")}
                        className="mt-1"
                        placeholder="Digite sua senha"
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-red-600 mt-1">
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-teal-600 hover:bg-teal-700"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Entrando..." : "Entrar"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">Nome</Label>
                        <Input
                          id="firstName"
                          {...registerForm.register("firstName")}
                          className="mt-1"
                          placeholder="Nome"
                        />
                        {registerForm.formState.errors.firstName && (
                          <p className="text-sm text-red-600 mt-1">
                            {registerForm.formState.errors.firstName.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="lastName">Sobrenome</Label>
                        <Input
                          id="lastName"
                          {...registerForm.register("lastName")}
                          className="mt-1"
                          placeholder="Sobrenome"
                        />
                        {registerForm.formState.errors.lastName && (
                          <p className="text-sm text-red-600 mt-1">
                            {registerForm.formState.errors.lastName.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="regUsername">Usuário</Label>
                      <Input
                        id="regUsername"
                        {...registerForm.register("username")}
                        className="mt-1"
                        placeholder="Digite um usuário"
                      />
                      {registerForm.formState.errors.username && (
                        <p className="text-sm text-red-600 mt-1">
                          {registerForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="email">Email (opcional)</Label>
                      <Input
                        id="email"
                        type="email"
                        {...registerForm.register("email")}
                        className="mt-1"
                        placeholder="Digite seu email"
                      />
                      {registerForm.formState.errors.email && (
                        <p className="text-sm text-red-600 mt-1">
                          {registerForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="regPassword">Senha</Label>
                      <Input
                        id="regPassword"
                        type="password"
                        {...registerForm.register("password")}
                        className="mt-1"
                        placeholder="Digite uma senha"
                      />
                      {registerForm.formState.errors.password && (
                        <p className="text-sm text-red-600 mt-1">
                          {registerForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="role">Função</Label>
                      <Select
                        value={registerForm.watch("role")}
                        onValueChange={(value: "admin" | "technician") =>
                          registerForm.setValue("role", value)
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione uma função" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technician">Técnico</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                      {registerForm.formState.errors.role && (
                        <p className="text-sm text-red-600 mt-1">
                          {registerForm.formState.errors.role.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-teal-600 hover:bg-teal-700"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Registrando..." : "Registrar"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
