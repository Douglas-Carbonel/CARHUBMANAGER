import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Car, User, Check, ChevronsUpDown, Wrench, FileText, Camera } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVehicleSchema, type Vehicle, type Customer, type Photo } from "@shared/schema";
import { z } from "zod";
import { vehicleBrands, vehicleModels, fuelTypes } from "@/lib/vehicle-data";
import { cn } from "@/lib/utils";
import VehicleAnalytics from "@/components/dashboard/vehicle-analytics";
import { BarChart3 } from "lucide-react";
import PhotoUpload from "@/components/photos/photo-upload";

async function apiRequest(method: string, url: string, data?: any): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  return res;
}

const vehicleFormSchema = insertVehicleSchema;
type VehicleFormData = z.infer<typeof vehicleFormSchema>;

// Image compression utility
const compressImage = (file: File | string, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxWidth) {
          width = (width * maxWidth) / height;
          height = maxWidth;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };

    if (typeof file === 'string') {
      img.src = file;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  });
};

// CameraCapture Component
interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoTaken: (photo: string, category: string, vehicleId?: number) => void;
  vehicleId?: number;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ isOpen, onClose, onPhotoTaken, vehicleId }) => {
  const [hasPhoto, setHasPhoto] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("vehicle");
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const categoryOptions = [
    { value: "vehicle", label: "Veículo" },
    { value: "damage", label: "Dano" },
    { value: "before", label: "Antes" },
    { value: "after", label: "Depois" },
    { value: "other", label: "Outro" }
  ];

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setIsCameraReady(true);
          };
        }
      } catch (error) {
        console.error("Erro ao acessar a câmera:", error);
        onClose();
      }
    };

    if (isOpen) {
      startCamera();
    } else {
      // Stop the camera stream when the modal is closed
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setIsCameraReady(false);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, onClose]);

  const takePhoto = async () => {
    if (videoRef.current && canvasRef.current && isCameraReady) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

      const dataUrl = canvas.toDataURL('image/png');
      
      // Comprimir a imagem antes de armazenar
      const compressedPhoto = await compressImage(dataUrl, 800, 0.8);
      setPhoto(compressedPhoto);
      setHasPhoto(true);
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    setHasPhoto(false);
  };

  const savePhoto = () => {
    if (photo) {
      onPhotoTaken(photo, selectedCategory, vehicleId);
      onClose();
      setPhoto(null);
      setHasPhoto(false);
      setSelectedCategory("vehicle"); // Reset to default
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Capturar Foto</DialogTitle>
        </DialogHeader>
        
        {/* Category Selection - Always visible */}
        <div className="mb-4 space-y-2">
          <label className="text-sm font-medium text-gray-700">Categoria da Foto:</label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {!hasPhoto ? (
          <>
            <video ref={videoRef} autoPlay className="w-full aspect-video rounded-md" style={{ display: isCameraReady ? 'block' : 'none' }} />
            {!isCameraReady && <p>Aguardando a câmera...</p>}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div className="flex justify-around mt-4">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="button" onClick={takePhoto} disabled={!isCameraReady}>
                Tirar Foto
              </Button>
            </div>
          </>
        ) : (
          <>
            {photo && <img src={photo} alt="Captured" className="w-full rounded-md" />}

            <div className="flex justify-around mt-4">
              <Button type="button" variant="secondary" onClick={retakePhoto}>
                Retirar
              </Button>
              <Button type="button" onClick={savePhoto}>
                Salvar
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default function VehiclesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [customerFilter, setCustomerFilter] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [openBrandSelect, setOpenBrandSelect] = useState(false);
  const [openModelSelect, setOpenModelSelect] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [customModel, setCustomModel] = useState("");
  const [showCustomModel, setShowCustomModel] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [currentVehiclePhotos, setCurrentVehiclePhotos] = useState<Photo[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [temporaryPhotos, setTemporaryPhotos] = useState<{photo: string, category: string}[]>([]);
  const [uploadCategory, setUploadCategory] = useState<string>("vehicle");

  // Check URL parameters for customer filtering
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const customerId = urlParams.get('customerId');
    if (customerId) {
      setCustomerFilter(parseInt(customerId));
    }
  }, []);

  // Função para formatar placa do veículo
  const formatLicensePlate = (value: string): string => {
    // Remove tudo que não for letra ou número
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    // Aplica formatação baseada no padrão brasileiro
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 7) {
      // Formato antigo: ABC-1234
      return cleaned.replace(/^([A-Z]{1,3})([0-9]{0,4})$/, '$1-$2');
    } else {
      // Formato Mercosul: ABC1D23
      return cleaned.replace(/^([A-Z]{3})([0-9]{1})([A-Z]{1})([0-9]{2})$/, '$1$2$3$4');
    }
  };

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      licensePlate: "",
      brand: "",
      model: "",
      year: 2024,
      color: "",
      fuelType: "gasoline",
      customerId: 1,
    },
  });

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/vehicles");
      return await res.json();
    },
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/customers");
      return await res.json();
    },
  });

    const fetchVehiclePhotos = async (vehicleId: number | undefined) => {
    if (!vehicleId) {
      setCurrentVehiclePhotos([]);
      return;
    }

    try {
      const res = await apiRequest("GET", `/api/vehicles/${vehicleId}/photos`);
      const photos = await res.json() as Photo[];
      setCurrentVehiclePhotos(photos);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar fotos do veículo",
        description: error.message,
        variant: "destructive",
      });
      setCurrentVehiclePhotos([]);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: VehicleFormData) => {
      const res = await apiRequest("POST", "/api/vehicles", data);
      return await res.json();
    },
    onSuccess: async (vehicleData) => {
      // Se há fotos temporárias, salvá-las agora com o ID do veículo criado
      if (temporaryPhotos.length > 0) {
        for (const tempPhoto of temporaryPhotos) {
          try {
            await fetch(`/api/vehicles/${vehicleData.id}/photos`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                photo: tempPhoto.photo, 
                category: tempPhoto.category,
                description: 'Foto capturada pela câmera'
              }),
              credentials: 'include',
            });
          } catch (error) {
            console.error('Error saving temporary photo:', error);
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setIsModalOpen(false);
      setEditingVehicle(null);
      form.reset();
      setShowCustomModel(false);
      setCustomModel("");
      setTemporaryPhotos([]); // Limpar fotos temporárias

      toast({
        title: "Veículo cadastrado!",
        description: "Veículo foi adicionado com sucesso à frota!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: VehicleFormData }) => {
      const res = await apiRequest("PUT", `/api/vehicles/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setIsModalOpen(false);
      setEditingVehicle(null);
      form.reset();
      setShowCustomModel(false);
      setCustomModel("");
      toast({
        title: "Veículo atualizado",
        description: "Veículo foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/vehicles/${id}`);

      // Se a resposta não for ok, lançar erro com a mensagem do servidor
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao remover veículo");
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({
        title: "Veículo removido",
        description: "Veículo foi removido com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover veículo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: VehicleFormData) => {
    const finalData = {
      ...data,
      model: showCustomModel ? customModel : data.model,
    };

    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, data: finalData });
    } else {
      createMutation.mutate(finalData);
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setSelectedBrand(vehicle.brand);

    // Verificar se o modelo existe na lista ou é customizado
    const modelsForBrand = vehicleModels[vehicle.brand] || [];
    const isCustomModel = !modelsForBrand.includes(vehicle.model);

    if (isCustomModel) {
      setShowCustomModel(true);
      setCustomModel(vehicle.model);
    } else {
      setShowCustomModel(false);
      setCustomModel("");
    }

    form.reset({
      licensePlate: vehicle.licensePlate,
      brand: vehicle.brand,
      model: isCustomModel ? "" : vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      fuelType: vehicle.fuelType as "gasoline" | "ethanol" | "flex" | "diesel",
      customerId: vehicle.customerId,
    });
    fetchVehiclePhotos(vehicle.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    const confirmed = confirm(
      "Tem certeza que deseja remover este veículo?\n\n" +
      "ATENÇÃO: O veículo não poderá ser removido se houver serviços em aberto " +
      "(agendados ou em andamento). Finalize ou cancele todos os serviços antes de excluir."
    );

    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

  const handleModelSelect = (model: string) => {
    if (model === "custom") {
      setShowCustomModel(true);
      form.setValue("model", "");
      setOpenModelSelect(false);
    } else {
      setShowCustomModel(false);
      setCustomModel("");
      form.setValue("model", model);
      setOpenModelSelect(false);
    }
  };

  const filteredVehicles = vehicles.filter((vehicle: Vehicle) => {
    const matchesSearch = 
      vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vehicle.color || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCustomer = customerFilter ? vehicle.customerId === customerFilter : true;

    return matchesSearch && matchesCustomer;
  });

  const handlePhotoTaken = async (photo: string, category: string, vehicleId?: number) => {
    // Se não há ID do veículo (novo veículo), armazenar como foto temporária
    if (!vehicleId) {
      setTemporaryPhotos(prev => [...prev, { photo, category }]);
      toast({
        title: "Foto capturada!",
        description: "A foto será salva quando o veículo for cadastrado.",
      });
      return;
    }

    // Se há ID do veículo (editando veículo existente), salvar imediatamente
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          photo, 
          category,
          description: category === 'vehicle' ? 'Veículo' : 
                      category === 'damage' ? 'Dano' :
                      category === 'before' ? 'Antes' :
                      category === 'after' ? 'Depois' : 'Outro'
        }),
        credentials: 'include',
      });

      if (res.ok) {
        toast({
          title: "Foto salva!",
          description: "A foto foi salva com sucesso.",
        });
        fetchVehiclePhotos(vehicleId); // Refresh vehicle photos
      } else {
        const errorText = await res.text();
        throw new Error(`Failed to save photo: ${errorText}`);
      }
    } catch (error: any) {
      console.error("Error saving photo:", error);
      toast({
        title: "Erro ao salvar foto",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Veículos"
          subtitle="Gerencie a frota de veículos"
        />

        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white/80 via-blue-50/50 to-indigo-50/30 backdrop-blur-sm">
          <div className="p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
              <div className="flex-1 max-w-md space-y-3">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="Buscar veículos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 w-80 h-12 border-2 border-gray-200 focus:border-blue-400 rounded-xl shadow-sm bg-white/80"
                  />
                </div>
                {customerFilter && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                      Cliente: {customers.find(c => c.id === customerFilter)?.name || 'Desconhecido'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCustomerFilter(null);
                        window.history.replaceState({}, '', '/vehicles');
                      }}
                      className="h-6 w-6 p-0 hover:bg-red-100"
                    >
                      ×
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setIsAnalyticsModalOpen(true)}
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  📊 Ver Relatórios
                </Button>
                <div className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-4 py-2 rounded-lg shadow-md">
                  <span className="font-semibold">{filteredVehicles.length}</span>
                  <span className="ml-1 text-sm">veículos</span>
                </div>
              </div>
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    onClick={() => {
                      setEditingVehicle(null);
                      setShowCustomModel(false);
                      setCustomModel("");
                      setSelectedBrand("");
                      form.reset();
                      setCurrentVehiclePhotos([]);
                    }}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Novo Veículo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl bg-gradient-to-br from-slate-50 to-blue-50/30">
                  <DialogHeader className="pb-6">
                    <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-transparent">
                      {editingVehicle ? "Editar Veículo" : "Novo Veículo"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="customerId"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                                <User className="h-4 w-4 mr-2 text-teal-600" />
                                Cliente
                              </FormLabel>
                              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                <FormControl>
                                  <SelectTrigger className="h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md">
                                    <SelectValue placeholder="Selecione o cliente" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {customers.map((customer: Customer) => (
                                    <SelectItem key={customer.id} value={customer.id.toString()}>
                                      {customer.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="licensePlate"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                                <Car className="h-4 w-4 mr-2 text-teal-600" />
                                Placa
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="ABC-1234 ou ABC1D23" 
                                  {...field}
                                  onChange={(e) => {
                                    const formatted = formatLicensePlate(e.target.value);
                                    field.onChange(formatted);
                                  }}
                                  maxLength={8}
                                  className="h-11 border-2 border-slate-200 focus:border-teal-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="brand"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Marca</FormLabel>
                              <Popover open={openBrandSelect} onOpenChange={setOpenBrandSelect}>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className={cn(
                                        "w-full justify-between",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      {field.value || "Selecione a marca"}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0">
                                  <Command>
                                    <CommandInput placeholder="Buscar marca..." />
                                    <CommandList>
                                      <CommandEmpty>Nenhuma marca encontrada.</CommandEmpty>
                                      <CommandGroup>
                                        {vehicleBrands.map((brand) => (
                                          <CommandItem
                                            value={brand}
                                            key={brand}
                                            onSelect={() => {
                                              form.setValue("brand", brand);
                                              setSelectedBrand(brand);
                                              if (form.getValues("model") && !vehicleModels[brand]?.includes(form.getValues("model"))) {
                                                form.setValue("model", "");
                                              }
                                              setOpenBrandSelect(false);
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                brand === field.value ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            {brand}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="model"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Modelo</FormLabel>
                              {!showCustomModel ? (
                                <Popover open={openModelSelect} onOpenChange={setOpenModelSelect}>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant="outline"
                                        role="combobox"
                                        disabled={!selectedBrand && !form.getValues("brand")}
                                        className={cn(
                                          "w-full justify-between",
                                          !field.value && "text-muted-foreground"
                                        )}
                                      >
                                        {field.value || "Selecione o modelo"}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-full p-0">
                                    <Command>
                                      <CommandInput placeholder="Buscar modelo..." />
                                      <CommandList>
                                        <CommandEmpty>Nenhum modelo encontrado.</CommandEmpty>
                                        <CommandGroup>
                                          {vehicleModels[selectedBrand || form.getValues("brand")]?.map((model) => (
                                            <CommandItem
                                              value={model}
                                              key={model}
                                              onSelect={() => handleModelSelect(model)}
                                            >
                                              <Check
                                                className={cn(
                                                  "mr-2 h-4 w-4",
                                                  model === field.value ? "opacity-100" : "opacity-0"
                                                )}
                                              />
                                              {model}
                                            </CommandItem>
                                          ))}
                                          <CommandItem
                                            value="custom"
                                            onSelect={() => handleModelSelect("custom")}
                                            className="border-t border-gray-200 text-blue-600 font-medium"
                                          >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Digite um modelo customizado
                                          </CommandItem>
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                              ) : (
                                <div className="space-y-2">
                                  <FormControl>
                                    <Input 
                                      placeholder="Digite o modelo customizado"
                                      value={customModel}
                                      onChange={(e) => setCustomModel(e.target.value)}
                                    />
                                  </FormControl>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setShowCustomModel(false);
                                      setCustomModel("");
                                      form.setValue("model", "");
                                    }}
                                  >
                                    Voltar para lista
                                  </Button>
                                </div>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="year"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ano</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="2024" 
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="color"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cor</FormLabel>
                              <FormControl>
                                <Input placeholder="Branco" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="fuelType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Combustível</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o combustível" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {fuelTypes.map((fuel) => (
                                    <SelectItem key={fuel.value} value={fuel.value}>
                                      {fuel.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Photos Section */}
                      <div className="col-span-2 border-t pt-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-700">Fotos</h4>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsCameraOpen(true)}
                                className="flex items-center gap-2"
                              >
                                <Camera className="h-4 w-4" />
                                Tirar Foto
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const fileInput = document.getElementById('vehicle-photo-upload') as HTMLInputElement;
                                  if (fileInput) {
                                    fileInput.click();
                                  }
                                }}
                                className="flex items-center gap-2"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Adicionar Fotos
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              className="hidden"
                              id="vehicle-photo-upload"
                              onChange={async (e) => {
                                if (!editingVehicle?.id || !e.target.files) return;
                                  
                                  const files = Array.from(e.target.files);
                                  for (const file of files) {
                                    try {
                                      // Comprimir a imagem antes de enviar
                                      const compressedPhoto = await compressImage(file, 800, 0.8);
                                      
                                      const res = await fetch(`/api/vehicles/${editingVehicle.id}/photos`, {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({ 
                                          photo: compressedPhoto, 
                                          category: uploadCategory,
                                          description: uploadCategory === 'vehicle' ? 'Veículo' : 
                                                      uploadCategory === 'damage' ? 'Dano' :
                                                      uploadCategory === 'before' ? 'Antes' :
                                                      uploadCategory === 'after' ? 'Depois' : 'Outro'
                                        }),
                                        credentials: 'include',
                                      });
                                      
                                      if (res.ok) {
                                        fetchVehiclePhotos(editingVehicle.id);
                                        toast({
                                          title: "Foto adicionada",
                                          description: "A foto foi adicionada com sucesso.",
                                        });
                                      }
                                    } catch (error) {
                                      console.error('Error uploading photo:', error);
                                      toast({
                                        title: "Erro ao enviar foto",
                                        description: "Erro ao processar a imagem.",
                                        variant: "destructive",
                                      });
                                    }
                                  }
                                  e.target.value = '';
                                }}
                              />
                            
                            <PhotoUpload
                              photos={currentVehiclePhotos}
                              onPhotoUploaded={() => fetchVehiclePhotos(editingVehicle?.id)}
                              vehicleId={editingVehicle?.id}
                              maxPhotos={7}
                            />
                            
                            {/* Mostrar fotos temporárias para novos veículos */}
                            {!editingVehicle && temporaryPhotos.length > 0 && (
                              <div className="mt-4 space-y-2">
                                <h5 className="text-sm font-medium text-gray-600">Fotos capturadas (serão salvas após cadastrar o veículo):</h5>
                                <div className="grid grid-cols-3 gap-2">
                                  {temporaryPhotos.map((tempPhoto, index) => (
                                    <div key={index} className="relative group">
                                      <img 
                                        src={tempPhoto.photo} 
                                        alt={`Foto temporária ${index + 1}`}
                                        className="w-full h-20 object-cover rounded-lg border border-gray-200"
                                      />
                                      <div className="absolute bottom-1 left-1 right-1">
                                        <span className="text-xs bg-black bg-opacity-70 text-white px-1 py-0.5 rounded text-center block">
                                          {tempPhoto.category === 'vehicle' ? 'Veículo' : 
                                           tempPhoto.category === 'damage' ? 'Dano' :
                                           tempPhoto.category === 'before' ? 'Antes' :
                                           tempPhoto.category === 'after' ? 'Depois' : 'Outro'}
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setTemporaryPhotos(prev => prev.filter((_, i) => i !== index));
                                          toast({
                                            title: "Foto removida",
                                            description: "A foto temporária foi removida.",
                                          });
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-4 pt-4">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => {
                            setIsModalOpen(false);
                            setCurrentVehiclePhotos([]);
                            setTemporaryPhotos([]);
                            setEditingVehicle(null);
                            form.reset();
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createMutation.isPending || updateMutation.isPending}
                        >
                          {editingVehicle ? "Atualizar" : "Cadastrar"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              {/* Camera Capture Modal */}
              <CameraCapture
                isOpen={isCameraOpen}
                onClose={() => setIsCameraOpen(false)}
                onPhotoTaken={handlePhotoTaken}
                vehicleId={editingVehicle?.id}
              />

              {/* Analytics Modal */}
              <Dialog open={isAnalyticsModalOpen} onOpenChange={setIsAnalyticsModalOpen}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      Relatório de Veículos
                    </DialogTitle>
                  </DialogHeader>
                  <VehicleAnalytics />
                </DialogContent>
              </Dialog>

            {vehiclesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="bg-gradient-to-br from-teal-100 to-emerald-100 p-6 rounded-full mb-6 w-24 h-24 flex items-center justify-center">
                  <Car className="h-12 w-12 text-teal-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Nenhum veículo encontrado
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm ? 'Tente ajustar os termos de busca.' : 'Comece adicionando seu primeiro veículo.'}
                </p>
                {!searchTerm && (
                  <Button
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    onClick={() => {
                      setEditingVehicle(null);
                      form.reset();
                      setIsModalOpen(true);
                    }}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Adicionar Primeiro Veículo
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredVehicles.map((vehicle: Vehicle) => {
                  const customer = customers.find((c: Customer) => c.id === vehicle.customerId);
                  return (
                    <div key={vehicle.id} className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-teal-200 overflow-hidden">
                      {/* Background gradient sutil */}
                      <div className="absolute inset-0 bg-gradient-to-br from-teal-50/30 to-emerald-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Header colorido */}
                      <div className="relative h-20 bg-gradient-to-r from-teal-500 to-emerald-600 p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white font-bold text-lg border border-white/30">
                            <Car className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="text-white font-semibold truncate max-w-32">
                              {vehicle.brand} {vehicle.model}
                            </h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-teal-100 bg-white/20 px-2 py-0.5 rounded-full font-mono">
                                {vehicle.licensePlate}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions no header */}
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(vehicle)}
                            className="h-8 w-8 p-0 text-white hover:bg-white/20 border-0"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(vehicle.id)}
                            className="h-8 w-8 p-0 text-white hover:bg-red-500/20 border-0"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Conteúdo */}
                      <div className="relative p-5">
                        {/* Informações do cliente */}
                        <div className="mb-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            <User className="h-3 w-3 mr-1" />
                            {customer?.name || 'Cliente não encontrado'}
                          </span>
                        </div>

                        {/* Informações do veículo */}
                        <div className="space-y-3 mb-6">
                          <div className="flex items-center text-sm">
                            <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center mr-3">
                              <span className="text-gray-500 text-xs">📅</span>
                            </div>
                            <span className="text-gray-900 text-xs font-semibold">
                              {vehicle.year}
                            </span>
                          </div>

                          <div className="flex items-center text-sm">
                            <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center mr-3">
                              <span className="text-gray-500 text-xs">🎨</span>
                            </div>
                            <span className="text-gray-700 text-xs">
                              {vehicle.color}
                            </span>
                          </div>

                          <div className="flex items-center text-sm">
                            <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center mr-3">
                              <span className="text-gray-500 text-xs">⛽</span>
                            </div>
                            <span className="text-gray-700 text-xs capitalize">
                              {fuelTypes.find(f => f.value === vehicle.fuelType)?.label || vehicle.fuelType}
                            </span>
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="space-y-2">
                          <Button
                            onClick={() => setLocation(`/services?vehicleId=${vehicle.id}&vehiclePlate=${encodeURIComponent(vehicle.licensePlate)}`)}
                            className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-sm rounded-xl h-10"
                            size="sm"
                          >
                            <Wrench className="h-4 w-4 mr-2" />
                            Serviços
                          </Button>

                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLocation(`/vehicle-photos?vehicleId=${vehicle.id}&vehiclePlate=${encodeURIComponent(vehicle.licensePlate)}`)}
                              className="border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl h-9"
                            >
                              <Camera className="h-3 w-3 mr-1" />
                              <span className="text-xs">Fotos</span>
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLocation(`/vehicle-history?vehicleId=${vehicle.id}&vehiclePlate=${encodeURIComponent(vehicle.licensePlate)}`)}
                              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl h-9"
                            >
                              <FileText className="h-3 w-3 mr-2" />
                              <span className="text-xs">Histórico</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default VehiclesPage;