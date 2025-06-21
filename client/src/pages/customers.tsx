import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreHorizontal, Plus, Search, Edit, Trash2, User, Phone, Mail, FileText, MapPin, BarChart3, Car, Wrench, Camera } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Customer } from "@shared/schema";
import { cn } from "@/lib/utils";
import { validateCPF, validateCNPJ, formatCPF, formatCNPJ, applyCPFMask, applyCNPJMask, applyPhoneMask } from "@/lib/cpf-cnpj";
import CustomerAnalytics from "@/components/dashboard/customer-analytics";
import PhotoGallery from "@/components/photos/photo-gallery";
import { z } from "zod";
import { insertCustomerSchema } from "@shared/schema";
import PhotoUpload from "@/components/photos/photo-upload";
import CameraCapture from "@/components/camera/camera-capture";
import { useIsMobile } from "@/hooks/use-mobile";

async function apiRequest(method: string, url: string, data?: any): Promise<Response> {
  console.log(`API Request: ${method} ${url}`, data);

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  console.log(`API Response: ${method} ${url} - Status: ${res.status}`);

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    console.error(`API Error: ${method} ${url} - ${res.status}: ${text}`);
    throw new Error(`${res.status}: ${text}`);
  }
  return res;
}

const customerFormSchema = insertCustomerSchema.extend({
  name: z.string().min(1, "Nome é obrigatório"),
  document: z.string().optional().refine((doc) => {
    if (!doc || doc.trim() === '') return true;
    const cleanDoc = doc.replace(/\D/g, '');
    return cleanDoc.length === 11 ? validateCPF(cleanDoc) : validateCNPJ(cleanDoc);
  }, "CPF ou CNPJ inválido"),
}).transform((data) => ({
  ...data,
  document: data.document || "",
  email: data.email || null,
  phone: data.phone || null,
  address: data.address || null,
  observations: data.observations || null,
}));
type CustomerFormData = z.infer<typeof customerFormSchema>;

export default function CustomersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [selectedCustomerForPhotos, setSelectedCustomerForPhotos] = useState<Customer | null>(null);
  const [isPhotosModalOpen, setIsPhotosModalOpen] = useState(false);
  const [currentCustomerPhotos, setCurrentCustomerPhotos] = useState<string[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const isMobile = useIsMobile();

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      code: "",
      name: "",
      email: "",
      phone: "",
      document: "",
      documentType: "cpf",
      address: "",
      observations: "",
    },
  });

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/customers");
      return await res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      console.log('Creating customer with data:', data);
      const res = await apiRequest("POST", "/api/customers", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/customers"] });
      setIsModalOpen(false);
      setEditingCustomer(null);
      form.reset();
      setCurrentCustomerPhotos([]);
      toast({
        title: "Cliente criado",
        description: "Cliente foi criado com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error('Error creating customer:', error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao criar cliente",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CustomerFormData }) => {
      console.log('Updating customer with data:', data);
      const res = await apiRequest("PUT", `/api/customers/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/customers"] });
      setIsModalOpen(false);
      setEditingCustomer(null);
      form.reset();
      setCurrentCustomerPhotos([]);
      toast({
        title: "Cliente atualizado",
        description: "Cliente foi atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error('Error updating customer:', error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar cliente",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/customers"] });
      toast({
        title: "Cliente removido",
        description: "Cliente foi removido com sucesso.",
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

  const generateCustomerCode = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${timestamp}${random}`;
  };

  const onSubmit = (data: CustomerFormData) => {
    console.log('Form submitted with data:', data);

    try {
      // Auto-generate code for new customers if not provided
      if (!editingCustomer && !data.code) {
        data.code = generateCustomerCode();
      }

      if (editingCustomer) {
        updateMutation.mutate({ id: editingCustomer.id, data });
      } else {
        createMutation.mutate(data);
      }
    } catch (error) {
      console.error('Error in onSubmit:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar formulário",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    form.reset({
      code: customer.code,
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      document: customer.document || "",
      documentType: (customer.documentType as "cpf" | "cnpj") || "cpf",
      address: customer.address || "",
      observations: customer.observations || "",
    });
    setIsModalOpen(true);
    fetchCustomerPhotos(customer.id);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover este cliente?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleViewPhotos = (customer: Customer) => {
    setSelectedCustomerForPhotos(customer);
    setIsPhotosModalOpen(true);
  };

  const fetchCustomerPhotos = async (customerId: number | undefined) => {
    if (!customerId) {
      setCurrentCustomerPhotos([]);
      return;
    }

    try {
      const res = await apiRequest("GET", `/api/customers/${customerId}/photos`);
      const photos = await res.json();
      setCurrentCustomerPhotos(photos);
    } catch (error) {
      console.error("Failed to fetch customer photos:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar fotos do cliente",
        variant: "destructive",
      });
      setCurrentCustomerPhotos([]);
    }
  };

  const handlePhotoTaken = () => {
    if (editingCustomer) {
      fetchCustomerPhotos(editingCustomer.id);
    }
    toast({
      title: "Foto capturada",
      description: "Foto foi adicionada com sucesso.",
    });
  };

  const filteredCustomers = customers.filter((customer: Customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.document && customer.document.includes(searchTerm)) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Clientes"
          subtitle="Gerencie seus clientes e suas informações"
        />

        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white/80 via-blue-50/50 to-indigo-50/30 backdrop-blur-sm">
          <div className="p-4 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Buscar clientes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 w-full sm:w-80 h-12 border-2 border-gray-200 focus:border-blue-400 rounded-xl shadow-sm bg-white/80"
                />
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
                  <span className="font-semibold">{filteredCustomers.length}</span>
                  <span className="ml-1 text-sm">clientes</span>
                </div>
              </div>
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    onClick={() => {
                      setEditingCustomer(null);
                      form.reset();
                      setCurrentCustomerPhotos([]);
                    }}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Novo Cliente
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl bg-gradient-to-br from-slate-50 to-blue-50/30">
                  <DialogHeader className="pb-6">
                    <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">
                      {editingCustomer ? "Editar Cliente" : "Novo Cliente"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
                      console.log('Form validation errors:', errors);
                      toast({
                        title: "Erro de validação",
                        description: "Por favor, verifique os campos obrigatórios",
                        variant: "destructive",
                      });
                    })} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                                <User className="h-4 w-4 mr-2 text-emerald-600" />
                                Nome <span className="text-red-500 ml-1">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Nome completo" 
                                  {...field} 
                                  required 
                                  className="h-11 border-2 border-slate-200 focus:border-emerald-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                                <Mail className="h-4 w-4 mr-2 text-emerald-600" />
                                Email
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="email@exemplo.com" 
                                  type="email" 
                                  {...field}
                                  value={field.value || ""}
                                  className="h-11 border-2 border-slate-200 focus:border-emerald-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-sm font-semibold text-slate-700 flex items-center">
                                <Phone className="h-4 w-4 mr-2 text-emerald-600" />
                                Telefone
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="(11) 99999-9999" 
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) => {
                                    field.onChange(applyPhoneMask(e.target.value));
                                  }}
                                  className="h-11 border-2 border-slate-200 focus:border-emerald-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="documentType"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-sm font-semibold text-slate-700">Tipo de Documento</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-11 border-2 border-slate-200 focus:border-emerald-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md">
                                    <SelectValue placeholder="Selecione o tipo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="cpf">CPF</SelectItem>
                                  <SelectItem value="cnpj">CNPJ</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="document"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-sm font-semibold text-slate-700">Documento</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder={form.watch("documentType") === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                                  {...field}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    const documentType = form.watch("documentType");
                                    if (documentType === "cpf") {
                                      field.onChange(applyCPFMask(value));
                                    } else {
                                      field.onChange(applyCNPJMask(value));
                                    }
                                  }}
                                  className="h-11 border-2 border-slate-200 focus:border-emerald-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem className="col-span-2 space-y-2">
                              <FormLabel className="text-sm font-semibold text-slate-700">Endereço</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Endereço completo" 
                                  {...field} 
                                  value={field.value || ""}
                                  className="h-11 border-2 border-slate-200 focus:border-emerald-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="observations"
                          render={({ field }) => (
                            <FormItem className="col-span-2 space-y-2">
                              <FormLabel className="text-sm font-semibold text-slate-700">Observações</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Observações adicionais sobre o cliente..." 
                                  {...field} 
                                  value={field.value || ""}
                                  className="min-h-[80px] border-2 border-slate-200 focus:border-emerald-400 rounded-lg shadow-sm bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-md resize-none"
                                  rows={3}
                                />
                              </FormControl>
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
                                onClick={() => document.getElementById('customer-photo-upload')?.click()}
                                className="flex items-center gap-2"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Adicionar Fotos
                              </Button>
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="hidden"
                                id="customer-photo-upload"
                              />
                            </div>
                          </div>
                          <PhotoUpload
                            photos={currentCustomerPhotos}
                            onPhotoUploaded={() => fetchCustomerPhotos(editingCustomer?.id)}
                            customerId={editingCustomer?.id}
                            maxPhotos={7}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-4 pt-6 border-t border-slate-200 mt-6">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsModalOpen(false)}
                          disabled={createMutation.isPending || updateMutation.isPending}
                          className="h-11 px-6 border-2 border-slate-300 hover:border-slate-400 rounded-lg font-semibold transition-all duration-200"
                        >
                          Cancelar
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createMutation.isPending || updateMutation.isPending}
                          className="h-11 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl rounded-lg font-semibold transition-all duration-200"
                        >
                          {createMutation.isPending || updateMutation.isPending 
                            ? "Processando..." 
                            : (editingCustomer ? "Atualizar Cliente" : "Criar Cliente")
                          }
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {isLoading ? (
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
            ) : filteredCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="bg-gradient-to-br from-teal-100 to-emerald-100 p-6 rounded-full mb-6 w-24 h-24 flex items-center justify-center">
                  <User className="h-12 w-12 text-teal-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Nenhum cliente encontrado
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm ? 'Tente ajustar os termos de busca.' : 'Comece adicionando seu primeiro cliente.'}
                </p>
                {!searchTerm && (
                  <Button
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    onClick={() => {
                      setEditingCustomer(null);
                      form.reset();
                      setIsModalOpen(true);
                      setCurrentCustomerPhotos([]);
                    }}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Adicionar Primeiro Cliente
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCustomers.map((customer: Customer) => (
                  <div key={customer.id} className={cn(
                      "group relative bg-white shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-teal-200 overflow-hidden",
                      isMobile ? "rounded-lg" : "rounded-2xl"
                    )}>
                      {/* Background gradient sutil */}
                      <div className="absolute inset-0 bg-gradient-to-br from-teal-50/30 to-emerald-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Header colorido */}
                      <div className={cn(
                        "relative bg-gradient-to-r from-teal-500 to-emerald-600 flex items-center justify-between",
                        isMobile ? "h-16 p-3" : "h-20 p-4"
                      )}>
                        <div className={cn("flex items-center", isMobile ? "space-x-2" : "space-x-3")}>
                          <div className={cn(
                            "bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white font-bold border border-white/30",
                            isMobile ? "w-10 h-10 text-sm" : "w-12 h-12 text-lg"
                          )}>
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className={cn(
                              "text-white font-semibold truncate",
                              isMobile ? "max-w-24 text-sm" : "max-w-32"
                            )}>
                              {customer.name}
                            </h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={cn(
                                "text-teal-100 bg-white/20 px-2 py-0.5 rounded-full",
                                isMobile ? "text-xs" : "text-xs"
                              )}>
                                #{customer.code}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions no header */}
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(customer)}
                            className="h-8 w-8 p-0 text-white hover:bg-white/20 border-0"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(customer.id)}
                            className="h-8 w-8 p-0 text-white hover:bg-red-500/20 border-0"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Conteúdo */}
                      <div className={cn("relative", isMobile ? "p-3" : "p-5")}>
                        {/* Tipo de documento */}
                        <div className={cn(isMobile ? "mb-2" : "mb-4")}>
                          <span className={cn(
                            "inline-flex items-center rounded-full font-medium bg-emerald-100 text-emerald-800",
                            isMobile ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-xs"
                          )}>
                            {customer.documentType?.toUpperCase()}
                          </span>
                        </div>

                        {/* Informações essenciais */}
                        <div className={cn("space-y-2", isMobile ? "mb-3" : "space-y-3 mb-6")}>
                          <div className="flex items-center text-sm">
                            <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center mr-3">
                              <User className="h-3 w-3 text-gray-500" />
                            </div>
                            <span className="text-gray-900 text-xs font-mono">
                              {customer.documentType === 'cpf' ? formatCPF(customer.document) : formatCNPJ(customer.document)}
                            </span>
                          </div>

                          {customer.email && (
                            <div className="flex items-center text-sm">
                              <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center mr-3">
                                <span className="text-gray-500 text-xs">@</span>
                              </div>
                              <span className="text-gray-700 text-xs truncate" title={customer.email}>
                                {customer.email}
                              </span>
                            </div>
                          )}

                          {customer.phone && (
                            <div className="flex items-center text-sm">
                              <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center mr-3">
                                <span className="text-gray-500 text-xs">📱</span>
                              </div>
                              <span className="text-gray-700 text-xs font-mono">
                                {customer.phone}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Ações */}
                        <div className={cn(isMobile ? "space-y-2" : "space-y-2")}>
                          <Button
                            onClick={() => setLocation(`/vehicles?customerId=${customer.id}`)}
                            className={cn(
                              "w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-sm rounded-xl",
                              isMobile ? "h-8 text-xs" : "h-10"
                            )}
                            size="sm"
                          >
                            <Car className={cn(isMobile ? "h-3 w-3 mr-1" : "h-4 w-4 mr-2")} />
                            Veículos
                          </Button>

                          <div className={cn("grid gap-1", isMobile ? "grid-cols-3 gap-1" : "grid-cols-3 gap-2")}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLocation(`/services?customerId=${customer.id}`)}
                              className={cn(
                                "border-teal-200 text-teal-700 hover:bg-teal-50 rounded-xl",
                                isMobile ? "h-7 px-1" : "h-9"
                              )}
                            >
                              <Wrench className={cn(isMobile ? "h-2.5 w-2.5" : "h-3 w-3 mr-1")} />
                              {!isMobile && <span className="text-xs">Serviços</span>}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                                                            onClick={() => handleViewPhotos(customer)}
                              className={cn(
                                "border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl",
                                isMobile ? "h-7 px-1" : "h-9"
                              )}
                            >
                              <Camera className={cn(isMobile ? "h-2.5 w-2.5" : "h-3 w-3 mr-1")} />
                              {!isMobile && <span className="text-xs">Fotos</span>}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(customer)}
                              className={cn(
                                "border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl",
                                isMobile ? "h-7 px-1" : "h-9"
                              )}
                            >
                              <Edit className={cn(isMobile ? "h-2.5 w-2.5" : "h-3 w-3 mr-1")} />
                              {!isMobile && <span className="text-xs">Editar</span>}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                ))}
              </div>
            )}

            {/* Analytics Modal */}
            <Dialog open={isAnalyticsModalOpen} onOpenChange={setIsAnalyticsModalOpen}>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Relatório de Clientes
                  </DialogTitle>
                </DialogHeader>
                <CustomerAnalytics />
              </DialogContent>
            </Dialog>

            {/* Photos Modal */}
            <Dialog open={isPhotosModalOpen} onOpenChange={setIsPhotosModalOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    <Camera className="h-5 w-5 mr-2" />
                    Fotos - {selectedCustomerForPhotos?.name}
                  </DialogTitle>
                </DialogHeader>
                {selectedCustomerForPhotos && (
                  <PhotoGallery 
                    customerId={selectedCustomerForPhotos.id}
                    title="Fotos do Cliente"
                    showAddButton={true}
                  />
                )}
              </DialogContent>
            </Dialog>

            {/* Camera Capture Modal */}
            <CameraCapture
              isOpen={isCameraOpen}
              onClose={() => setIsCameraOpen(false)}
              onPhotoTaken={handlePhotoTaken}
              customerId={editingCustomer?.id}
            />
          </div>
        </main>
      </div>
    </div>
  );
}