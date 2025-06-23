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

interface ServiceExtra {
  id: number;
  descricao: string;
  valorPadrao: string | null;
  isActive: boolean | null;
  createdAt: string;
  updatedAt: string;
}

const serviceExtraSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória"),
  valorPadrao: z.string().optional(),
});

type ServiceExtraFormData = z.infer<typeof serviceExtraSchema>;

export default function ServiceExtrasManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServiceExtra, setEditingServiceExtra] = useState<ServiceExtra | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<ServiceExtraFormData>({
    descricao: "",
    valorPadrao: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: serviceExtras = [], isLoading } = useQuery({
    queryKey: ["/api/admin/service-extras"],
    queryFn: async () => {
      const response = await fetch("/api/admin/service-extras", {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch service extras");
      return response.json() as Promise<ServiceExtra[]>;
    }
  });

  const createServiceExtraMutation = useMutation({
    mutationFn: async (data: ServiceExtraFormData) => {
      const response = await fetch("/api/admin/service-extras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to create service extra");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-extras"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Adicional criado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar adicional",
        variant: "destructive",
      });
    }
  });

  const updateServiceExtraMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ServiceExtraFormData> }) => {
      const response = await fetch(`/api/admin/service-extras/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to update service extra");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-extras"] });
      setIsDialogOpen(false);
      resetForm();
      setEditingServiceExtra(null);
      toast({
        title: "Sucesso",
        description: "Adicional atualizado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar adicional",
        variant: "destructive",
      });
    }
  });

  const deleteServiceExtraMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/service-extras/${id}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to delete service extra");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-extras"] });
      toast({
        title: "Sucesso",
        description: "Adicional excluído com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir adicional",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      descricao: "",
      valorPadrao: "",
    });
    setErrors({});
    setEditingServiceExtra(null);
  };

  const handleEdit = (serviceExtra: ServiceExtra) => {
    setEditingServiceExtra(serviceExtra);
    setFormData({
      descricao: serviceExtra.descricao,
      valorPadrao: serviceExtra.valorPadrao || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este adicional?")) {
      deleteServiceExtraMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = serviceExtraSchema.parse(formData);
      setErrors({});

      if (editingServiceExtra) {
        updateServiceExtraMutation.mutate({ id: editingServiceExtra.id, data: validatedData });
      } else {
        createServiceExtraMutation.mutate(validatedData);
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

  const filteredServiceExtras = serviceExtras.filter(serviceExtra =>
    serviceExtra.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className="p-6">Carregando adicionais...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Adicionais de Serviços</h2>
          <p className="text-gray-600">Gerencie os adicionais disponíveis para os serviços</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700">
              <Plus className="h-4 w-4 mr-2" />
              Novo Adicional
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-lg max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingServiceExtra ? "Editar Adicional" : "Novo Adicional"}
              </DialogTitle>
              <DialogDescription>
                {editingServiceExtra ? "Edite as informações do adicional" : "Crie um novo adicional de serviço"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 px-1">
              <div>
                <Label htmlFor="descricao">Descrição *</Label>
                <Input
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  className={errors.descricao ? "border-red-500" : ""}
                  placeholder="Ex: Lavagem adicional, Enceramento..."
                />
                {errors.descricao && <p className="text-red-500 text-xs mt-1">{errors.descricao}</p>}
              </div>

              <div>
                <Label htmlFor="valorPadrao">Valor Padrão (R$)</Label>
                <Input
                  id="valorPadrao"
                  type="text"
                  value={formData.valorPadrao}
                  onChange={(e) => {
                    let value = e.target.value;
                    
                    // Remove tudo que não é número
                    value = value.replace(/[^\d]/g, '');
                    
                    // Se vazio, deixa vazio
                    if (value === '') {
                      setFormData(prev => ({ ...prev, valorPadrao: '' }));
                      return;
                    }
                    
                    // Converte para número e divide por 100 para ter centavos
                    const numValue = parseInt(value) / 100;
                    
                    // Formata com 2 casas decimais e vírgula
                    const formatted = numValue.toFixed(2).replace('.', ',');
                    
                    setFormData(prev => ({ ...prev, valorPadrao: formatted }));
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
                  disabled={createServiceExtraMutation.isPending || updateServiceExtraMutation.isPending}
                  className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
                >
                  {editingServiceExtra ? "Atualizar" : "Criar"}
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
              placeholder="Buscar por descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Service Extras Table */}
      <Card>
        <CardHeader>
          <CardTitle>Adicionais ({filteredServiceExtras.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Descrição</TableHead>
                  <TableHead className="min-w-[120px]">Valor Padrão</TableHead>
                  <TableHead className="min-w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServiceExtras.map((serviceExtra) => (
                  <TableRow key={serviceExtra.id}>
                    <TableCell className="font-medium">{serviceExtra.descricao}</TableCell>
                    <TableCell>
                      {serviceExtra.valorPadrao ? `R$ ${parseFloat(serviceExtra.valorPadrao).toFixed(2).replace('.', ',')}` : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(serviceExtra)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(serviceExtra.id)}
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