import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Edit,
  Trash2,
  Search,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface ServiceType {
  id: number;
  name: string;
  description: string | null;
  defaultPrice: string | null;
  estimatedDuration: number | null;
  isActive: boolean | null;
  isRecurring: boolean | null;
  intervalMonths: number | null;
  loyaltyPoints: number | null;
  createdAt: string;
  updatedAt: string;
}

const serviceTypeSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  defaultPrice: z.string().optional(),
});

type ServiceTypeFormData = z.infer<typeof serviceTypeSchema>;

export default function ServiceTypesManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServiceType, setEditingServiceType] = useState<ServiceType | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<ServiceTypeFormData>({
    name: "",
    description: "",
    defaultPrice: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: serviceTypes = [], isLoading } = useQuery({
    queryKey: ["/api/admin/service-types"],
    queryFn: async () => {
      const response = await fetch("/api/admin/service-types", {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch service types");
      return response.json() as Promise<ServiceType[]>;
    }
  });

  const createServiceTypeMutation = useMutation({
    mutationFn: async (data: ServiceTypeFormData) => {
      const response = await fetch("/api/admin/service-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to create service type");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-types"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Tipo de serviço criado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar tipo de serviço",
        variant: "destructive",
      });
    }
  });

  const updateServiceTypeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ServiceTypeFormData> }) => {
      const response = await fetch(`/api/admin/service-types/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to update service type");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-types"] });
      setIsDialogOpen(false);
      resetForm();
      setEditingServiceType(null);
      toast({
        title: "Sucesso",
        description: "Tipo de serviço atualizado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar tipo de serviço",
        variant: "destructive",
      });
    }
  });

  const deleteServiceTypeMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/service-types/${id}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to delete service type");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-types"] });
      toast({
        title: "Sucesso",
        description: "Tipo de serviço excluído com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir tipo de serviço",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      defaultPrice: "",
    });
    setErrors({});
    setEditingServiceType(null);
  };

  const handleEdit = (serviceType: ServiceType) => {
    setEditingServiceType(serviceType);
    setFormData({
      name: serviceType.name,
      description: serviceType.description || "",
      defaultPrice: serviceType.defaultPrice || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este tipo de serviço?")) {
      deleteServiceTypeMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = serviceTypeSchema.parse(formData);
      setErrors({});

      if (editingServiceType) {
        updateServiceTypeMutation.mutate({ id: editingServiceType.id, data: validatedData });
      } else {
        createServiceTypeMutation.mutate(validatedData);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
    }
  };

  const filteredServiceTypes = serviceTypes.filter(serviceType =>
    serviceType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (serviceType.description && serviceType.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return <div className="p-6">Carregando tipos de serviço...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tipos de Serviços</h2>
          <p className="text-gray-600">Gerencie os tipos de serviços disponíveis</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700">
              <Plus className="h-4 w-4 mr-2" />
              Novo Tipo
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-lg max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingServiceType ? "Editar Tipo de Serviço" : "Novo Tipo de Serviço"}
              </DialogTitle>
              <DialogDescription>
                {editingServiceType ? "Edite as informações do tipo de serviço" : "Crie um novo tipo de serviço"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 px-1">
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="defaultPrice">Preço Padrão (R$)</Label>
                <Input
                  id="defaultPrice"
                  type="text"
                  value={formData.defaultPrice}
                  onChange={(e) => {
                    let value = e.target.value;
                    
                    // Remove tudo que não é número
                    value = value.replace(/[^\d]/g, '');
                    
                    // Se vazio, deixa vazio
                    if (value === '') {
                      setFormData(prev => ({ ...prev, defaultPrice: '' }));
                      return;
                    }
                    
                    // Converte para número e divide por 100 para ter centavos
                    const numValue = parseInt(value) / 100;
                    
                    // Formata com 2 casas decimais e vírgula
                    const formatted = numValue.toFixed(2).replace('.', ',');
                    
                    setFormData(prev => ({ ...prev, defaultPrice: formatted }));
                  }}
                  placeholder="0,00"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={createServiceTypeMutation.isPending || updateServiceTypeMutation.isPending}
                  className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
                >
                  {editingServiceType ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Buscar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Service Types Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tipos de Serviços ({filteredServiceTypes.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Nome</TableHead>
                  <TableHead className="min-w-[200px] hidden sm:table-cell">Descrição</TableHead>
                  <TableHead className="min-w-[120px]">Preço Padrão</TableHead>
                  <TableHead className="min-w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServiceTypes.map((serviceType) => (
                  <TableRow key={serviceType.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{serviceType.name}</div>
                        <div className="text-sm text-gray-500 sm:hidden">
                          {serviceType.description ? serviceType.description.substring(0, 30) + '...' : "-"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell max-w-xs truncate">
                      {serviceType.description || "-"}
                    </TableCell>
                    <TableCell>
                      {serviceType.defaultPrice ? `R$ ${parseFloat(serviceType.defaultPrice).toFixed(2).replace('.', ',')}` : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(serviceType)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(serviceType.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}