
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Shield, Eye, Edit, Trash2, Settings } from "lucide-react";

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    role: "user"
  });

  // Mock data - substituir por dados reais da API
  const [users] = useState([
    { id: 1, username: "admin", email: "admin@carhub.com", firstName: "Admin", lastName: "System", role: "admin", active: true },
    { id: 2, username: "joao", email: "joao@example.com", firstName: "João", lastName: "Silva", role: "user", active: true },
    { id: 3, username: "maria", email: "maria@example.com", firstName: "Maria", lastName: "Santos", role: "user", active: false },
  ]);

  const [permissions] = useState([
    { id: 1, name: "Visualizar Dashboard", key: "view_dashboard", description: "Acesso à página principal" },
    { id: 2, name: "Gerenciar Clientes", key: "manage_customers", description: "Criar, editar e visualizar clientes" },
    { id: 3, name: "Gerenciar Veículos", key: "manage_vehicles", description: "Criar, editar e visualizar veículos" },
    { id: 4, name: "Gerenciar Serviços", key: "manage_services", description: "Criar, editar e visualizar serviços" },
    { id: 5, name: "Visualizar Relatórios", key: "view_reports", description: "Acesso aos relatórios do sistema" },
    { id: 6, name: "Administração", key: "admin_panel", description: "Acesso ao painel administrativo" },
  ]);

  if (user?.role !== 'admin') {
    return (
      <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50/90 via-emerald-50/30 to-slate-100/90">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="Acesso Negado" subtitle="Você não tem permissão para acessar esta página" />
          <main className="flex-1 overflow-y-auto flex items-center justify-center">
            <Card className="w-96 shadow-xl bg-white/95 backdrop-blur-sm">
              <CardHeader className="text-center">
                <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <CardTitle className="text-2xl text-gray-800">Acesso Restrito</CardTitle>
                <CardDescription>
                  Esta área é restrita para administradores do sistema.
                </CardDescription>
              </CardHeader>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  const handleCreateUser = () => {
    // Implementar criação de usuário
    toast({
      title: "Usuário criado!",
      description: `Usuário ${newUser.username} foi criado com sucesso.`,
    });
    setNewUser({ username: "", email: "", firstName: "", lastName: "", password: "", role: "user" });
    setIsCreateUserOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50/90 via-emerald-50/30 to-slate-100/90">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Painel Administrativo"
          subtitle="Gerencie usuários e permissões do sistema"
        />

        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-transparent via-emerald-50/20 to-transparent">
          <div className="p-8">
            <Tabs defaultValue="users" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 bg-white/80 backdrop-blur-sm shadow-lg">
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Usuários
                </TabsTrigger>
                <TabsTrigger value="permissions" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Permissões
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-800">Gerenciar Usuários</h2>
                  <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Novo Usuário
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-sm">
                      <DialogHeader>
                        <DialogTitle>Criar Novo Usuário</DialogTitle>
                        <DialogDescription>
                          Preencha os dados do novo usuário do sistema.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="firstName">Nome</Label>
                            <Input
                              id="firstName"
                              value={newUser.firstName}
                              onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="lastName">Sobrenome</Label>
                            <Input
                              id="lastName"
                              value={newUser.lastName}
                              onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="username">Usuário</Label>
                          <Input
                            id="username"
                            value={newUser.username}
                            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newUser.email}
                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="password">Senha</Label>
                          <Input
                            id="password"
                            type="password"
                            value={newUser.password}
                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="role">Função</Label>
                          <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">Usuário</SelectItem>
                              <SelectItem value="admin">Administrador</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={handleCreateUser} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700">
                          Criar Usuário
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid gap-4">
                  {users.map((user) => (
                    <Card key={user.id} className="shadow-lg bg-white/90 backdrop-blur-sm hover:shadow-xl transition-all duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                              <span className="text-white font-medium">
                                {user.firstName[0]}{user.lastName[0]}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-800">{user.firstName} {user.lastName}</h3>
                              <p className="text-sm text-gray-600">@{user.username} • {user.email}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                                  {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                                </Badge>
                                <Badge variant={user.active ? 'default' : 'destructive'} className="text-xs">
                                  {user.active ? 'Ativo' : 'Inativo'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" className="hover:bg-emerald-50">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="hover:bg-blue-50">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="permissions" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-800">Gerenciar Permissões</h2>
                  <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg">
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar Grupos
                  </Button>
                </div>

                <div className="grid gap-4">
                  {permissions.map((permission) => (
                    <Card key={permission.id} className="shadow-lg bg-white/90 backdrop-blur-sm">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-800">{permission.name}</h3>
                            <p className="text-sm text-gray-600">{permission.description}</p>
                            <p className="text-xs text-gray-500 mt-1">Chave: {permission.key}</p>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" className="hover:bg-emerald-50">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
