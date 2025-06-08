import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
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
  Activity,
  Search,
  Filter,
  Eye,
  EyeOff,
  ArrowLeft
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200"
  },
  { 
    id: "vehicles", 
    label: "Gerenciar Veículos", 
    description: "Criar, editar e visualizar veículos",
    icon: Settings,
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200"
  },
  { 
    id: "services", 
    label: "Gerenciar Serviços", 
    description: "Criar, editar e visualizar serviços",
    icon: Activity,
    color: "from-orange-500 to-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200"
  },
  { 
    id: "schedule", 
    label: "Acessar Agenda", 
    description: "Visualizar e gerenciar agendamentos",
    icon: Calendar,
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200"
  },
  { 
    id: "reports", 
    label: "Acessar Relatórios", 
    description: "Visualizar relatórios e estatísticas",
    icon: Award,
    color: "from-yellow-500 to-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200"
  },
  { 
    id: "admin", 
    label: "Painel Administrativo", 
    description: "Acesso total ao sistema",
    icon: Shield,
    color: "from-red-500 to-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200"
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
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
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
    setShowPassword(false);
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
    setFormData(prev => {
      const currentPermissions = prev.permissions || [];
      let newPermissions;

      if (checked) {
        newPermissions = currentPermissions.includes(permissionId) 
          ? currentPermissions 
          : [...currentPermissions, permissionId];
      } else {
        newPermissions = currentPermissions.filter(p => p !== permissionId);
      }

      return {
        ...prev,
        permissions: newPermissions
      };
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && user.isActive) ||
      (statusFilter === "inactive" && !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getPermissionBadge = (permissionId: string) => {
    const permission = AVAILABLE_PERMISSIONS.find(p => p.id === permissionId);
    if (!permission) return null;

    const Icon = permission.icon;
    return (
      <div key={permissionId} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${permission.bgColor} ${permission.borderColor} border`}>
        <Icon className="h-3 w-3" />
        {permission.label}
      </div>
    );
  };

  const getRoleBadge = (role: string) => {
    return role === "admin" ? (
      <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-red-500 to-red-600 text-white">
        <Shield className="h-3 w-3" />
        Administrador
      </div>
    ) : (
      <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-teal-500 to-teal-600 text-white">
        <Users className="h-3 w-3" />
        Técnico
      </div>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-green-500 to-green-600 text-white">
        <CheckCircle className="h-3 w-3" />
        Ativo
      </div>
    ) : (
      <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-gray-500 to-gray-600 text-white">
        <XCircle className="h-3 w-3" />
        Inativo
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header executivo profissional otimizado */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl"></div>
          <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-white/5 to-transparent rounded-xl"></div>
          <div className="relative px-8 py-8">
            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.location.href = '/dashboard'}
                    className="text-white hover:bg-slate-700 mr-2 p-2"
                    title="Voltar ao Dashboard"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="w-12 h-12 bg-gradient-to-r from-teal-400 to-emerald-400 rounded-xl flex items-center justify-center shadow-xl">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">
                      Central Administrativa
                    </h1>
                    <p className="text-slate-300 text-base font-medium">
                      Controle total do sistema • Gestão de usuários e permissões
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-slate-400 ml-20">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-medium">{users.length} usuários</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Settings className="h-4 w-4" />
                    <span className="text-sm font-medium">Sistema ativo</span>
                  </div>
                </div>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={resetForm} 
                    size="lg"
                    className="bg-white text-slate-900 hover:bg-slate-100 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 font-semibold px-6 py-3"
                  >
                    <UserPlus className="h-5 w-5 mr-2" />
                    Adicionar Usuário
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white border-0 shadow-2xl">
                  <DialogHeader className="pb-6 border-b border-gray-100">
                    <DialogTitle className="flex items-center gap-4 text-2xl font-bold text-slate-800">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-700 flex items-center justify-center shadow-lg">
                        {editingUser ? <Edit className="h-6 w-6 text-white" /> : <UserPlus className="h-6 w-6 text-white" />}
                      </div>
                      <div>
                        {editingUser ? "Editar Usuário" : "Novo Usuário"}
                        <p className="text-sm font-normal text-slate-500 mt-1">
                          {editingUser ? "Atualize as informações do usuário" : "Crie um novo usuário para o sistema"}
                        </p>
                      </div>
                    </DialogTitle>
                  </DialogHeader>

                  <form onSubmit={handleSubmit} className="space-y-8 pt-6">
                    <Tabs defaultValue="basic" className="w-full">
                      <TabsList className="grid w-full grid-cols-3 bg-slate-50 border border-slate-200 p-1">
                        <TabsTrigger value="basic" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                          <Users className="h-4 w-4" />
                          <span className="hidden sm:inline">Informações Pessoais</span>
                          <span className="sm:hidden">Info</span>
                        </TabsTrigger>
                        <TabsTrigger value="security" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                          <Key className="h-4 w-4" />
                          <span className="hidden sm:inline">Credenciais</span>
                          <span className="sm:hidden">Login</span>
                        </TabsTrigger>
                        <TabsTrigger value="permissions" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                          <Shield className="h-4 w-4" />
                          <span className="hidden sm:inline">Permissões</span>
                          <span className="sm:hidden">Acesso</span>
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="basic" className="space-y-6 mt-6">
                        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50">
                          <CardHeader className="pb-4">
                            <CardTitle className="text-lg text-gray-800">Dados Pessoais</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">Nome *</Label>
                                <Input
                                  id="firstName"
                                  value={formData.firstName}
                                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                                  className={`mt-1 ${errors.firstName ? "border-red-500" : "border-gray-200 focus:border-teal-500"}`}
                                  placeholder="Digite o nome"
                                />
                                {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                              </div>

                              <div>
                                <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">Sobrenome *</Label>
                                <Input
                                  id="lastName"
                                  value={formData.lastName}
                                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                                  className={`mt-1 ${errors.lastName ? "border-red-500" : "border-gray-200 focus:border-teal-500"}`}
                                  placeholder="Digite o sobrenome"
                                />
                                {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                              <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                className={`mt-1 ${errors.email ? "border-red-500" : "border-gray-200 focus:border-teal-500"}`}
                                placeholder="Digite o email"
                              />
                              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="role" className="text-sm font-medium text-gray-700">Função</Label>
                                <Select value={formData.role} onValueChange={(value: "admin" | "technician") => 
                                  setFormData(prev => ({ ...prev, role: value }))
                                }>
                                  <SelectTrigger className="mt-1 border-gray-200 focus:border-teal-500">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="technician">Técnico</SelectItem>
                                    <SelectItem value="admin">Administrador</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="flex items-center space-x-3 pt-6">
                                <Switch
                                  id="isActive"
                                  checked={formData.isActive}
                                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                                />
                                <Label htmlFor="isActive" className="text-sm font-medium text-gray-700">Usuário Ativo</Label>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="security" className="space-y-6 mt-6">
                        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50">
                          <CardHeader className="pb-4">
                            <CardTitle className="text-lg text-gray-800">Credenciais de Acesso</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <Label htmlFor="username" className="text-sm font-medium text-gray-700">Nome de Usuário *</Label>
                              <Input
                                id="username"
                                value={formData.username}
                                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                                className={`mt-1 ${errors.username ? "border-red-500" : "border-gray-200 focus:border-teal-500"}`}
                                disabled={!!editingUser}
                                placeholder="Digite o nome de usuário"
                              />
                              {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
                            </div>

                            <div>
                              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                                {editingUser ? "Nova Senha (deixe em branco para não alterar)" : "Senha *"}
                              </Label>
                              <div className="relative mt-1">
                                <Input
                                  id="password"
                                  type={showPassword ? "text" : "password"}
                                  value={formData.password}
                                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                  className={`pr-10 ${errors.password ? "border-red-500" : "border-gray-200 focus:border-teal-500"}`}
                                  placeholder="Digite a senha"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-gray-500" />
                                  )}
                                </Button>
                              </div>
                              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="permissions" className="space-y-6 mt-6">
                        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50">
                          <CardHeader className="pb-4">
                            <CardTitle className="text-lg text-gray-800">Controle de Permissões</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {AVAILABLE_PERMISSIONS.map((permission) => {
                                const Icon = permission.icon;
                                const isChecked = formData.permissions.includes(permission.id);

                                return (
                                  <div 
                                    key={permission.id} 
                                    className={`relative p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer hover:shadow-lg ${
                                      isChecked 
                                        ? `${permission.bgColor} ${permission.borderColor} shadow-md` 
                                        : 'bg-white border-gray-200 hover:border-gray-300'
                                    }`}
                                  >
                                    <div className="flex items-start space-x-3">
                                      <Checkbox
                                        id={permission.id}
                                        checked={isChecked}
                                        onCheckedChange={(checked) => handlePermissionChange(permission.id, !!checked)}
                                        className="mt-1"
                                      />
                                      <div 
                                        className="flex-1 cursor-pointer"
                                        onClick={() => handlePermissionChange(permission.id, !isChecked)}
                                      >
                                        <div className="flex items-center gap-3 mb-2">
                                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${permission.color} flex items-center justify-center shadow-lg`}>
                                            <Icon className="h-5 w-5 text-white" />
                                          </div>
                                          <div>
                                            <Label htmlFor={permission.id} className="font-semibold text-gray-800 cursor-pointer">
                                              {permission.label}
                                            </Label>
                                            <p className="text-sm text-gray-600 mt-1">{permission.description}</p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>

                    <div className="flex justify-end space-x-3 pt-6 border-t">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createUserMutation.isPending || updateUserMutation.isPending}
                        className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
                      >
                        {editingUser ? "Atualizar" : "Criar"} Usuário
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Filtros e pesquisa */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Pesquisar usuários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-200 focus:border-teal-500"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-48 border-gray-200 focus:border-teal-500">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as funções</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="technician">Técnico</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48 border-gray-200 focus:border-teal-500">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de usuários modernizada */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 flex items-center justify-center">
                <Users className="h-4 w-4 text-white" />
              </div>
              Usuários do Sistema ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <Card key={user.id} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-md bg-gradient-to-r from-white to-slate-50">
                    <CardContent className="p-8">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className="relative">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-700 flex items-center justify-center text-white font-bold text-xl shadow-2xl group-hover:scale-105 transition-transform duration-300">
                              {user.firstName?.[0]}{user.lastName?.[0]}
                            </div>
                            {user.isActive && (
                              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-lg">
                                <CheckCircle className="h-3 w-3 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-4">
                              <h3 className="font-bold text-xl text-slate-800">
                                {user.firstName} {user.lastName}
                              </h3>
                              {getRoleBadge(user.role || "technician")}
                            </div>
                            <div className="flex items-center gap-6 text-slate-600">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-slate-400" />
                                <span className="font-medium">@{user.username}</span>
                              </div>
                              <div className="flex items-center gap-2">
```text
                                <Mail className="h-4 w-4 text-slate-400" />
                                <span>{user.email || "Email não informado"}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                <span className="text-sm">
                                  Criado em {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {user.permissions?.slice(0, 5).map(permission => 
                                getPermissionBadge(permission)
                              )}
                              {user.permissions && user.permissions.length > 5 && (
                                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 border border-slate-300 text-slate-600">
                                  +{user.permissions.length - 5} permissões
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-3">
                          <Button
                            size="lg"
                            variant="outline"
                            onClick={() => handleEdit(user)}
                            className="h-12 w-12 p-0 hover:bg-blue-50 hover:border-blue-300 border-slate-200"
                            title="Editar usuário"
                          >
                            <Edit className="h-5 w-5 text-blue-600" />
                          </Button>
                          <Button
                            size="lg"
                            variant="outline"
                            onClick={() => handleDelete(user.id)}
                            disabled={user.id === 1}
                            className="h-12 w-12 p-0 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 border-slate-200"
                            title={user.id === 1 ? "Usuário admin principal não pode ser excluído" : "Excluir usuário"}
                          >
                            <Trash2 className="h-5 w-5 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}