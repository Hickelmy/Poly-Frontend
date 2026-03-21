import React, { useState, useEffect, useRef } from 'react';
import { polysApi } from '@/api/polysClient';
import ZonePublishSelector from '@/components/shared/ZonePublishSelector';
import { useQueryClient } from '@tanstack/react-query';
import { MapPin, Upload, X, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import CurrencyInput from '../shared/CurrencyInput';
import AvailabilityPicker from '../shared/AvailabilityPicker';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const locationIcon = new L.DivIcon({
  className: 'location-marker',
  html: `<div style="
    background: #14b8a6;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 0 0 2px #14b8a6, 0 2px 8px rgba(20,184,166,0.5);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

interface LocationMapProps {
  lat: number;
  lng: number;
}

function LocationMap({ lat, lng }: LocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circlesRef = useRef<L.Circle[]>([]);

  useEffect(() => {
    if (!lat || !lng || !mapContainerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        scrollWheelZoom: false,
      }).setView([lat, lng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      mapRef.current = map;
    }

    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 13);
    }

    if (markerRef.current) {
      mapRef.current!.removeLayer(markerRef.current);
    }

    markerRef.current = L.marker([lat, lng], { icon: locationIcon }).addTo(mapRef.current!);

    circlesRef.current.forEach(circle => {
      if (mapRef.current) {
        mapRef.current.removeLayer(circle);
      }
    });
    circlesRef.current = [];

    const circle500m = L.circle([lat, lng], {
      radius: 500,
      color: '#22c55e',
      fillColor: '#22c55e',
      fillOpacity: 0.1,
      weight: 2
    }).addTo(mapRef.current!);

    const circle1km = L.circle([lat, lng], {
      radius: 1000,
      color: '#16a34a',
      fillColor: '#16a34a',
      fillOpacity: 0.08,
      weight: 2
    }).addTo(mapRef.current!);

    const circle1_5km = L.circle([lat, lng], {
      radius: 1500,
      color: '#15803d',
      fillColor: '#15803d',
      fillOpacity: 0.06,
      weight: 2
    }).addTo(mapRef.current!);

    circlesRef.current = [circle500m, circle1km, circle1_5km];

    return () => {
      if (markerRef.current && mapRef.current) {
        mapRef.current.removeLayer(markerRef.current);
      }
      circlesRef.current.forEach(circle => {
        if (mapRef.current) {
          mapRef.current.removeLayer(circle);
        }
      });
    };
  }, [lat, lng]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  if (!lat || !lng) return null;

  return (
    <div className="w-full h-48 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
      <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}

interface CreateServiceModalProps {
  open: boolean;
  onClose: () => void;
  service?: any;
  user?: any;
  onSuccess?: () => void;
}

interface FormData {
  title: string;
  description: string;
  price_per_hour: string | number;
  price_per_day: string | number;
  price_per_service: string | number;
  service_type: string;
  images: string[];
  lat: number | null;
  lng: number | null;
  availability_schedule: any;
  zone_id: string;
}

export default function CreateServiceModal({ open, onClose, service, user, onSuccess }: CreateServiceModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    price_per_hour: '',
    price_per_day: '',
    price_per_service: '',
    service_type: '',
    images: [],
    lat: null,
    lng: null,
    availability_schedule: null,
    zone_id: '',
  });
  const [uploading, setUploading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [gettingLocation, setGettingLocation] = useState<boolean>(false);

  const roundCoordinate = (coord: number): number => {
    return Math.round(coord * 1000) / 1000;
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Seu navegador não suporta geolocalização');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = roundCoordinate(position.coords.latitude);
        const lng = roundCoordinate(position.coords.longitude);
        setFormData(prev => ({ ...prev, lat, lng }));
        toast.success('Localização capturada com sucesso');
        setGettingLocation(false);
      },
      (error) => {
        console.error('Erro ao obter localização:', error);
        toast.error('Não foi possível obter sua localização. Verifique as permissões do navegador.');
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    if (service) {
      setFormData({
        title: service.title || '',
        description: service.description || '',
        price_per_hour: service.price_per_hour?.toString() || '',
        price_per_day: service.price_per_day?.toString() || '',
        price_per_service: service.price_per_service?.toString() || '',
        service_type: service.service_type || '',
        images: service.images || [],
        lat: service.lat || null,
        lng: service.lng || null,
        availability_schedule: service.availability_schedule || null
      });
    } else {
      setFormData({
        title: '',
        description: '',
        price_per_hour: '',
        price_per_day: '',
        price_per_service: '',
        service_type: '',
        images: [],
        lat: null,
        lng: null,
        availability_schedule: null
      });
    }
  }, [service, open]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato de imagem não suportado. Use JPG, JPEG, PNG, WEBP ou GIF.');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await polysApi.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, images: [...prev.images, file_url] }));
    } catch (err) {
      toast.error('Erro ao fazer upload da imagem');
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!formData.title) {
      toast.error('Preencha o título do serviço');
      return;
    }

    const hasPrice = formData.price_per_hour || formData.price_per_day || formData.price_per_service;
    if (!hasPrice) {
      toast.error('Preencha pelo menos um tipo de preço (por hora, por dia ou por serviço)');
      return;
    }

    if (!formData.lat || !formData.lng) {
      toast.error('Capture a localização aproximada do serviço');
      return;
    }

    if (!user) {
      toast.error('Faça login para criar um serviço');
      return;
    }

    setSaving(true);
    try {
      const fullData = {
        ...formData,
        price_per_hour: formData.price_per_hour ? parseFloat(String(formData.price_per_hour)) : null,
        price_per_day: formData.price_per_day ? parseFloat(String(formData.price_per_day)) : null,
        price_per_service: formData.price_per_service ? parseFloat(String(formData.price_per_service)) : null,
        provider_id: user.id,
        provider_email: user.email,
        provider_name: user.full_name,
        zone_id: formData.zone_id || null,
        lat: formData.lat,
        lng: formData.lng,
        active: true,
        availability_schedule: formData.availability_schedule || null
      };

      if (service) {
        const changed: Record<string, any> = {};
        const prevPriceHour = service.price_per_hour ?? service.pricePerHour ?? null;
        const prevPriceDay = service.price_per_day ?? service.pricePerDay ?? null;
        const prevPriceService = service.price_per_service ?? service.pricePerService ?? null;
        const prevServiceType = (service.service_type ?? service.serviceType) || '';
        const prevAvailability = service.availability_schedule ?? null;
        if (fullData.title !== (service.title || '')) changed.title = fullData.title;
        if (fullData.description !== (service.description || '')) changed.description = fullData.description;
        if (fullData.price_per_hour !== prevPriceHour) changed.price_per_hour = fullData.price_per_hour;
        if (fullData.price_per_day !== prevPriceDay) changed.price_per_day = fullData.price_per_day;
        if (fullData.price_per_service !== prevPriceService) changed.price_per_service = fullData.price_per_service;
        if (fullData.service_type !== prevServiceType) changed.service_type = fullData.service_type;
        if (JSON.stringify(fullData.images || []) !== JSON.stringify(service.images || [])) changed.images = fullData.images;
        if (fullData.lat !== (service.lat != null ? service.lat : null)) changed.lat = fullData.lat;
        if (fullData.lng !== (service.lng != null ? service.lng : null)) changed.lng = fullData.lng;
        if (JSON.stringify(fullData.availability_schedule) !== JSON.stringify(prevAvailability)) changed.availability_schedule = fullData.availability_schedule;
        const payload = Object.keys(changed).length > 0 ? changed : fullData;
        await polysApi.entities.Service.update(service.id, payload);
        toast.success('Serviço atualizado');
      } else {
        await polysApi.entities.Service.create(fullData);
        toast.success('Serviço criado');
      }

      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['sellerServices'] });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error('Erro ao salvar serviço');
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl">{service ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="w-4 h-4 text-teal-600" />
                  Localização Aproximada *
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={formData.lat && formData.lng ? "outline" : "default"}
                    onClick={handleGetLocation}
                    disabled={gettingLocation}
                    className={!formData.lat || !formData.lng ? "border-amber-500 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-500/50 dark:hover:bg-amber-900/30 dark:text-amber-200" : ""}
                  >
                    {gettingLocation ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Capturando...
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4 mr-2" />
                        {formData.lat && formData.lng ? 'Atualizar Localização' : 'Capturar Localização'}
                      </>
                    )}
                  </Button>
                  {formData.lat && formData.lng && (
                    <div className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-medium">Localização capturada</span>
                        <br />
                        <span className="text-xs">
                          Lat: {formData.lat.toFixed(3)}, Lng: {formData.lng.toFixed(3)}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  A localização é aproximada para preservar sua privacidade. Será usada para filtrar serviços próximos aos clientes.
                </p>
                {formData.lat && formData.lng && open && (
                  <div className="mt-3">
                    <LocationMap lat={formData.lat} lng={formData.lng} />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      Círculos verdes mostram a área de alcance: 500m, 1km e 1.5km
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Título *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Nome do serviço"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva seu serviço"
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Tipo de Serviço</Label>
                <Select value={formData.service_type} onValueChange={(v) => setFormData({ ...formData, service_type: v })}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="limpeza">Limpeza</SelectItem>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                    <SelectItem value="jardinagem">Jardinagem</SelectItem>
                    <SelectItem value="eletrica">Elétrica</SelectItem>
                    <SelectItem value="encanamento">Encanamento</SelectItem>
                    <SelectItem value="pintura">Pintura</SelectItem>
                    <SelectItem value="aulas">Aulas</SelectItem>
                    <SelectItem value="cuidados">Cuidados</SelectItem>
                    <SelectItem value="transporte">Transporte</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div>
                  <Label className="text-sm font-semibold">Preços do Serviço</Label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Preencha pelo menos um tipo de preço
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Preço por Hora (opcional)</Label>
                    <CurrencyInput
                      value={formData.price_per_hour}
                      onChange={(value: any) => setFormData({ ...formData, price_per_hour: value })}
                      placeholder="0,00"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Preço por Dia (opcional)</Label>
                    <CurrencyInput
                      value={formData.price_per_day}
                      onChange={(value: any) => setFormData({ ...formData, price_per_day: value })}
                      placeholder="0,00"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Preço por Serviço (opcional)</Label>
                    <CurrencyInput
                      value={formData.price_per_service}
                      onChange={(value: any) => setFormData({ ...formData, price_per_service: value })}
                      placeholder="0,00"
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Imagens do Serviço</Label>
                {formData.images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {formData.images.map((img, i) => (
                      <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-slate-200 dark:border-slate-700">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => setFormData({ ...formData, images: formData.images.filter((_, j) => j !== i) })}
                          className="absolute top-2 right-2 w-7 h-7 bg-red-500/90 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <label className="aspect-square border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      {uploading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-slate-400 mb-1" />
                          <span className="text-xs text-slate-500">Adicionar</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp,.gif"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <label className="block aspect-video border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    {uploading ? (
                      <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-sm text-slate-500">Clique para adicionar imagens</span>
                        <span className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP ou GIF</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.gif"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Horários de Disponibilidade</Label>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-800/30">
                  <AvailabilityPicker
                    value={formData.availability_schedule}
                    onChange={(schedule: any) => setFormData({ ...formData, availability_schedule: schedule })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-slate-50 dark:bg-slate-900/50 space-y-4">
          <ZonePublishSelector value={formData.zone_id} onChange={(z) => setFormData({ ...formData, zone_id: z })} />
          <Button
            className="w-full bg-teal-600 hover:bg-teal-700 h-11 text-base font-semibold"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              service ? 'Salvar Alterações' : 'Criar Serviço'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
