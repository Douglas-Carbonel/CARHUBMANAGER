import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, MoreHorizontal, Plus, Search, Edit, Trash2, Clock, User, Car, Wrench, CheckCircle, XCircle, Timer, BarChart3, FileText, Camera, Coins, Calculator, Smartphone, Banknote, CreditCard, Receipt, Bell, Grid3X3, CalendarDays } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceSchema, type Service, type Customer, type Vehicle, type ServiceType, type Photo } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import ServiceAnalytics from "@/components/dashboard/service-analytics";
import { useLocation } from "wouter";
import PhotoUpload from "@/components/photos/photo-upload";
import CameraCapture from "@/components/camera/camera-capture";
import ServiceItems from "@/components/service/service-items";
import PaymentManager from "@/components/service/payment-manager";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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
