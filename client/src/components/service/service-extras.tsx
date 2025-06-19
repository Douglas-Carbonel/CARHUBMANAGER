
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import type { ServiceExtra, ServiceExtraItem } from "@shared/schema";

interface ServiceExtraRow {
  id?: number;
  serviceExtraId: number;
  valor: string;
  observacao: string;
  serviceExtra?: ServiceExtra;
}

interface ServiceExtrasProps {
  serviceId?: number;
  onChange?: (extras: ServiceExtraRow[]) => void;
  initialExtras?: (ServiceExtraItem & { serviceExtra: ServiceExtra })[];
}

export default function ServiceExtras({ serviceId, onChange, initialExtras = [] }: ServiceExtrasProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [extras, setExtras] = useState<ServiceExtraRow[]>([]);

  // Load available service extras
  const { data: availableExtras = [] } = useQuery<ServiceExtra[]>({
    queryKey: ["/api/service-extras"],
    queryFn: async () => {
      const res = await fetch("/api/service-extras", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return await res.json();
    },
  });

  // Load existing extras for this service
  const { data: existingExtras = [] } = useQuery<(ServiceExtraItem & { serviceExtra: ServiceExtra })[]>({
    queryKey: [`/api/services/${serviceId}/extras`],
    queryFn: async () => {
      if (!serviceId) return [];
      const res = await fetch(`/api/services/${serviceId}/extras`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return await res.json();
    },
    enabled: !!serviceId,
  });

  // Initialize extras from existing data or initial data
  useEffect(() => {
    if (initialExtras.length > 0) {
      const mappedExtras = initialExtras.map(item => ({
        id: item.id,
        serviceExtraId: item.serviceExtraId,
        valor: item.valor || "0.00",
        observacao: item.observacao || "",
        serviceExtra: item.serviceExtra,
      }));
      setExtras(mappedExtras);
    } else if (existingExtras.length > 0) {
      const mappedExtras = existingExtras.map(item => ({
        id: item.id,
        serviceExtraId: item.serviceExtraId,
        valor: item.valor || "0.00",
        observacao: item.observacao || "",
        serviceExtra: item.serviceExtra,
      }));
      setExtras(mappedExtras);
    }
  }, [initialExtras, existingExtras]);

  // Notify parent component of changes
  useEffect(() => {
    if (onChange) {
      onChange(extras);
    }
  }, [extras, onChange]);

  const createExtraItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/service-extra-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/services/${serviceId}/extras`] });
      toast({ title: "Adicional criado com sucesso!" });
    },
  });

  const updateExtraItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/service-extra-items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/services/${serviceId}/extras`] });
      toast({ title: "Adicional atualizado com sucesso!" });
    },
  });

  const deleteExtraItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/service-extra-items/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/services/${serviceId}/extras`] });
      toast({ title: "Adicional removido com sucesso!" });
    },
  });

  const addExtra = () => {
    const newExtra: ServiceExtraRow = {
      serviceExtraId: 0,
      valor: "0.00",
      observacao: "",
    };
    setExtras([...extras, newExtra]);
  };

  const removeExtra = (index: number) => {
    const extra = extras[index];
    if (extra.id && serviceId) {
      // Delete from database if it exists
      deleteExtraItemMutation.mutate(extra.id);
    }
    // Remove from local state
    const newExtras = extras.filter((_, i) => i !== index);
    setExtras(newExtras);
  };

  const updateExtra = (index: number, field: keyof ServiceExtraRow, value: any) => {
    const newExtras = [...extras];
    newExtras[index] = { ...newExtras[index], [field]: value };

    // If changing the service extra, update the default value
    if (field === 'serviceExtraId') {
      const selectedExtra = availableExtras.find(e => e.id === value);
      if (selectedExtra) {
        newExtras[index].valor = selectedExtra.valorPadrao || "0.00";
        newExtras[index].serviceExtra = selectedExtra;
      }
    }

    setExtras(newExtras);

    // Save to database if service exists and extra has an ID
    if (serviceId && newExtras[index].id) {
      const updateData = {
        serviceExtraId: newExtras[index].serviceExtraId,
        valor: newExtras[index].valor,
        observacao: newExtras[index].observacao,
      };
      updateExtraItemMutation.mutate({ id: newExtras[index].id!, data: updateData });
    }
  };

  const saveExtra = (index: number) => {
    const extra = extras[index];
    if (!serviceId || extra.serviceExtraId === 0) return;

    const data = {
      serviceId,
      serviceExtraId: extra.serviceExtraId,
      valor: extra.valor,
      observacao: extra.observacao,
    };

    createExtraItemMutation.mutate(data);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-gray-700">Adicionais do Serviço</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addExtra}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      <div className="space-y-3">
        {extras.map((extra, index) => (
          <Card key={index} className="border border-gray-200">
            <CardContent className="p-4">
              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-4">
                  <Label className="text-xs text-gray-600">Adicional</Label>
                  <Select
                    value={extra.serviceExtraId.toString()}
                    onValueChange={(value) => updateExtra(index, 'serviceExtraId', parseInt(value))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione um adicional" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableExtras.map((availableExtra) => (
                        <SelectItem key={availableExtra.id} value={availableExtra.id.toString()}>
                          {availableExtra.descricao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label className="text-xs text-gray-600">Valor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={extra.valor}
                    onChange={(e) => updateExtra(index, 'valor', e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="col-span-5">
                  <Label className="text-xs text-gray-600">Observação</Label>
                  <Textarea
                    placeholder="Observações sobre este adicional..."
                    value={extra.observacao}
                    onChange={(e) => updateExtra(index, 'observacao', e.target.value)}
                    className="h-9 min-h-[36px] resize-none"
                    rows={1}
                  />
                </div>

                <div className="col-span-1 flex gap-1">
                  {!extra.id && serviceId && extra.serviceExtraId > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => saveExtra(index)}
                      className="h-9 px-2"
                      disabled={createExtraItemMutation.isPending}
                    >
                      ✓
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeExtra(index)}
                    className="h-9 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {extras.length === 0 && (
          <Card className="border border-dashed border-gray-300">
            <CardContent className="p-6 text-center">
              <p className="text-gray-500 text-sm">Nenhum adicional foi adicionado ainda.</p>
              <p className="text-gray-400 text-xs mt-1">Clique em "Adicionar" para incluir adicionais ao serviço.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
