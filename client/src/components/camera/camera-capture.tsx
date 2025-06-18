
import React, { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, X, RotateCcw, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoTaken: (photoData: {
    customerId?: number;
    vehicleId?: number;
    serviceId?: number;
    category: string;
    description?: string;
  }) => void;
  customerId?: number;
  vehicleId?: number;
  serviceId?: number;
}

export default function CameraCapture({
  isOpen,
  onClose,
  onPhotoTaken,
  customerId,
  vehicleId,
  serviceId
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [category, setCategory] = useState('other');
  const [description, setDescription] = useState('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const { toast } = useToast();

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreamActive(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Erro de câmera",
        description: "Não foi possível acessar a câmera. Verifique as permissões.",
        variant: "destructive",
      });
    }
  }, [facingMode, toast]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreamActive(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(dataUrl);
    stopCamera();
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const switchCamera = useCallback(() => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    if (isStreamActive) {
      startCamera();
    }
  }, [facingMode, isStreamActive, startCamera]);

  const handleSavePhoto = useCallback(async () => {
    if (!capturedImage) return;

    try {
      // Convert data URL to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      // Create form data
      const formData = new FormData();
      formData.append('photo', blob, `photo_${Date.now()}.jpg`);
      if (customerId) formData.append('customerId', customerId.toString());
      if (vehicleId) formData.append('vehicleId', vehicleId.toString());
      if (serviceId) formData.append('serviceId', serviceId.toString());
      formData.append('category', category);
      if (description) formData.append('description', description);

      // Upload photo
      const uploadResponse = await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload photo');
      }

      const photo = await uploadResponse.json();
      
      onPhotoTaken({
        customerId,
        vehicleId,
        serviceId,
        category,
        description,
      });

      toast({
        title: "Foto salva",
        description: "A foto foi salva com sucesso.",
      });

      handleClose();
    } catch (error) {
      console.error('Error saving photo:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar a foto.",
        variant: "destructive",
      });
    }
  }, [capturedImage, customerId, vehicleId, serviceId, category, description, onPhotoTaken, toast]);

  const handleClose = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    setDescription('');
    setCategory('other');
    onClose();
  }, [stopCamera, onClose]);

  React.useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, capturedImage, startCamera, stopCamera]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto p-0 overflow-hidden">
        <DialogHeader className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <DialogTitle className="flex items-center">
            <Camera className="h-5 w-5 mr-2" />
            Capturar Foto
          </DialogTitle>
        </DialogHeader>

        <div className="p-4">
          {!capturedImage ? (
            <div className="space-y-4">
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {isStreamActive && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                    <Button
                      size="lg"
                      onClick={capturePhoto}
                      className="bg-white text-black hover:bg-gray-100 rounded-full w-16 h-16"
                    >
                      <Camera className="h-8 w-8" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={switchCamera}
                      className="bg-white/80 text-black rounded-full"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vehicle">Veículo</SelectItem>
                      <SelectItem value="service">Serviço</SelectItem>
                      <SelectItem value="damage">Dano</SelectItem>
                      <SelectItem value="before">Antes</SelectItem>
                      <SelectItem value="after">Depois</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva a foto..."
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={retakePhoto}
                  className="flex-1"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Capturar Novamente
                </Button>
                <Button
                  onClick={handleSavePhoto}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
