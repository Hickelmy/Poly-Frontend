import React, { useState, useEffect, useRef } from 'react';
import { polysApi } from '@/api/polysClient';
import { useQueryClient } from '@tanstack/react-query';
import { MapPin, Upload, X, Loader2, Search } from 'lucide-react';
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
    delivery_types: [],
    shipping_paid_by: 'buyer',
    images: [],
    lat: null,
    lng: null
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [addressSearch, setAddressSearch] = useState('');
  const [searchingAddress, setSearchingAddress] = useState(false);

  // Função para arredondar coordenadas (privacidade - 3 casas decimais = ~100m)
  const roundCoordinate = (coord) => {
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
        delivery_types: product.deliveryTypes || [],
        shipping_paid_by: product.shippingPaidBy || 'buyer',
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
        delivery_types: [],
        shipping_paid_by: 'buyer',
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
        deliveryTypes: formData.delivery_types,
        shippingPaidBy: formData.shipping_paid_by,
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
        if (JSON.stringify(fullData.deliveryTypes) !== JSON.stringify(product.deliveryTypes || [])) changed.deliveryTypes = fullData.deliveryTypes;
        if (fullData.shippingPaidBy !== (product.shippingPaidBy || 'buyer')) changed.shippingPaidBy = fullData.shippingPaidBy;
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
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl">{product ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Coluna Esquerda */}
            <div className="space-y-4">
              {/* Localização Aproximada */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="w-4 h-4 text-teal-600" />
                  Localização Aproximada *
                </Label>

                {/* Busca manual por endereço */}
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

                {/* Divisor */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                  <span className="text-xs text-slate-400">ou</span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                </div>

                {/* GPS */}
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

              {/* Nome */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Nome *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Nome do produto"
                  className="h-10"
                />
              </div>

              {/* Descrição */}
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

              {/* Categoria e Condição */}
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

              {/* Preço, Estoque e Unidade */}
              <div className="space-y-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <Label className="text-sm font-semibold">Preço e Estoque</Label>
                <div className="space-y-2">
                  <Label className="text-xs">Preço *</Label>
                  <CurrencyInput
                    value={formData.price}
                    onChange={(value) => setFormData({ ...formData, price: value })}
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
              </div>
            </div>

            {/* Coluna Direita */}
            <div className="space-y-4">
              {/* Imagens */}
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

              {/* Tipos de Entrega */}
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-semibold">Tipos de entrega disponíveis</Label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Selecione todos os meios que você aceita para entregar este produto
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'moto', label: 'Motoboy', icon: '🛵', desc: 'Entregas rápidas e pequenas' },
                    { value: 'carro', label: 'Carro', icon: '🚗', desc: 'Volumes médios' },
                    { value: 'van', label: 'Van', icon: '🚐', desc: 'Cargas maiores' },
                    { value: 'caminhao', label: 'Caminhão', icon: '🚛', desc: 'Cargas pesadas ou grandes' },
                  ].map(({ value, label, icon, desc }) => {
                    const selected = formData.delivery_types.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          const types = selected
                            ? formData.delivery_types.filter(t => t !== value)
                            : [...formData.delivery_types, value];
                          setFormData({ ...formData, delivery_types: types });
                        }}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
                          selected
                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <span className="text-xl">{icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold leading-tight ${selected ? 'text-teal-700 dark:text-teal-300' : 'text-slate-800 dark:text-slate-200'}`}>
                            {label}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{desc}</p>
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

                {/* Quem paga o frete */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Quem paga o frete?</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'buyer', label: 'Comprador paga', icon: '💳', desc: 'Frete cobrado separado' },
                      { value: 'seller', label: 'Incluso no preço', icon: '🎁', desc: 'Frete já embutido' },
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
                          <span className="text-xl">{icon}</span>
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
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
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

