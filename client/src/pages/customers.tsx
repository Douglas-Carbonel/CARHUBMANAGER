import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Phone, Mail, Wrench, BarChart3, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema, type Customer } from "@shared/schema";
import { validateCPF, validateCNPJ, formatCPF, formatCNPJ } from "@/lib/cpf-cnpj";
import { z } from "zod";
import NewServiceModal from "@/components/modals/new-service-modal";
import { useLocation } from "wouter";

const customerFormSchema = insertCustomerSchema.extend({
  document: z.string().min(1, "Documento é obrigatório").refine((doc) => {
    const cleanDoc = doc.replace(/\D/g, '');
    return cleanDoc.length === 11 ? validateCPF(cleanDoc) : validateCNPJ(cleanDoc);
  }, "CPF ou CNPJ inválido")
});

export default function Customers() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isNewServiceModalOpen, setIsNewServiceModalOpen] = useState(false);
  const [selectedCustomerForService, setSelectedCustomerForService] = useState<Customer | null>(null);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const form = useForm<z.infer<typeof customerFormSchema>>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      code: "",
      document: "",
      documentType: "cpf",
      name: "",
      phone: "",
      email: "",
      address: "",
      observations: "",
    },
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/auth";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ["/api/customers"],
  });

  const createMutation = useMutation({
    mutationFn: async (customer: z.infer<typeof customerFormSchema>) => {
      return apiRequest("/api/customers", "POST", customer);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Cliente criado",
        description: "Cliente criado com sucesso",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao criar cliente",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (customer: z.infer<typeof customerFormSchema>) => {
      return apiRequest(`/api/customers/${editingCustomer?.id}`, "PATCH", customer);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setIsDialogOpen(false);
      form.reset();
      setEditingCustomer(null);
      toast({
        title: "Cliente atualizado",
        description: "Cliente atualizado com sucesso",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao atualizar cliente",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/customers/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Cliente excluído",
        description: "Cliente excluído com sucesso",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao excluir cliente",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof customerFormSchema>) => {
    if (editingCustomer) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    form.reset({
      code: customer.code,
      document: customer.document,
      documentType: customer.documentType,
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      observations: customer.observations || "",
    });
    setIsDialogOpen(true);
  };

  const handleNewServiceForCustomer = (customer: Customer) => {
    setSelectedCustomerForService(customer);
    setIsNewServiceModalOpen(true);
  };

  const handleViewReport = (customer: Customer) => {
    setLocation(`/reports?customerId=${customer.id}`);
  };

  const formatDocument = (document: string, type: string) => {
    const cleanDoc = document.replace(/\D/g, '');
    return type === 'cpf' ? formatCPF(cleanDoc) : formatCNPJ(cleanDoc);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const filteredCustomers = customers?.filter((customer: Customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.document.includes(searchTerm) ||
    customer.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm)
  ) || [];

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Gestão de Clientes" 
          subtitle="Gerencie clientes, dados de contato e histórico de serviços" 
        />

        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-white/80 via-blue-50/50 to-indigo-50/30 backdrop-blur-sm">
          <div className="p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Buscar clientes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 w-80 h-12 border-2 border-gray-200 focus:border-blue-400 rounded-xl shadow-sm bg-white/80"
                />
              </div>
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg shadow-md">
                <span className="font-semibold">{filteredCustomers.length}</span>
                <span className="ml-1 text-sm">clientes</span>
              </div>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg h-12 px-6 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
                    onClick={() => {
                      setEditingCustomer(null);
                      form.reset();
                    }}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Novo Cliente
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCustomer ? "Editar Cliente" : "Novo Cliente"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Código</FormLabel>
                              <FormControl>
                                <Input placeholder="CLI001" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="documentType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Documento</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
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
                      </div>

                      <FormField
                        control={form.control}
                        name="document"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {form.watch("documentType") === "cpf" ? "CPF" : "CNPJ"}
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder={form.watch("documentType") === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"} 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome do cliente" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefone</FormLabel>
                              <FormControl>
                                <Input placeholder="(11) 99999-9999" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="email@exemplo.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Endereço</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Endereço completo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="observations"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Observações</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Observações sobre o cliente" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          type="submit"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={createMutation.isPending || updateMutation.isPending}
                        >
                          {editingCustomer ? "Atualizar" : "Criar"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {customersLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCustomers.map((customer: Customer) => (
                    <Card key={customer.id} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-white/90 backdrop-blur-sm hover:bg-white/95 hover:scale-[1.02]">
                      <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 via-blue-50 to-gray-50 rounded-t-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center mb-3">
                              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl mr-4 shadow-lg">
                                <User className="h-6 w-6 text-white" />
                              </div>
                              <div>
                                <CardTitle className="text-xl font-bold text-gray-900 mb-1">{customer.name}</CardTitle>
                                <div className="flex items-center space-x-2">
                                  <Badge className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border-blue-200 font-medium">
                                    {customer.code}
                                  </Badge>
                                  <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200 font-medium">
                                    {formatDocument(customer.document, customer.documentType)}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col space-y-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleNewServiceForCustomer(customer)}
                              className="h-10 w-10 p-0 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 hover:from-green-200 hover:to-emerald-200 border border-green-200 shadow-md group-hover:scale-110 transition-all duration-200"
                              title="Novo serviço para este cliente"
                            >
                              <Wrench className="h-4 w-4 text-green-700" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewReport(customer)}
                              className="h-10 w-10 p-0 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 border border-purple-200 shadow-md group-hover:scale-110 transition-all duration-200"
                              title="Ver relatório do cliente"
                            >
                              <BarChart3 className="h-4 w-4 text-purple-700" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(customer)}
                              className="h-10 w-10 p-0 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 hover:from-blue-200 hover:to-cyan-200 border border-blue-200 shadow-md group-hover:scale-110 transition-all duration-200"
                              title="Editar cliente"
                            >
                              <Edit className="h-4 w-4 text-blue-700" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteMutation.mutate(customer.id)}
                              className="h-10 w-10 p-0 rounded-xl bg-gradient-to-br from-red-100 to-pink-100 hover:from-red-200 hover:to-pink-200 border border-red-200 shadow-md group-hover:scale-110 transition-all duration-200"
                              title="Excluir cliente"
                            >
                              <Trash2 className="h-4 w-4 text-red-700" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          {customer.phone && (
                            <div className="flex items-center bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
                              <div className="bg-green-100 p-2 rounded-lg mr-3">
                                <Phone className="h-4 w-4 text-green-600" />
                              </div>
                              <span className="text-sm font-medium text-gray-800">{customer.phone}</span>
                            </div>
                          )}
                          {customer.email && (
                            <div className="flex items-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
                              <div className="bg-blue-100 p-2 rounded-lg mr-3">
                                <Mail className="h-4 w-4 text-blue-600" />
                              </div>
                              <span className="text-sm font-medium text-gray-800 truncate">{customer.email}</span>
                            </div>
                          )}
                          {customer.observations && (
                            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-3 border border-amber-100">
                              <p className="text-sm font-medium text-amber-800">
                                {customer.observations}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {filteredCustomers.length === 0 && !customersLoading && (
                  <div className="p-6">
                    <Card className="border-dashed border-2 border-gray-300 bg-white/50 backdrop-blur-sm">
                      <CardContent className="text-center py-16">
                        <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-6 rounded-full mx-auto mb-6 w-24 h-24 flex items-center justify-center">
                          <User className="h-12 w-12 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">
                          Nenhum cliente encontrado
                        </h3>
                        <p className="text-gray-600 mb-6">
                          {searchTerm ? 'Tente ajustar os termos de busca.' : 'Comece adicionando seu primeiro cliente.'}
                        </p>
                        {!searchTerm && (
                          <Button
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg"
                            onClick={() => {
                              setEditingCustomer(null);
                              form.reset();
                              setIsDialogOpen(true);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar Primeiro Cliente
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      <NewServiceModal
        isOpen={isNewServiceModalOpen}
        onClose={() => {
          setIsNewServiceModalOpen(false);
          setSelectedCustomerForService(null);
        }}
      />
    </div>
  );
}