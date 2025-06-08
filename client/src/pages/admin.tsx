
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { 
  Users, 
  UserPlus, 
  Edit, 
  Trash2, 
  Shield, 
  Mail, 
  Calendar,
  CheckCircle,
  XCircle,
  Settings,
  Key,
  Award,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: "admin" | "technician" | null;
  isActive: boolean | null;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

const AVAILABLE_PERMISSIONS = [
  { 
    id: "customers", 
    label: "Gerenciar Clientes", 
    description: "Criar, editar e visualizar clientes",
    icon: Users,
    color: "bg-blue-500"
  },
  { 
    id: "vehicles", 
    label: "Gerenciar Veículos", 
    description: "Criar, editar e visualizar veículos",
    icon: Settings,
    color: "bg-green-500"
  },
  { 
    id: "services", 
    label: "Gerenciar Serviços", 
    description: "Criar, editar e visualizar serviços",
    icon: Activity,
    color: "bg-orange-500"
  },
  { 
    id: "schedule", 
    label: "Acessar Agenda", 
    description: "Visualizar e gerenciar agendamentos",
    icon: Calendar,
    color: "bg-purple-500"
  },
  { 
    id: "reports", 
    label: "Acessar Relatórios", 
    description: "Visualizar relatórios e estatísticas",
    icon: Award,
    color: "bg-yellow-500"
  },
  { 
    id: "admin", 
    label: "Painel Administrativo", 
    description: "Acesso total ao sistema",
    icon: Shield,
    color: "bg-red-500"
  },
];

const userSchema = z.object({
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  firstName: z.string().min(1, "Nome é obrigatório"),
  lastName: z.string().min(1, "Sobrenome é obrigatório"),
  role: z.enum(["admin", "technician"]),
  isActive: z.boolean(),
  permissions: z.array(z.string())
});

type UserFormData = z.infer<typeof userSchema>;

export default function AdminPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    username: "",
    password: "",
    email: "",
    firstName: "",
    lastName: "",
    role: "technician",
    isActive: true,
    permissions: []
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users", {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json() as Promise<User[]>;
    }
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: UserFormData) => {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(userData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Usuário criado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar usuário", description: error.message, variant: "destructive" });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: number; userData: Partial<UserFormData> }) => {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(userData)
      });
      if (!response.ok) throw new Error("Failed to update user");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Usuário atualizado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar usuário", description: error.message, variant: "destructive" });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to delete user");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Usuário excluído com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir usuário", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      email: "",
      firstName: "",
      lastName: "",
      role: "technician",
      isActive: true,
      permissions: []
    });
    setEditingUser(null);
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validatedData = userSchema.parse(formData);
      
      if (editingUser) {
        const { password, ...updateData } = validatedData;
        updateUserMutation.mutate({ 
          id: editingUser.id, 
          userData: password ? validatedData : updateData 
        });
      } else {
        createUserMutation.mutate(validatedData);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: "",
      email: user.email || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      role: user.role || "technician",
      isActive: user.isActive ?? true,
      permissions: user.permissions || []
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      deleteUserMutation.mutate(id);
    }
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: checked 
        ? [...prev.permissions, permissionId]
        : prev.permissions.filter(p => p !== permissionId)
    }));
  };

  const getPermissionBadge = (permissionId: string) => {
    const permission = AVAILABLE_PERMISSIONS.find(p => p.id === permissionId);
    if (!permission) return null;
    
    const Icon = permission.icon;
    return (
      <Badge key={permissionId} variant="secondary" className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {permission.label}
      </Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    return role === "admin" ? (
      <Badge variant="default" className="bg-red-500">
        <Shield className="h-3 w-3 mr-1" />
        Administrador
      </Badge>
    ) : (
      <Badge variant="outline">
        <Users className="h-3 w-3 mr-1" />
        Técnico
      </Badge>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="default" className="bg-green-500">
        <CheckCircle className="h-3 w-3 mr-1" />
        Ativo
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        Inativo
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Painel Administrativo</h1>
          <p className="text-gray-600 mt-1">Gerencie usuários e permissões do sistema</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingUser ? <Edit className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                {editingUser ? "Editar Usuário" : "Novo Usuário"}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Informações Básicas */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Informações Básicas
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Nome *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      className={errors.firstName ? "border-red-500" : ""}
                    />
                    {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                  </div>
                  
                  <div>
                    <Label htmlFor="lastName">Sobrenome *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      className={errors.lastName ? "border-red-500" : ""}
                    />
                    {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>
              </div>

              <Separator />

              {/* Credenciais */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Credenciais
                </h3>
                
                <div>
                  <Label htmlFor="username">Nome de Usuário *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    className={errors.username ? "border-red-500" : ""}
                    disabled={!!editingUser}
                  />
                  {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
                </div>
                
                <div>
                  <Label htmlFor="password">
                    {editingUser ? "Nova Senha (deixe em branco para não alterar)" : "Senha *"}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className={errors.password ? "border-red-500" : ""}
                  />
                  {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                </div>
              </div>

              <Separator />

              {/* Configurações */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configurações
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="role">Função</Label>
                    <Select value={formData.role} onValueChange={(value: "admin" | "technician") => 
                      setFormData(prev => ({ ...prev, role: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technician">Técnico</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label htmlFor="isActive">Usuário Ativo</Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Permissões */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Permissões
                </h3>
                
                <div className="grid grid-cols-1 gap-3">
                  {AVAILABLE_PERMISSIONS.map((permission) => {
                    const Icon = permission.icon;
                    return (
                      <div key={permission.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                        <Checkbox
                          id={permission.id}
                          checked={formData.permissions.includes(permission.id)}
                          onCheckedChange={(checked) => handlePermissionChange(permission.id, !!checked)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full ${permission.color} flex items-center justify-center`}>
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <Label htmlFor={permission.id} className="font-medium cursor-pointer">
                                {permission.label}
                              </Label>
                              <p className="text-sm text-gray-500">{permission.description}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                >
                  {editingUser ? "Atualizar" : "Criar"} Usuário
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuários do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold">Usuário</th>
                    <th className="text-left p-4 font-semibold">Contato</th>
                    <th className="text-left p-4 font-semibold">Função</th>
                    <th className="text-left p-4 font-semibold">Status</th>
                    <th className="text-left p-4 font-semibold">Permissões</th>
                    <th className="text-left p-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </div>
                          <div>
                            <p className="font-medium">{user.firstName} {user.lastName}</p>
                            <p className="text-sm text-gray-500">@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Mail className="h-4 w-4" />
                          {user.email || "Não informado"}
                        </div>
                      </td>
                      <td className="p-4">
                        {getRoleBadge(user.role || "technician")}
                      </td>
                      <td className="p-4">
                        {getStatusBadge(user.isActive ?? true)}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {user.permissions?.slice(0, 3).map(permission => 
                            getPermissionBadge(permission)
                          )}
                          {user.permissions && user.permissions.length > 3 && (
                            <Badge variant="secondary">
                              +{user.permissions.length - 3}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
