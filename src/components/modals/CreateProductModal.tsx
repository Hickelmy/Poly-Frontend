import React, { useState, useEffect, useRef } from 'react';
import { polysApi } from '@/api/polysClient';
import ZonePublishSelector from '@/components/shared/ZonePublishSelector';
import { useQueryClient } from '@tanstack/react-query';
import { MapPin, Upload, X, Loader2, Search, Bike, Car, TruckIcon, Container, Store, HandshakeIcon, CreditCard, Gift, Ticket, Plus, Trash2, Tag, Clock, Hash, Eye, Percent, Calculator, ShieldCheck } from 'lucide-react';
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

interface CreateProductModalProps {
  open: boolean;
  onClose: () => void;
  product?: any;
  user?: any;
  onSuccess?: () => void;
}

interface CouponData {
  code: string;
  discount_percent: string;
  max_uses: string;
  expires_in_days: string;
}

interface FormData {
  title: string;
  description: string;
  price: string;
  quantity_available: string;
  unit_type: string;
  weight_kg: string;
  category: string;
  condition: string;
  delivery_types: string[];
  shipping_paid_by: string;
  images: string[];
  lat: number | null;
  lng: number | null;
  discount_percent: string;
  payment_methods: string[];
  seller_delivery: boolean;
  zone_id: string;
  coupons: CouponData[];
  absorb_platform_fee: boolean;
  absorb_tax: boolean;
}

export default function CreateProductModal({ open, onClose, product, user, onSuccess }: CreateProductModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    price: '',
    quantity_available: '1',
    unit_type: 'unidade',
    weight_kg: '',
    category: '',
    condition: 'novo',
    delivery_types: [],
    shipping_paid_by: 'buyer',
    images: [],
    lat: null,
    lng: null,
    discount_percent: '',
    payment_methods: [],
    seller_delivery: false,
    zone_id: '',
    coupons: [],
    absorb_platform_fee: false,
    absorb_tax: false,
  });
  const [uploading, setUploading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [gettingLocation, setGettingLocation] = useState<boolean>(false);
  const [addressSearch, setAddressSearch] = useState<string>('');
  const [searchingAddress, setSearchingAddress] = useState<boolean>(false);
  const [couponDraft, setCouponDraft] = useState<CouponData>({ code: '', discount_percent: '', max_uses: '', expires_in_days: '' });
  const [showCouponPreview, setShowCouponPreview] = useState<boolean>(false);

  const roundCoordinate = (coord: number): number => {
    return Math.round(coord * 1000) / 1000;
  };

  const handleSearchAddress = async () => {
    if (!addressSearch.trim()) return;
    setSearchingAddress(true);
    try {
      const query = encodeURIComponent(addressSearch.trim());
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`, {
        headers: { 'Accept-Language': 'pt-BR' }
      });
      const data = await res.json();
      if (data.length === 0) {
        toast.error('Endereço não encontrado. Tente ser mais específico.');
        return;
      }
      const lat = roundCoordinate(parseFloat(data[0].lat));
      const lng = roundCoordinate(parseFloat(data[0].lon));
      setFormData(prev => ({ ...prev, lat, lng }));
      toast.success(`Localização encontrada: ${data[0].display_name.split(',').slice(0, 3).join(', ')}`);
    } catch {
      toast.error('Erro ao buscar endereço. Verifique sua conexão.');
    }
    setSearchingAddress(false);
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
    if (product) {
      setFormData({
        title: product.title || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        quantity_available: product.quantityAvailable?.toString() || '1',
        unit_type: product.unitType || 'unidade',
        weight_kg: product.weightKg?.toString() || '',
        category: product.category || '',
        condition: product.condition || 'novo',
        delivery_types: product.deliveryTypes || [],
        shipping_paid_by: product.shippingPaidBy || 'buyer',
        images: product.images || [],
        lat: product.lat || null,
        lng: product.lng || null,
        discount_percent: product.discountPercent?.toString() || '',
        payment_methods: product.paymentMethods || [],
        seller_delivery: product.sellerDelivery || false,
        coupons: (product.coupons || []).map((c: any) => ({
          code: c.code || '',
          discount_percent: c.discountPercent?.toString() || '',
          max_uses: c.maxUses?.toString() || '',
          expires_in_days: c.expiresInDays?.toString() || '',
        })),
        absorb_platform_fee: product.absorbPlatformFee || false,
        absorb_tax: product.absorbTax || false,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        price: '',
        quantity_available: '1',
        unit_type: 'unidade',
        weight_kg: '',
        category: '',
        condition: 'novo',
        delivery_types: [],
        shipping_paid_by: 'buyer',
        images: [],
        lat: null,
        lng: null,
        discount_percent: '',
        payment_methods: [],
        seller_delivery: false,
        coupons: [],
        absorb_platform_fee: false,
        absorb_tax: false,
      });
    }
  }, [product, open]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));

    if (invalidFiles.length > 0) {
      toast.error('Alguns arquivos têm formato não suportado');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const { file_url } = await polysApi.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }
      setFormData(prev => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
      if (files.length > 1) {
        toast.success(`${files.length} imagens adicionadas`);
      }
    } catch (err) {
      toast.error('Erro ao fazer upload das imagens');
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.price) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    if (!formData.lat || !formData.lng) {
      toast.error('Capture a localização aproximada do produto');
      return;
    }

    if (!user) {
      toast.error('Faça login para criar um produto');
      return;
    }

    setSaving(true);
    try {
      const fullData = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        quantityAvailable: parseFloat(formData.quantity_available),
        unitType: formData.unit_type,
        weightKg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
        deliveryTypes: formData.delivery_types,
        shippingPaidBy: formData.shipping_paid_by,
        category: formData.category,
        condition: formData.condition,
        images: formData.images,
        lat: formData.lat,
        lng: formData.lng,
        active: true,
        discountPercent: formData.discount_percent ? parseFloat(formData.discount_percent) : null,
        paymentMethods: formData.payment_methods,
        sellerDelivery: formData.seller_delivery,
        zone_id: formData.zone_id || null,
        coupons: formData.coupons.map(c => ({
          code: c.code,
          discountPercent: parseFloat(c.discount_percent),
          maxUses: c.max_uses ? parseInt(c.max_uses) : null,
          expiresInDays: c.expires_in_days ? parseInt(c.expires_in_days) : null,
        })),
        absorbPlatformFee: formData.absorb_platform_fee,
        absorbTax: formData.absorb_tax,
      };

      if (product) {
        const changed: Record<string, any> = {};
        if (fullData.title !== (product.title || '')) changed.title = fullData.title;
        if (fullData.description !== (product.description || '')) changed.description = fullData.description;
        if (fullData.price !== (product.price ?? 0)) changed.price = fullData.price;
        if (fullData.quantityAvailable !== (product.quantityAvailable ?? 0)) changed.quantityAvailable = fullData.quantityAvailable;
        if (fullData.unitType !== (product.unitType || 'unidade')) changed.unitType = fullData.unitType;
        if (fullData.weightKg !== (product.weightKg ?? null)) changed.weightKg = fullData.weightKg;
        if (JSON.stringify(fullData.deliveryTypes) !== JSON.stringify(product.deliveryTypes || [])) changed.deliveryTypes = fullData.deliveryTypes;
        if (fullData.shippingPaidBy !== (product.shippingPaidBy || 'buyer')) changed.shippingPaidBy = fullData.shippingPaidBy;
        if (fullData.category !== (product.category || '')) changed.category = fullData.category;
        if (fullData.condition !== (product.condition || '')) changed.condition = fullData.condition;
        if (JSON.stringify(fullData.images || []) !== JSON.stringify(product.images || [])) changed.images = fullData.images;
        if (fullData.lat !== (product.lat ?? null)) changed.lat = fullData.lat;
        if (fullData.lng !== (product.lng ?? null)) changed.lng = fullData.lng;
        if (fullData.discountPercent !== (product.discountPercent ?? null)) changed.discountPercent = fullData.discountPercent;
        if (JSON.stringify(fullData.paymentMethods) !== JSON.stringify(product.paymentMethods || [])) changed.paymentMethods = fullData.paymentMethods;
        if (fullData.sellerDelivery !== (product.sellerDelivery || false)) changed.sellerDelivery = fullData.sellerDelivery;
        const payload = Object.keys(changed).length > 0 ? changed : fullData;
        await polysApi.entities.Product.update(product.id, payload);
        toast.success('Produto atualizado');
      } else {
        await polysApi.entities.Product.create(fullData);
        toast.success('Produto criado');
      }

      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['sellerProducts'] });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error('Erro ao salvar produto');
    }
    setSaving(false);
  };

  const estimatedTotalWeightKg = (() => {
    const qty = parseFloat(formData.quantity_available) || 0;
    const unitW = parseFloat(formData.weight_kg) || null;
    if (formData.unit_type === 'kg') return qty;
    if (unitW) return qty * unitW;
    return null;
  })();

  const TRANSPORT_META: Record<string, { label: string; icon: React.ReactNode; cost: number; costLabel: string; desc: string; idealMax: number | null; warnAbove: number | null; warnBelow?: number; free?: boolean }> = {
    retirada:       { label: 'Retirada no Local',     icon: <Store className="w-5 h-5" />,         cost: 0, costLabel: 'Sem taxa',      desc: 'Comprador busca no endereço',   idealMax: null, warnAbove: null, free: true },
    entrega_propria:{ label: 'Entrega pelo Vendedor', icon: <HandshakeIcon className="w-5 h-5" />, cost: 0, costLabel: 'Sem taxa',      desc: 'Vendedor leva até o comprador', idealMax: null, warnAbove: null, free: true },
    moto:           { label: 'Motoboy',               icon: <Bike className="w-5 h-5" />,          cost: 1, costLabel: 'Econômico',     desc: 'Entregas rápidas e pequenas',   idealMax: 30,   warnAbove: 50 },
    carro:          { label: 'Carro',                 icon: <Car className="w-5 h-5" />,            cost: 2, costLabel: 'Moderado',      desc: 'Volumes médios',                idealMax: 100,  warnAbove: null },
    van:            { label: 'Van',                   icon: <TruckIcon className="w-5 h-5" />,      cost: 3, costLabel: 'Alto',          desc: 'Cargas maiores',                idealMax: 500,  warnAbove: null, warnBelow: 5 },
    caminhao:       { label: 'Caminhão',              icon: <Container className="w-5 h-5" />,      cost: 4, costLabel: 'Muito alto',   desc: 'Cargas pesadas ou grandes',     idealMax: null, warnAbove: null, warnBelow: 50 },
  };

  const getTransportWarning = (transportKey: string): string | null => {
    const meta = TRANSPORT_META[transportKey];
    const qty = parseFloat(formData.quantity_available) || 0;
    const totalKg = estimatedTotalWeightKg;

    if (transportKey === 'moto' && totalKg != null && totalKg > 50) {
      return `Carga estimada ~${totalKg.toFixed(0)}kg pode exceder a capacidade de um motoboy (max ~30kg).`;
    }
    if (transportKey === 'van' && qty > 0) {
      const isLight = totalKg != null && totalKg < 5;
      const isFew = formData.unit_type === 'unidade' && qty < 3;
      if (isLight || isFew) {
        const ref = totalKg != null ? `~${totalKg.toFixed(1)}kg` : `${qty} ${formData.unit_type}`;
        return `Van para ${ref} tem custo elevado — ideal para cargas acima de 50kg ou 10 volumes.`;
      }
    }
    if (transportKey === 'caminhao' && qty > 0) {
      const isLight = totalKg != null && totalKg < 50;
      const isFew = formData.unit_type === 'unidade' && qty < 20;
      if (isLight || isFew) {
        const ref = totalKg != null ? `~${totalKg.toFixed(0)}kg` : `${qty} ${formData.unit_type}`;
        return `Caminhão para ${ref} tem custo muito alto — ideal para cargas acima de 500kg ou fretes pesados.`;
      }
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl">{product ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <div className="space-y-4">
              <ZonePublishSelector value={formData.zone_id} onChange={(z) => setFormData({ ...formData, zone_id: z })} />

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="w-4 h-4 text-teal-600" />
                  Localização Aproximada *
                </Label>

                <div className="flex gap-2">
                  <Input
                    value={addressSearch}
                    onChange={(e) => setAddressSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchAddress()}
                    placeholder="Digite um endereço, cidade ou bairro..."
                    className="h-10"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSearchAddress}
                    disabled={searchingAddress || !addressSearch.trim()}
                    className="shrink-0 h-10"
                  >
                    {searchingAddress ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                  <span className="text-xs text-slate-400">ou</span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                </div>

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
                        {formData.lat && formData.lng ? 'Atualizar via GPS' : 'Capturar via GPS'}
                      </>
                    )}
                  </Button>
                  {formData.lat && formData.lng && (
                    <div className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-medium">Localização definida</span>
                        <br />
                        <span className="text-xs">Lat: {formData.lat.toFixed(3)}, Lng: {formData.lng.toFixed(3)}</span>
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  A localização é aproximada para preservar sua privacidade. Será usada para filtrar produtos próximos a você.
                </p>

                {formData.lat && formData.lng && open && (
                  <div className="mt-1">
                    <LocationMap lat={formData.lat} lng={formData.lng} />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Círculos verdes mostram a área de alcance: 500m, 1km e 1.5km
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Nome *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Nome do produto"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva seu produto"
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Categoria</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eletronicos">Eletrônicos</SelectItem>
                      <SelectItem value="moveis">Móveis</SelectItem>
                      <SelectItem value="vestuario">Vestuário</SelectItem>
                      <SelectItem value="alimentos">Alimentos</SelectItem>
                      <SelectItem value="artesanato">Artesanato</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Condição</Label>
                  <Select value={formData.condition} onValueChange={(v) => setFormData({ ...formData, condition: v })}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="novo">Novo</SelectItem>
                      <SelectItem value="usado_otimo">Usado - Ótimo</SelectItem>
                      <SelectItem value="usado_bom">Usado - Bom</SelectItem>
                      <SelectItem value="usado_regular">Usado - Regular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <Label className="text-sm font-semibold">Preço e Estoque</Label>
                <div className="space-y-2">
                  <Label className="text-xs">Preço *</Label>
                  <CurrencyInput
                    value={formData.price}
                    onChange={(value: any) => setFormData({ ...formData, price: value })}
                    placeholder="0,00"
                    className="h-9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">
                      {formData.unit_type === 'kg' ? 'Estoque (kg)' : formData.unit_type === 'litro' ? 'Estoque (L)' : 'Estoque (un)'}
                    </Label>
                    <Input
                      type="number"
                      value={formData.quantity_available}
                      onChange={(e) => setFormData({ ...formData, quantity_available: e.target.value })}
                      min="0"
                      step={formData.unit_type === 'unidade' ? '1' : '0.5'}
                      placeholder="0"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Tipo de unidade</Label>
                    <Select value={formData.unit_type} onValueChange={(v) => setFormData({ ...formData, unit_type: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unidade">Unidade</SelectItem>
                        <SelectItem value="kg">Quilograma (kg)</SelectItem>
                        <SelectItem value="litro">Litro (L)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {formData.unit_type !== 'kg' && (
                  <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-slate-600">
                    <Label className="text-xs flex items-center gap-1">
                      Peso por {formData.unit_type === 'litro' ? 'litro' : 'unidade'} (kg)
                      <span className="text-slate-400 font-normal">— opcional, ajuda a dimensionar o frete</span>
                    </Label>
                    <Input
                      type="number"
                      value={formData.weight_kg}
                      onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                      min="0"
                      step="0.1"
                      placeholder="ex: 0.5 para 500g, 2 para 2kg"
                      className="h-9"
                    />
                    {estimatedTotalWeightKg != null && estimatedTotalWeightKg > 0 && (
                      <p className="text-xs text-teal-600 dark:text-teal-400">
                        Peso total estimado do estoque: ~{estimatedTotalWeightKg >= 1000
                          ? `${(estimatedTotalWeightKg / 1000).toFixed(1)}t`
                          : `${estimatedTotalWeightKg.toFixed(1)}kg`}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Desconto e Cupons */}
              <div className="space-y-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Percent className="w-4 h-4 text-teal-600" />
                  Desconto e Cupons
                </Label>

                {/* Desconto geral */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Desconto geral (%)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      value={formData.discount_percent}
                      onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                      min="0"
                      max="100"
                      step="1"
                      placeholder="0"
                      className="h-9"
                    />
                    <div className="h-9 flex items-center px-3 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      {(() => {
                        const price = parseFloat(formData.price) || 0;
                        const disc = parseFloat(formData.discount_percent) || 0;
                        if (price <= 0) return <span className="text-xs text-slate-400">Defina o preço</span>;
                        if (disc <= 0) return <span className="text-xs text-slate-400">Sem desconto</span>;
                        const saved = price * disc / 100;
                        const final_price = price - saved;
                        const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
                        return (
                          <span className="text-xs">
                            <span className="text-red-400 line-through">{fmt(price)}</span>
                            {' '}
                            <span className="text-emerald-600 font-bold">{fmt(final_price)}</span>
                            {' '}
                            <span className="text-slate-400">(-{fmt(saved)})</span>
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">Visível para todos. Não acumula com cupons — vale o maior desconto.</p>
                </div>

                {/* Cupons */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-600 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Ticket className="w-3.5 h-3.5" />
                      Cupons de desconto
                    </Label>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Não acumulam entre si nem com o desconto geral</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Código</Label>
                      <Input
                        value={couponDraft.code}
                        onChange={(e) => setCouponDraft({ ...couponDraft, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                        placeholder="BRASIL25"
                        className="h-8 text-xs font-mono"
                        maxLength={20}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Desconto %</Label>
                      <Input
                        type="number"
                        value={couponDraft.discount_percent}
                        onChange={(e) => setCouponDraft({ ...couponDraft, discount_percent: e.target.value })}
                        placeholder="25"
                        min="1"
                        max="100"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] flex items-center gap-0.5"><Hash className="w-3 h-3" /> Usos</Label>
                      <Input
                        type="number"
                        value={couponDraft.max_uses}
                        onChange={(e) => setCouponDraft({ ...couponDraft, max_uses: e.target.value })}
                        placeholder="50"
                        min="1"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] flex items-center gap-0.5"><Clock className="w-3 h-3" /> Dias</Label>
                      <Input
                        type="number"
                        value={couponDraft.expires_in_days}
                        onChange={(e) => setCouponDraft({ ...couponDraft, expires_in_days: e.target.value })}
                        placeholder="30"
                        min="1"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={() => {
                      if (!couponDraft.code || !couponDraft.discount_percent) {
                        toast.error('Preencha código e % de desconto');
                        return;
                      }
                      if (formData.coupons.some(c => c.code === couponDraft.code)) {
                        toast.error('Já existe um cupom com esse código');
                        return;
                      }
                      setFormData({ ...formData, coupons: [...formData.coupons, { ...couponDraft }] });
                      setCouponDraft({ code: '', discount_percent: '', max_uses: '', expires_in_days: '' });
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Adicionar cupom
                  </Button>

                  {formData.coupons.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {formData.coupons.map((coupon, i) => {
                        const price = parseFloat(formData.price) || 0;
                        const generalDisc = parseFloat(formData.discount_percent) || 0;
                        const couponDisc = parseFloat(coupon.discount_percent) || 0;
                        // Non-cumulative: use the higher discount
                        const effectiveDisc = Math.max(generalDisc, couponDisc);
                        const saved = price * effectiveDisc / 100;
                        const finalPrice = price - saved;
                        const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
                        const isBetterThanGeneral = couponDisc > generalDisc;
                        return (
                          <div key={i} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/30 dark:to-emerald-900/30 border border-dashed border-teal-300 dark:border-teal-700">
                                <Ticket className="w-3.5 h-3.5 text-teal-600" />
                                <span className="font-mono text-xs font-bold text-teal-700 dark:text-teal-300">{coupon.code}</span>
                              </div>
                              <span className="text-xs font-bold text-emerald-600">-{coupon.discount_percent}%</span>
                              <div className="flex-1 flex items-center gap-2 text-[11px] text-slate-400">
                                {coupon.max_uses && <span>{coupon.max_uses} usos</span>}
                                {coupon.expires_in_days && <span>{coupon.expires_in_days} dias</span>}
                                {!coupon.max_uses && !coupon.expires_in_days && <span>Ilimitado</span>}
                              </div>
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, coupons: formData.coupons.filter((_, j) => j !== i) })}
                                className="text-red-400 hover:text-red-500 p-0.5"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {price > 0 && (
                              <div className="flex items-center gap-2 text-xs pl-1">
                                <span className="text-red-400 line-through">{fmt(price)}</span>
                                <span className="font-bold text-emerald-600">{fmt(finalPrice)}</span>
                                <span className="text-slate-400">(-{fmt(saved)})</span>
                                {generalDisc > 0 && !isBetterThanGeneral && (
                                  <span className="text-[10px] text-amber-500 ml-auto">Desconto geral ({generalDisc}%) já é maior</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Simulador de custos */}
              <div className="space-y-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-teal-600" />
                  Simulador de custos
                </Label>

                {(() => {
                  const price = parseFloat(formData.price) || 0;
                  if (price <= 0) return <p className="text-xs text-slate-400 italic">Defina um preço para ver a simulação</p>;

                  const discount = parseFloat(formData.discount_percent) || 0;
                  const discountValue = price * discount / 100;
                  const discountedPrice = price - discountValue;
                  const platformFeeRate = 0.05;
                  const taxRate = 0.03;
                  const hasPaidDelivery = formData.delivery_types.some(t => !['retirada', 'entrega_propria'].includes(t));
                  const shippingEstimate = hasPaidDelivery && formData.shipping_paid_by === 'seller' ? 12 : 0;
                  const platformFee = discountedPrice * platformFeeRate;
                  const tax = discountedPrice * taxRate;
                  const sellerReceives = discountedPrice - platformFee - tax - shippingEstimate;

                  const buyerShipping = hasPaidDelivery && formData.shipping_paid_by === 'buyer' ? 12 : 0;
                  const buyerPlatformFee = formData.absorb_platform_fee ? 0 : platformFee;
                  const buyerTax = formData.absorb_tax ? 0 : tax;
                  const buyerTotal = discountedPrice + buyerPlatformFee + buyerTax + buyerShipping;

                  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

                  return (
                    <div className="space-y-3">
                      {/* Vendedor recebe */}
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Vendedor recebe</p>
                        <div className="space-y-0.5 text-xs">
                          <div className="flex justify-between"><span className="text-slate-500">Preço base</span><span>{fmt(price)}</span></div>
                          {discount > 0 && (
                            <div className="flex justify-between text-emerald-600">
                              <span>Desconto {discount}%</span>
                              <span>-{fmt(discountValue)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-amber-600"><span>Taxa plataforma (5%)</span><span>-{fmt(platformFee)}</span></div>
                          <div className="flex justify-between text-amber-600"><span>Impostos (3%)</span><span>-{fmt(tax)}</span></div>
                          {shippingEstimate > 0 && (
                            <div className="flex justify-between text-amber-600"><span>Frete absorvido</span><span>-{fmt(shippingEstimate)}</span></div>
                          )}
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-600 font-bold text-sm">
                          <span className="text-slate-700 dark:text-slate-300">Líquido</span>
                          <span className={sellerReceives > 0 ? 'text-teal-600' : 'text-red-500'}>{fmt(Math.max(0, sellerReceives))}</span>
                        </div>
                      </div>

                      {/* Repassar encargos */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-600 space-y-1.5">
                        <p className="text-[11px] font-semibold text-slate-500">Repassar encargos ao comprador?</p>
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input type="checkbox" checked={formData.absorb_platform_fee} onChange={(e) => setFormData({ ...formData, absorb_platform_fee: e.target.checked })} className="rounded border-slate-300" />
                          <span className="text-slate-600 dark:text-slate-400">Comprador paga taxa da plataforma (5%)</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input type="checkbox" checked={formData.absorb_tax} onChange={(e) => setFormData({ ...formData, absorb_tax: e.target.checked })} className="rounded border-slate-300" />
                          <span className="text-slate-600 dark:text-slate-400">Comprador paga impostos (3%)</span>
                        </label>
                      </div>

                      {/* Comprador paga */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-600 space-y-1">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Comprador paga</p>
                        <div className="space-y-0.5 text-xs">
                          <div className="flex justify-between"><span className="text-slate-500">Produto</span><span>{fmt(discountedPrice)}</span></div>
                          {buyerPlatformFee > 0 && <div className="flex justify-between text-slate-500"><span>Taxa plataforma</span><span>+{fmt(buyerPlatformFee)}</span></div>}
                          {buyerTax > 0 && <div className="flex justify-between text-slate-500"><span>Impostos</span><span>+{fmt(buyerTax)}</span></div>}
                          {buyerShipping > 0 && <div className="flex justify-between text-slate-500"><span>Frete estimado</span><span>+{fmt(buyerShipping)}</span></div>}
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-600 font-bold text-sm">
                          <span className="text-slate-700 dark:text-slate-300">Total</span>
                          <span className="text-slate-800 dark:text-slate-200">{fmt(buyerTotal)}</span>
                        </div>
                        {buyerShipping > 0 && (
                          <p className="text-[10px] text-slate-400">Frete estimado — varia por distância. Cobrado uma vez por pedido.</p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Imagens do Produto</Label>
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
                      <input type="file" accept=".png,.jpg,.jpeg,.webp,.gif" onChange={handleImageUpload} className="hidden" multiple />
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
                    <input type="file" accept=".png,.jpg,.jpeg,.webp,.gif" onChange={handleImageUpload} className="hidden" multiple />
                  </label>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-semibold">Tipos de entrega disponíveis</Label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Selecione um ou mais meios que você aceita — pode combinar vários
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 overflow-x-auto pb-0.5">
                  <span className="shrink-0 text-emerald-500 font-medium flex items-center gap-0.5"><Store className="w-3 h-3 inline" /><HandshakeIcon className="w-3 h-3 inline" /> Sem taxa</span>
                  <span className="text-slate-300 dark:text-slate-600">›</span>
                  <span className="shrink-0 flex items-center gap-0.5"><Bike className="w-3 h-3" /> até 30kg</span>
                  <span className="text-slate-300 dark:text-slate-600">›</span>
                  <span className="shrink-0 flex items-center gap-0.5"><Car className="w-3 h-3" /> até 100kg</span>
                  <span className="text-slate-300 dark:text-slate-600">›</span>
                  <span className="shrink-0 flex items-center gap-0.5"><TruckIcon className="w-3 h-3" /> até 500kg</span>
                  <span className="text-slate-300 dark:text-slate-600">›</span>
                  <span className="shrink-0 flex items-center gap-0.5"><Container className="w-3 h-3" /> +500kg</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(TRANSPORT_META).map(([value, meta]) => {
                    const selected = formData.delivery_types.includes(value);
                    const warning = selected ? getTransportWarning(value) : null;
                    const costColor = meta.cost <= 1 ? 'bg-emerald-400' : meta.cost <= 2 ? 'bg-amber-400' : meta.cost <= 3 ? 'bg-orange-400' : 'bg-red-400';
                    const costBars = meta.cost > 0 ? (
                      <span className="flex items-end gap-[2px]" title={`Custo: ${meta.costLabel}`}>
                        {[1, 2, 3, 4].map((level) => (
                          <span
                            key={level}
                            className={`inline-block w-[4px] rounded-[1px] ${level <= meta.cost ? costColor : 'bg-slate-200 dark:bg-slate-600'}`}
                            style={{ height: `${4 + level * 3}px` }}
                          />
                        ))}
                      </span>
                    ) : null;
                    return (
                      <div key={value} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            const types = selected
                              ? formData.delivery_types.filter(t => t !== value)
                              : [...formData.delivery_types, value];
                            setFormData({ ...formData, delivery_types: types });
                          }}
                          className={`w-full flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
                            selected
                              ? warning
                                ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                                : meta.free
                                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                  : 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <div className={`shrink-0 ${
                            selected
                              ? warning ? 'text-amber-600 dark:text-amber-400'
                                : meta.free ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-teal-600 dark:text-teal-400'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}>
                            {meta.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={`text-sm font-semibold leading-tight ${
                                selected
                                  ? warning ? 'text-amber-700 dark:text-amber-300'
                                    : meta.free ? 'text-emerald-700 dark:text-emerald-300'
                                    : 'text-teal-700 dark:text-teal-300'
                                  : 'text-slate-800 dark:text-slate-200'
                              }`}>
                                {meta.label}
                              </p>
                              {meta.free ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Grátis</span>
                              ) : (
                                costBars
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{meta.free ? meta.desc : meta.costLabel}</p>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                            selected
                              ? warning ? 'border-amber-400 bg-amber-400'
                                : meta.free ? 'border-emerald-500 bg-emerald-500'
                                : 'border-teal-500 bg-teal-500'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </button>
                        {warning && (
                          <div className="flex items-start gap-1.5 px-2 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                            <span className="text-sm shrink-0">⚠️</span>
                            <p className="text-xs text-amber-700 dark:text-amber-300 leading-snug">{warning}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {formData.delivery_types.some(t => !['retirada', 'entrega_propria'].includes(t)) && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Quem paga o frete?</Label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">
                    Aplica-se apenas aos meios com taxa (Motoboy, Carro, Van, Caminhão)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'buyer', label: 'Comprador paga', icon: <CreditCard className="w-5 h-5" />, desc: 'Taxa cobrada à parte' },
                      { value: 'seller', label: 'Incluso no preço', icon: <Gift className="w-5 h-5" />, desc: 'Frete já embutido' },
                    ].map(({ value, label, icon, desc }) => {
                      const selected = formData.shipping_paid_by === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setFormData({ ...formData, shipping_paid_by: value })}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
                            selected
                              ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <div className={`shrink-0 ${selected ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            {icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold leading-tight ${selected ? 'text-teal-700 dark:text-teal-300' : 'text-slate-800 dark:text-slate-200'}`}>
                              {label}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                            selected ? 'border-teal-500 bg-teal-500' : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                )}
              </div>


              <div className="space-y-2">
                <Label className="text-sm font-semibold">Formas de Pagamento Aceitas</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'pix', label: 'PIX', icon: '◈' },
                    { value: 'credit_card', label: 'Cartão de crédito', icon: '💳' },
                    { value: 'debit_card', label: 'Cartão de débito', icon: '💳' },
                    { value: 'cash', label: 'Dinheiro', icon: '💵' },
                    { value: 'transfer', label: 'Transferência', icon: '🏦' },
                  ].map(({ value, label, icon }) => {
                    const selected = formData.payment_methods.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          const methods = selected
                            ? formData.payment_methods.filter(m => m !== value)
                            : [...formData.payment_methods, value];
                          setFormData({ ...formData, payment_methods: methods });
                        }}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition-all ${
                          selected
                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <span className="text-base">{icon}</span>
                        <span className={`text-xs font-medium flex-1 ${selected ? 'text-teal-700 dark:text-teal-300' : 'text-slate-700 dark:text-slate-300'}`}>
                          {label}
                        </span>
                        <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                          selected ? 'border-teal-500 bg-teal-500' : 'border-slate-300 dark:border-slate-600'
                        }`}>
                          {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>
        </div>

        <div className="px-6 py-4 border-t bg-slate-50 dark:bg-slate-900/50">
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
              product ? 'Salvar Alterações' : 'Criar Produto'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
