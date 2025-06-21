
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, CreditCard, Banknote, FileText, Smartphone } from "lucide-react";

// Utility functions for currency formatting (same as service-extras)
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

interface PaymentMethod {
  type: 'pix' | 'dinheiro' | 'cheque' | 'cartao';
  value: string;
  formattedValue: string;
}

interface PaymentManagerProps {
  totalValue: number;
  currentPaidValue: number;
  onPaymentChange: (newPaidValue: number) => void;
}

export default function PaymentManager({ totalValue, currentPaidValue, onPaymentChange }: PaymentManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [payments, setPayments] = useState<PaymentMethod[]>([
    { type: 'pix', value: '', formattedValue: '' },
    { type: 'dinheiro', value: '', formattedValue: '' },
    { type: 'cheque', value: '', formattedValue: '' },
    { type: 'cartao', value: '', formattedValue: '' }
  ]);

  // Initialize payments from current paid value
  useEffect(() => {
    if (currentPaidValue > 0 && payments.every(p => p.value === '')) {
      const formattedValue = formatCurrency((currentPaidValue * 100).toString());
      setPayments(prev => prev.map((p, index) => 
        index === 0 ? { 
          ...p, 
          value: currentPaidValue.toString(),
          formattedValue: formattedValue
        } : p
      ));
    }
  }, [currentPaidValue]);

  const getPaymentStatus = () => {
    const paidValue = currentPaidValue;
    if (paidValue === 0) {
      return { 
        label: "Pendente", 
        color: "text-red-600", 
        bgColor: "bg-red-100",
        iconColor: "text-red-600"
      };
    } else if (paidValue < totalValue) {
      return { 
        label: "Parcial", 
        color: "text-yellow-600", 
        bgColor: "bg-yellow-100",
        iconColor: "text-yellow-600"
      };
    } else {
      return { 
        label: "Concluído", 
        color: "text-green-600", 
        bgColor: "bg-green-100",
        iconColor: "text-green-600"
      };
    }
  };

  const calculateTotal = () => {
    return payments.reduce((sum, payment) => {
      const value = parseFloat(payment.value) || 0;
      return sum + value;
    }, 0);
  };

  const handlePaymentChange = (index: number, formattedValue: string) => {
    const newPayments = [...payments];
    const formatted = formatCurrency(formattedValue);
    const parsedValue = parseCurrency(formatted);
    
    newPayments[index].formattedValue = formatted;
    newPayments[index].value = parsedValue;
    setPayments(newPayments);
  };

  const handleSave = () => {
    const newTotal = calculateTotal();
    onPaymentChange(newTotal);
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    // Reset payments to current state
    const currentTotal = currentPaidValue;
    if (currentTotal > 0) {
      const formattedValue = formatCurrency((currentTotal * 100).toString());
      setPayments([
        { type: 'pix', value: currentTotal.toString(), formattedValue: formattedValue },
        { type: 'dinheiro', value: '', formattedValue: '' },
        { type: 'cheque', value: '', formattedValue: '' },
        { type: 'cartao', value: '', formattedValue: '' }
      ]);
    } else {
      setPayments([
        { type: 'pix', value: '', formattedValue: '' },
        { type: 'dinheiro', value: '', formattedValue: '' },
        { type: 'cheque', value: '', formattedValue: '' },
        { type: 'cartao', value: '', formattedValue: '' }
      ]);
    }
    setIsModalOpen(false);
  };

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case 'pix': return <Smartphone className="h-4 w-4" />;
      case 'dinheiro': return <Banknote className="h-4 w-4" />;
      case 'cheque': return <FileText className="h-4 w-4" />;
      case 'cartao': return <CreditCard className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getPaymentLabel = (type: string) => {
    switch (type) {
      case 'pix': return 'PIX';
      case 'dinheiro': return 'Dinheiro';
      case 'cheque': return 'Cheque';
      case 'cartao': return 'Cartão';
      default: return type;
    }
  };

  const status = getPaymentStatus();

  return (
    <>
      <div className="flex items-center justify-between mt-4 p-4 bg-slate-50 rounded-lg border">
        <div className="flex items-center space-x-3">
          <Label className="text-sm font-semibold text-slate-700">
            Total Pago:
          </Label>
          <span className="text-lg font-bold text-slate-800">
            R$ {currentPaidValue.toFixed(2)}
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className={`text-xs px-3 py-1 rounded-full ${status.bgColor} ${status.color} font-medium`}>
            {status.label}
          </div>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className={`h-10 w-10 p-0 rounded-full ${status.iconColor} hover:bg-slate-100 transition-all duration-200`}
            title="Gerenciar Pagamentos"
          >
            <DollarSign className="h-6 w-6" />
          </Button>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-slate-800">
              <DollarSign className="h-5 w-5 mr-2" />
              Gerenciar Pagamentos
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-emerald-700">Valor Total:</span>
                <span className="font-bold text-emerald-800">R$ {totalValue.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-3">
              {payments.map((payment, index) => (
                <Card key={payment.type} className="border border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
                          {getPaymentIcon(payment.type)}
                        </div>
                        <Label className="text-sm font-medium text-slate-700">
                          {getPaymentLabel(payment.type)}:
                        </Label>
                      </div>
                      
                      <div className="relative w-32">
                        <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-slate-500">
                          R$
                        </span>
                        <Input
                          type="text"
                          value={payment.formattedValue}
                          onChange={(e) => handlePaymentChange(index, e.target.value)}
                          className="text-right pl-8"
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-700">Total dos Pagamentos:</span>
                <span className="text-lg font-bold text-blue-800">
                  R$ {calculateTotal().toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
                Salvar Pagamentos
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
