import React, { useState, useEffect, useRef } from 'react';
import { polysApi } from '@/api/polysClient';
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
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Location marker icon
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

// Small location map component using Leaflet directly
function LocationMap({ lat, lng }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circlesRef = useRef([]);

  useEffect(() => {
    if (!lat || !lng || !mapContainerRef.current) return;

    // Initialize map
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

    // Update map center
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 13);
    }

    // Remove old marker
    if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
    }

    // Add new marker
    markerRef.current = L.marker([lat, lng], { icon: locationIcon }).addTo(mapRef.current);

    // Remove old circles
    circlesRef.current.forEach(circle => {
      if (mapRef.current) {
        mapRef.current.removeLayer(circle);
      }
    });
    circlesRef.current = [];

    // Add new circles
    const circle500m = L.circle([lat, lng], {
      radius: 500,
      color: '#22c55e',
      fillColor: '#22c55e',
      fillOpacity: 0.1,
      weight: 2
    }).addTo(mapRef.current);

    const circle1km = L.circle([lat, lng], {
      radius: 1000,
      color: '#16a34a',
      fillColor: '#16a34a',
      fillOpacity: 0.08,
      weight: 2
    }).addTo(mapRef.current);

    const circle1_5km = L.circle([lat, lng], {
      radius: 1500,
      color: '#15803d',
      fillColor: '#15803d',
      fillOpacity: 0.06,
      weight: 2
    }).addTo(mapRef.current);

    circlesRef.current = [circle500m, circle1km, circle1_5km];

    // Cleanup
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

  // Cleanup on unmount
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

export default function CreateProductModal({ open, onClose, product, user, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    quantity_available: '1',
    unit_type: 'unidade',
    category: '',
    condition: 'novo',
    images: [],
    lat: null,
    lng: null
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Função para arredondar coordenadas (privacidade - 3 casas decimais = ~100m)
  const roundCoordinate = (coord) => {
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
        enableHighAccuracy: false, // Não precisa de alta precisão para privacidade
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
        category: product.category || '',
        condition: product.condition || 'novo',
        images: product.images || [],
        lat: product.lat || null,
        lng: product.lng || null
      });
    } else {
      setFormData({
        title: '',
        description: '',
        price: '',
        quantity_available: '1',
        unit_type: 'unidade',
        category: '',
        condition: 'novo',
        images: [],
        lat: null,
        lng: null
      });
    }
  }, [product, open]);

  const handleImageUpload = async (e) => {
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
      // Upload sequencial para evitar sobrecarga
      const uploadedUrls = [];
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
    // Reset input
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
        category: formData.category,
        condition: formData.condition,
        images: formData.images,
        lat: formData.lat,
        lng: formData.lng,
        active: true
      };

      if (product) {
        // Envia apenas campos alterados (PATCH parcial)
        const changed = {};
        if (fullData.title !== (product.title || '')) changed.title = fullData.title;
        if (fullData.description !== (product.description || '')) changed.description = fullData.description;
        if (fullData.price !== (product.price ?? 0)) changed.price = fullData.price;
        if (fullData.quantityAvailable !== (product.quantityAvailable ?? 0)) changed.quantityAvailable = fullData.quantityAvailable;
        if (fullData.unitType !== (product.unitType || 'unidade')) changed.unitType = fullData.unitType;
        if (fullData.category !== (product.category || '')) changed.category = fullData.category;
        if (fullData.condition !== (product.condition || '')) changed.condition = fullData.condition;
        if (JSON.stringify(fullData.images || []) !== JSON.stringify(product.images || [])) changed.images = fullData.images;
        if (fullData.lat !== (product.lat ?? null)) changed.lat = fullData.lat;
        if (fullData.lng !== (product.lng ?? null)) changed.lng = fullData.lng;
        const payload = Object.keys(changed).length > 0 ? changed : fullData;
        await polysApi.entities.Product.update(product.id, payload);
        toast.success('Produto atualizado');
      } else {
        await polysApi.entities.Product.create(fullData);
        toast.success('Produto criado');
      }
      
      // Invalida queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['sellerProducts'] });
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error('Erro ao salvar produto');
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Imagens - Primeiro campo */}
          <div className="space-y-2">
            <Label>Imagens</Label>
            {/* Grid de imagens */}
            {formData.images.length > 0 && (
              <div className="grid grid-cols-4 gap-3 mb-3">
                {formData.images.map((img, i) => (
                  <div key={i} className="relative aspect-square group">
                    <img src={img} alt="" className="w-full h-full object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
                    <button
                      onClick={() => setFormData({ ...formData, images: formData.images.filter((_, j) => j !== i) })}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* Área de upload full width */}
            <label className="w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              {uploading ? (
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Clique para adicionar imagens
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    PNG, JPG, WEBP ou GIF
                  </span>
                </>
              )}
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.gif"
                onChange={handleImageUpload}
                className="hidden"
                multiple
              />
            </label>
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Nome do produto"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva seu produto"
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Preço */}
          <div className="space-y-2">
            <Label>Preço *</Label>
            <CurrencyInput
              value={formData.price}
              onChange={(value) => setFormData({ ...formData, price: value })}
              placeholder="0,00"
            />
          </div>

          {/* Quantidade e Unidade */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                {formData.unit_type === 'kg' ? 'Estoque (kg)' : formData.unit_type === 'litro' ? 'Estoque (L)' : 'Estoque (unidades)'}
              </Label>
              <Input
                type="number"
                value={formData.quantity_available}
                onChange={(e) => setFormData({ ...formData, quantity_available: e.target.value })}
                min="0"
                step={formData.unit_type === 'unidade' ? '1' : '0.5'}
                placeholder={formData.unit_type === 'unidade' ? '1' : '0'}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de unidade</Label>
              <Select value={formData.unit_type} onValueChange={(v) => setFormData({ ...formData, unit_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unidade">Unidade</SelectItem>
                  <SelectItem value="kg">Quilograma (kg)</SelectItem>
                  <SelectItem value="litro">Litro (L)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Categoria e Condição */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
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
              <Label>Condição</Label>
              <Select value={formData.condition} onValueChange={(v) => setFormData({ ...formData, condition: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="usado_otimo">Usado - Ótimo</SelectItem>
                  <SelectItem value="usado_bom">Usado - Bom</SelectItem>
                  <SelectItem value="usado_regular">Usado - Regular</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Localização Aproximada */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
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
              A localização é aproximada para preservar sua privacidade. Será usada para filtrar produtos próximos a você.
            </p>
            {/* Mapa com círculos de alcance */}
            {formData.lat && formData.lng && open && (
              <div className="mt-3">
                <LocationMap lat={formData.lat} lng={formData.lng} />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Círculos verdes mostram a área de alcance: 500m, 1km e 1.5km
                </p>
              </div>
            )}
          </div>

          <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {product ? 'Salvar Alterações' : 'Criar Produto'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

