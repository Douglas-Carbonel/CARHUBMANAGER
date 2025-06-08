import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Shield, Eye, Edit, Trash2, Settings, Lock } from "lucide-react";

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface Permission {
  id: number;
  key: string;
  name: string;
  description: string;
}

interface UserPermission {
  id: number;
  userId: number;
  permissionId: number;
  permission: Permission;
  permission: Permission;
}

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserPermissions, setSelectedUserPermissions] = useState<number[]>([]);

  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    role: "user"
  });

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/users");
      return response as User[];
    },
    enabled: user?.role === 'admin',
  });

  // Fetch permissions
  const { data: permissions = [] } = useQuery({
    queryKey: ["/api/admin/permissions"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/permissions");
      return response as Permission[];
    },
    enabled: user?.role === 'admin',
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      await apiRequest("POST", "/api/admin/users", userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Sucesso!",
        description: "Usuário criado com sucesso.",
      });
      setNewUser({ username: "", email: "", firstName: "", lastName: "", password: "", role: "user" });
      setIsCreateUserOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao criar usuário",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: number; userData: Partial<User> }) => {
      await apiRequest("PUT", `/api/admin/users/${id}`, userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Sucesso!",
        description: "Usuário atualizado com sucesso.",
      });
      setIsEditUserOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar usuário",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Sucesso!",
        description: "Usuário excluído com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao excluir usuário",
        variant: "destructive",
      });
    },
  });

  // Update permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ userId, permissionIds }: { userId: number; permissionIds: number[] }) => {
      await apiRequest("PUT", `/api/admin/users/${userId}/permissions`, { permissionIds });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Permissões atualizadas com sucesso.",
      });
      setIsPermissionModalOpen(false);
      setSelectedUser(null);
      setSelectedUserPermissions([]);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar permissões",
        variant: "destructive",
      });
    },
  });

  // Fetch user permissions when permission modal opens
  const { data: userPermissions = [] } = useQuery({
    queryKey: ["/api/admin/users", selectedUser?.id, "permissions"],
    queryFn: async () => {
      if (!selectedUser) return [];
      const response = await apiRequest("GET", `/api/admin/users/${selectedUser.id}/permissions`);
      return response as UserPermission[];
    },
    enabled: !!selectedUser && isPermissionModalOpen,
    onSuccess: (data) => {
      setSelectedUserPermissions(data.map(up => up.permissionId));
    },
  });

  if (user?.role !== 'admin') {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="Acesso Negado" subtitle="Você não tem permissão para acessar esta página" />
          <main className="flex-1 overflow-y-auto flex items-center justify-center">
            <Card className="w-96 shadow-xl bg-white">
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
    createUserMutation.mutate(newUser);
  };

  const handleUpdateUser = () => {
    if (!selectedUser) return;
    updateUserMutation.mutate({
      id: selectedUser.id,
      userData: selectedUser,
    });
  };

  const handleDeleteUser = (userId: number) => {
    if (window.confirm("Tem certeza que deseja excluir este usuário?")) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditUserOpen(true);
  };

  const handleOpenPermissions = (user: User) => {
    setSelectedUser(user);
    setIsPermissionModalOpen(true);
  };

  const handleSavePermissions = () => {
    if (!selectedUser) return;
    updatePermissionsMutation.mutate({
      userId: selectedUser.id,
      permissionIds: selectedUserPermissions,
    });
  };

  const togglePermission = (permissionId: number) => {
    setSelectedUserPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Painel Administrativo"
          subtitle="Gerencie usuários e permissões do sistema"
        />

        <main className="flex-1 overflow-y-auto bg-white">
          <div className="p-8">
            <Tabs defaultValue="users" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 bg-white shadow-sm">
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
                      <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Novo Usuário
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-white">
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
                        <Button 
                          onClick={handleCreateUser} 
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          disabled={createUserMutation.isPending}
                        >
                          {createUserMutation.isPending ? "Criando..." : "Criar Usuário"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {usersLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {users.map((user) => (
                      <Card key={user.id} className="shadow-sm bg-white hover:shadow-md transition-all duration-200">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                                <span className="text-white font-medium">
                                  {user.firstName?.[0] || ''}{user.lastName?.[0] || ''}
                                </span>
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-800">{user.firstName} {user.lastName}</h3>
                                <p className="text-sm text-gray-600">@{user.username} • {user.email}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                                    {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                                  </Badge>
                                  <Badge variant={user.isActive ? 'default' : 'destructive'} className="text-xs">
                                    {user.isActive ? 'Ativo' : 'Inativo'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="hover:bg-blue-50"
                                onClick={() => handleOpenPermissions(user)}
                              >
                                <Lock className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="hover:bg-blue-50"
                                onClick={() => handleEditUser(user)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="hover:bg-red-50"
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="permissions" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-800">Permissões do Sistema</h2>
                </div>

                <div className="grid gap-4">
                  {permissions.map((permission) => (
                    <Card key={permission.id} className="shadow-sm bg-white">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-800">{permission.name}</h3>
                            <p className="text-sm text-gray-600">{permission.description}</p>
                            <p className="text-xs text-gray-500 mt-1">Chave: {permission.key}</p>
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

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Altere os dados do usuário.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editFirstName">Nome</Label>
                  <Input
                    id="editFirstName"
                    value={selectedUser.firstName}
                    onChange={(e) => setSelectedUser({ ...selectedUser, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="editLastName">Sobrenome</Label>
                  <Input
                    id="editLastName"
                    value={selectedUser.lastName}
                    onChange={(e) => setSelectedUser({ ...selectedUser, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="editUsername">Usuário</Label>
                <Input
                  id="editUsername"
                  value={selectedUser.username}
                  onChange={(e) => setSelectedUser({ ...selectedUser, username: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={selectedUser.email}
                  onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="editRole">Função</Label>
                <Select value={selectedUser.role} onValueChange={(value) => setSelectedUser({ ...selectedUser, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleUpdateUser} 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={updateUserMutation.isPending}
              >
                {updateUserMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={isPermissionModalOpen} onOpenChange={setIsPermissionModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle>Gerenciar Permissões</DialogTitle>
            <DialogDescription>
              Selecione as permissões para {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {permissions.map((permission) => (
              <div key={permission.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id={`permission-${permission.id}`}
                  checked={selectedUserPermissions.includes(permission.id)}
                  onCheckedChange={() => togglePermission(permission.id)}
                />
                <div className="flex-1">
                  <Label 
                    htmlFor={`permission-${permission.id}`}
                    className="font-medium text-gray-800 cursor-pointer"
                  >
                    {permission.name}
                  </Label>
                  <p className="text-sm text-gray-600">{permission.description}</p>
                </div>
              </div>
            ))}
          </div>
          <Button 
            onClick={handleSavePermissions} 
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={updatePermissionsMutation.isPending}
          >
            {updatePermissionsMutation.isPending ? "Salvando..." : "Salvar Permissões"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}