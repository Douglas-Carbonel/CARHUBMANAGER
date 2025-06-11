The requested changes involve updating import statements to include new mask functions and applying these masks to input fields in a React component.
```

```replit_final_file
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, User, FileText, Car } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema, type Customer } from "@shared/schema";
import { z } from "zod";
import { formatCPF, formatCNPJ, applyCPFMask, applyCNPJMask, applyPhoneMask } from "@/lib/cpf-cnpj";

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

const customerFormSchema = insertCustomerSchema;
type CustomerFormData = z.infer<typeof customerFormSchema>;



export default function CustomersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

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
      const res = await apiRequest("POST", "/api/customers", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setIsModalOpen(false);
      setEditingCustomer(null);
      form.reset();
      toast({
        title: "Cliente criado",
        description: "Cliente foi criado com sucesso.",
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
    mutationFn: async ({ id, data }: { id: number; data: CustomerFormData }) => {
      const res = await apiRequest("PUT", `/api/customers/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setIsModalOpen(false);
      setEditingCustomer(null);
      form.reset();
      toast({
        title: "Cliente atualizado",
        description: "Cliente foi atualizado com sucesso.",
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
      await apiRequest("DELETE", `/api/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
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

  const onSubmit = (data: CustomerFormData) => {
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    form.reset({
      code: customer.code,
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      document: customer.document,
      documentType: customer.documentType as "cpf" | "cnpj",
      address: customer.address || "",
      observations: customer.observations || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover este cliente?")) {
      deleteMutation.mutate(id);
    }
  };



  const filteredCustomers = customers.filter((customer: Customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.document.includes(searchTerm) ||
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
          subtitle="Gerencie seus clientes"
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
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
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
                                <Input placeholder="Código do cliente" {...field} />
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
                                <Input placeholder="Nome completo" {...field} />
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
                                <Input placeholder="email@exemplo.com" type="email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefone</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="(11) 99999-9999" 
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(applyPhoneMask(e.target.value));
                                  }}
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
                        <FormField
                          control={form.control}
                          name="document"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Documento</FormLabel>
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
                            <FormItem className="col-span-2">
                              <FormLabel>Endereço</FormLabel>
                              <FormControl>
                                <Input placeholder="Endereço completo" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="observations"
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Observações</FormLabel>
                              <FormControl>
                                <Input placeholder="Observações adicionais" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-end gap-4 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsModalOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          type="submit" 
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
                <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-6 rounded-full mb-6 w-24 h-24 flex items-center justify-center">
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
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    onClick={() => {
                      setEditingCustomer(null);
                      form.reset();
                      setIsModalOpen(true);
                    }}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Adicionar Primeiro Cliente
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCustomers.map((customer: Customer) => (
                  <Card key={customer.id} className="group hover:shadow-xl transition-all duration-300 bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:-translate-y-1">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                              {customer.name}
                            </CardTitle>
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className="text-xs">
                                {customer.documentType?.toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {customer.code}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        {/*Edit and delete icons*/}
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(customer)}
                            className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(customer.id)}
                            className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <span className="font-medium min-w-0 flex-1">
                            {formatCPF(customer.document)}
                          </span>
                        </div>
                        {customer.email && (
                          <div className="flex items-center">
                            <span className="min-w-0 flex-1 truncate">{customer.email}</span>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center">
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        {customer.address && (
                          <div className="flex items-center">
                            <span className="truncate">{customer.address}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLocation(`/vehicles?customerId=${customer.id}`)}
                          className="flex items-center space-x-1 text-xs hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                        >
                          <Car className="h-3 w-3" />
                          <span>Veículos</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLocation(`/reports?type=customer&customerId=${customer.id}`)}
                          className="flex items-center space-x-1 text-xs hover:bg-green-50 hover:text-green-600 hover:border-green-300"
                        >
                          <FileText className="h-3 w-3" />
                          <span>Relatório</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}