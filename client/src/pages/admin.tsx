import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { User, Edit, Trash2, Plus, Shield, Settings } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User as UserType } from "@shared/schema";

const AVAILABLE_PERMISSIONS = [
  { id: "customers", label: "Gerenciar Clientes", description: "Criar, editar e visualizar clientes" },
  { id: "vehicles", label: "Gerenciar Veículos", description: "Criar, editar e visualizar veículos" },
  { id: "services", label: "Gerenciar Serviços", description: "Criar, editar e visualizar serviços" },
  { id: "schedule", label: "Acessar Agenda", description: "Visualizar e gerenciar agendamentos" },
  { id: "reports", label: "Acessar Relatórios", description: "Visualizar relatórios e estatísticas" },
  { id: "admin", label: "Painel Administrativo", description: "Acesso total ao sistema" },
];

const userSchema = z.object({
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  firstName: z.string().min(1, "Nome é obrigatório"),
  lastName: z.string().min(1, "Sobrenome é obrigatório"),
  role: z.enum(["admin", "technician"]),
  isActive: z.boolean(),
  permissions: z.array(z.string()),
});

type UserFormData = z.infer<typeof userSchema>;

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);

  // Check if user has admin permissions
  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
              <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      firstName: "",
      lastName: "",
      role: "technician",
      isActive: true,
      permissions: [],
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (userData: UserFormData) => apiRequest("/api/admin/users", "POST", userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Usuário criado com sucesso!",
        description: "O novo usuário foi adicionado ao sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar usuário",
        description: error.message || "Erro inesperado",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, userData }: { id: number; userData: Partial<UserFormData> }) =>
      apiRequest(`/api/admin/users/${id}`, "PATCH", userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditingUser(null);
      form.reset();
      toast({
        title: "Usuário atualizado com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message || "Erro inesperado",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/users/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Usuário excluído com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir usuário",
        description: error.message || "Erro inesperado",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UserFormData) => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, userData: data });
    } else {
      createUserMutation.mutate(data);
    }
  };

  const handleEdit = (user: UserType) => {
    setEditingUser(user);
    form.reset({
      username: user.username,
      email: user.email || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      role: user.role || "technician",
      isActive: user.isActive ?? true,
      permissions: user.permissions || [],
      password: "", // Don't show existing password
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      deleteUserMutation.mutate(id);
    }
  };

  const togglePermission = (permission: string) => {
    const currentPermissions = form.watch("permissions");
    const newPermissions = currentPermissions.includes(permission)
      ? currentPermissions.filter(p => p !== permission)
      : [...currentPermissions, permission];
    form.setValue("permissions", newPermissions);
  };

  if (isLoading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Administração</h1>
          <p className="text-gray-600">Gerencie usuários e permissões do sistema</p>
        </div>
        <Dialog open={isCreateDialogOpen || !!editingUser} onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingUser(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? "Editar Usuário" : "Criar Novo Usuário"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Nome</Label>
                  <Input
                    id="firstName"
                    {...form.register("firstName")}
                    placeholder="Nome"
                  />
                  {form.formState.errors.firstName && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.firstName.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">Sobrenome</Label>
                  <Input
                    id="lastName"
                    {...form.register("lastName")}
                    placeholder="Sobrenome"
                  />
                  {form.formState.errors.lastName && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="username">Nome de Usuário</Label>
                <Input
                  id="username"
                  {...form.register("username")}
                  placeholder="Nome de usuário"
                />
                {form.formState.errors.username && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.username.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register("email")}
                  placeholder="email@exemplo.com"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="password">
                  {editingUser ? "Nova Senha (opcional)" : "Senha"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  {...form.register("password")}
                  placeholder={editingUser ? "Deixe em branco para não alterar" : "Senha"}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role">Função</Label>
                  <Select
                    value={form.watch("role")}
                    onValueChange={(value: "admin" | "technician") =>
                      form.setValue("role", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma função" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technician">Técnico</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox
                    id="isActive"
                    checked={form.watch("isActive")}
                    onCheckedChange={(checked) => form.setValue("isActive", !!checked)}
                  />
                  <Label htmlFor="isActive">Usuário ativo</Label>
                </div>
              </div>

              <div>
                <Label>Permissões</Label>
                <div className="grid grid-cols-1 gap-3 mt-2">
                  {AVAILABLE_PERMISSIONS.map((permission) => (
                    <div key={permission.id} className="flex items-start space-x-2">
                      <Checkbox
                        id={permission.id}
                        checked={form.watch("permissions").includes(permission.id)}
                        onCheckedChange={() => togglePermission(permission.id)}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label
                          htmlFor={permission.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {permission.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {permission.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingUser(null);
                    form.reset();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                >
                  {editingUser ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Usuários do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Nome</th>
                  <th className="text-left p-2">Usuário</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Função</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Permissões</th>
                  <th className="text-left p-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(users as UserType[])?.map((user: UserType) => (
                  <tr key={user.id} className="border-b">
                    <td className="p-2">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="p-2">{user.username}</td>
                    <td className="p-2">{user.email || "-"}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.role === "admin" 
                          ? "bg-purple-100 text-purple-800" 
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {user.role === "admin" ? "Administrador" : "Técnico"}
                      </span>
                    </td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.isActive 
                          ? "bg-green-100 text-green-800" 
                          : "bg-red-100 text-red-800"
                      }`}>
                        {user.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {user.permissions?.slice(0, 3).map((permission) => (
                          <span
                            key={permission}
                            className="px-1 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                          >
                            {AVAILABLE_PERMISSIONS.find(p => p.id === permission)?.label || permission}
                          </span>
                        ))}
                        {user.permissions && user.permissions.length > 3 && (
                          <span className="px-1 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                            +{user.permissions.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(user.id)}
                          disabled={user.id === 1} // Protect the first admin
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}