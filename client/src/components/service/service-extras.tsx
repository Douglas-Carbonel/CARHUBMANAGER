import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, FileText } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ServiceType } from "@shared/schema";

// Utility functions for currency formatting
const formatCurrency = (value: string): string => {
  if (!value) return '';

  // Remove tudo que não for número
  let numericValue = value.replace(/[^\d]/g, '');

  // Se for vazio, retorna vazio
  if (!numericValue) return '';

  // Converte para número e divide por 100 para ter centavos
  const numberValue = parseInt(numericValue) / 100;

  // Formata para moeda brasileira
  return numberValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const parseCurrency = (formattedValue: string): string => {
  if (!formattedValue) return '0.00';

  // Remove tudo que não for número
  const numericValue = formattedValue.replace(/[^\d]/g, '');

  if (!numericValue) return '0.00';

  // Converte para formato decimal americano
  const numberValue = parseInt(numericValue) / 100;

  return numberValue.toFixed(2);
};

interface ServiceExtraRow {
  id?: number;
  tempId: string; // Temporary unique identifier for tracking
  serviceExtraId: number;
  valor: string;
  observacao: string;
  serviceExtra?: {
    id: number;
    descricao: string;
    defaultPrice?: string;
  };
}

interface ServiceExtrasProps {
  serviceId?: number;
  onChange?: (extras: ServiceExtraRow[]) => void;
  initialExtras?: ServiceExtraRow[];
}

export default function ServiceExtras({ serviceId, onChange, initialExtras = [] }: ServiceExtrasProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [extras, setExtras] = useState<ServiceExtraRow[]>([]);

  // Force invalidate service-types cache on mount to ensure fresh data
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/service-types"] });
  }, [queryClient]);

  // Buscar service types disponíveis com queryFn explícita
  const { data: serviceTypes = [], isLoading: serviceTypesLoading, error: serviceTypesError } = useQuery<ServiceType[]>({
    queryKey: ["/api/service-types"],
    queryFn: async () => {
      const res = await fetch("/api/service-types", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      console.log('ServiceExtras - Fresh API data received:', data);
      return data;
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // No longer need to load existing extras since we pass them via initialExtras

  // Initialize extras from initial data (service items)
  useEffect(() => {
    if (initialExtras.length > 0) {
      console.log('ServiceExtras - Initializing with data:', initialExtras);
      setExtras(initialExtras);
    }
  }, [initialExtras]);

  // Notify parent component of changes
  useEffect(() => {
    if (onChange) {
      onChange(extras);
    }
  }, [extras, onChange]);

  // No longer need mutations for individual service items
  // All changes will be handled by the parent component when saving the service

  const addExtra = () => {
    const newExtra: ServiceExtraRow = {
      tempId: `new_${Date.now()}_${Math.random()}`, // Unique identifier
      serviceExtraId: 0,
      valor: "0.00",
      observacao: "",
    };
    setExtras([newExtra, ...extras]);
  };

  const removeExtra = (tempId: string) => {
    // Remove from local state using tempId
    const newExtras = extras.filter(e => e.tempId !== tempId);
    setExtras(newExtras);
  };

  const updateExtra = (tempId: string, field: keyof ServiceExtraRow, value: any) => {
    const newExtras = [...extras];
    const index = newExtras.findIndex(e => e.tempId === tempId);
    
    if (index === -1) return; // Item not found
    
    newExtras[index] = { ...newExtras[index], [field]: value };

    // If changing the service extra, update the default value
    if (field === 'serviceExtraId') {
      const selectedServiceType = serviceTypes.find(st => st.id === value);
      if (selectedServiceType && value > 0) {
        newExtras[index].valor = selectedServiceType.defaultPrice || "0.00";
        // Create a serviceExtra object from the service type for compatibility
        newExtras[index].serviceExtra = {
          id: selectedServiceType.id,
          descricao: selectedServiceType.name,
          defaultPrice: selectedServiceType.defaultPrice
        };
      } else if (value === 0) {
        // Reset values when no service is selected
        newExtras[index].valor = "0.00";
        newExtras[index].serviceExtra = undefined;
      }
    }

    setExtras(newExtras);

    // Changes will be saved when the service is saved
  };

  // All saves are handled by the parent component when the service is saved

  // Usar service types como serviços disponíveis, filtrando os já selecionados
  const availableServices = serviceTypes
    .filter((serviceType) => serviceType.isActive !== false) // Include undefined/null as active
    .map((serviceType) => ({
      id: serviceType.id,
      descricao: serviceType.name,
      preco: serviceType.defaultPrice || "0.00"
    }));

  // Debug: Log service types data
  console.log('ServiceExtras - Query state:', { 
    loading: serviceTypesLoading, 
    error: serviceTypesError, 
    serviceTypesLength: serviceTypes?.length 
  });
  console.log('ServiceExtras - Total serviceTypes:', serviceTypes.length);
  console.log('ServiceExtras - Available services after filter:', availableServices.length);
  console.log('ServiceExtras - ServiceTypes data:', serviceTypes);
  
  if (serviceTypesError) {
    console.error('ServiceExtras - Query error:', serviceTypesError);
  }
  
  // Show loading state
  if (serviceTypesLoading) {
    console.log('ServiceExtras - Still loading service types...');
  }

  // Add success log
  if (!serviceTypesLoading && serviceTypes.length > 0) {
    console.log('ServiceExtras - SUCCESS: Service types loaded successfully!', serviceTypes.length, 'types');
  }

  // Get available services for each dropdown (excluding already selected ones, but including the current selection)
  const getAvailableServicesForDropdown = (currentTempId: string) => {
    const currentExtra = extras.find(e => e.tempId === currentTempId);
    const currentServiceId = currentExtra?.serviceExtraId;
    return availableServices.filter(
      (service) => {
        // Include if it's not selected by any other dropdown OR if it's the current selection
        const isSelectedElsewhere = extras.some((selected) => 
          selected.tempId !== currentTempId && selected.serviceExtraId === service.id
        );
        return !isSelectedElsewhere;
      }
    );
  };

  const isMobile = useIsMobile();
  const [observationModal, setObservationModal] = useState<{ isOpen: boolean; tempId: string; observation: string }>({
    isOpen: false,
    tempId: '',
    observation: ''
  });

  const openObservationModal = (tempId: string, observation: string) => {
    setObservationModal({ isOpen: true, tempId, observation });
  };

  const saveObservation = () => {
    updateExtra(observationModal.tempId, 'observacao', observationModal.observation);
    setObservationModal({ isOpen: false, tempId: '', observation: '' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-gray-700">Serviços</Label>
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
        {extras.map((extra) => (
          <Card key={extra.tempId} className="border border-gray-200">
            <CardContent className={isMobile ? "p-3" : "p-4"}>
              {isMobile ? (
                // Mobile compact layout - maximum 2 lines
                <div className="space-y-2">
                  {/* First line: Service selector + delete button */}
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <Select
                        value={extra.serviceExtraId > 0 ? extra.serviceExtraId.toString() : ""}
                        onValueChange={(value) => updateExtra(extra.tempId, 'serviceExtraId', parseInt(value))}
                      >
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue placeholder="Selecione um serviço" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableServicesForDropdown(extra.tempId).map((availableService) => (
                            <SelectItem key={availableService.id} value={availableService.id.toString()}>
                              {availableService.descricao}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeExtra(extra.tempId)}
                      className="h-10 w-10 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Second line: Value + observation button + save button */}
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <Input
                        type="text"
                        placeholder="0,00"
                        value={formatCurrency(extra.valor)}
                        onChange={(e) => {
                          const rawValue = parseCurrency(e.target.value);
                          updateExtra(extra.tempId, 'valor', rawValue);
                        }}
                        className="h-10 text-sm font-semibold text-center bg-green-50 border-green-200 focus:border-green-400"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openObservationModal(extra.tempId, extra.observacao)}
                      className="h-10 px-3 flex-shrink-0 flex items-center gap-1"
                    >
                      <FileText className="h-3 w-3" />
                      <span className="text-xs">
                        {extra.observacao ? extra.observacao.substring(0, 3) + '...' : 'Obs'}
                      </span>
                    </Button>
                    {!extra.id && serviceId && extra.serviceExtraId > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => saveExtra(extra.tempId)}
                        className="h-10 px-3 text-sm font-medium flex-shrink-0"
                        disabled={createExtraItemMutation.isPending}
                      >
                        ✓
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                // Desktop layout - original grid
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-4">
                    <Label className="text-sm text-gray-600 font-medium">Serviço</Label>
                    <Select
                      value={extra.serviceExtraId > 0 ? extra.serviceExtraId.toString() : ""}
                      onValueChange={(value) => updateExtra(extra.tempId, 'serviceExtraId', parseInt(value))}
                    >
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="Selecione um serviço" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableServicesForDropdown(extra.tempId).map((availableService) => (
                          <SelectItem key={availableService.id} value={availableService.id.toString()}>
                            {availableService.descricao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-3">
                    <Label className="text-sm text-gray-600 font-medium">Valor (R$)</Label>
                    <Input
                      type="text"
                      placeholder="0,00"
                      value={formatCurrency(extra.valor)}
                      onChange={(e) => {
                        const rawValue = parseCurrency(e.target.value);
                        updateExtra(extra.tempId, 'valor', rawValue);
                      }}
                      className="h-14 text-lg font-bold text-center bg-green-50 border-2 border-green-200 focus:border-green-400 rounded-lg"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <Label className="text-sm text-gray-600 font-medium">Observação</Label>
                    <Textarea
                      placeholder="Observações sobre este adicional..."
                      value={extra.observacao}
                      onChange={(e) => updateExtra(extra.tempId, 'observacao', e.target.value)}
                      className="h-12 min-h-[48px] resize-none text-base"
                      rows={1}
                    />
                  </div>

                  <div className="md:col-span-1 flex gap-2 justify-center md:justify-end mt-2 md:mt-0">
                    {/* Save button removed - all saves handled by parent component */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeExtra(extra.tempId)}
                      className="h-12 px-4 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {extras.length === 0 && (
          <Card className="border border-dashed border-gray-300">
            <CardContent className="p-6 text-center">
              <p className="text-gray-500 text-sm">Sem serviços até o momento. Clique em 'Adicionar' para cadastrar.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Observation Modal */}
      <Dialog open={observationModal.isOpen} onOpenChange={(open) => !open && setObservationModal({ isOpen: false, tempId: '', observation: '' })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Observações do Serviço</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Digite as observações sobre este serviço..."
              value={observationModal.observation}
              onChange={(e) => setObservationModal(prev => ({ ...prev, observation: e.target.value }))}
              className="min-h-[120px] resize-none"
              rows={5}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setObservationModal({ isOpen: false, tempId: '', observation: '' })}
              >
                Cancelar
              </Button>
              <Button onClick={saveObservation} className="bg-teal-600 hover:bg-teal-700">
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}