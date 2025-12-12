import React, { useState, useEffect } from 'react';
import { polysApi } from '@/api/polysClient';
import { useSelectedZone } from '@/contexts/SelectedZoneContext';
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

export default function CreateProductModal({ open, onClose, product, user, onSuccess }) {
  const { zones } = useSelectedZone();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    quantity_available: '1',
    category: '',
    condition: 'novo',
    images: [],
    zone_id: ''
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        title: product.title || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        quantity_available: product.quantity_available?.toString() || '1',
        category: product.category || '',
        condition: product.condition || 'novo',
        images: product.images || [],
        zone_id: product.zone_id || user?.residence_zone_id || ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        price: '',
        quantity_available: '1',
        category: '',
        condition: 'novo',
        images: [],
        zone_id: user?.residence_zone_id || ''
      });
    }
  }, [product, open, user?.residence_zone_id]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
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
    if (!formData.title || !formData.price) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    if (!formData.zone_id) {
      toast.error('Selecione a área onde o produto está disponível');
      return;
    }

    if (!user) {
      toast.error('Faça login para criar um produto');
      return;
    }

    setSaving(true);
    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price),
        quantity_available: parseInt(formData.quantity_available),
        seller_id: user.id,
        seller_email: user.email,
        seller_name: user.full_name,
        zone_id: formData.zone_id || null,
        lat: user.residence_lat || null,
        lng: user.residence_lng || null,
        active: true
      };

      if (product) {
        await polysApi.entities.Product.update(product.id, data);
        toast.success('Produto atualizado');
      } else {
        await polysApi.entities.Product.create(data);
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Zone Selector */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-600" />
              Área de Disponibilidade *
            </Label>
            <Select 
              value={formData.zone_id} 
              onValueChange={(value) => setFormData({ ...formData, zone_id: value })}
            >
              <SelectTrigger className={!formData.zone_id ? "border-amber-500" : ""}>
                <SelectValue placeholder="Selecione a área" />
              </SelectTrigger>
              <SelectContent>
                {zones.map((zone) => (
                  <SelectItem key={zone.id} value={zone.id}>
                    {zone.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              O produto ficará visível apenas para usuários que filtram por esta área
            </p>
          </div>

          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Nome do produto"
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva seu produto"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Preço *</Label>
              <CurrencyInput
                value={formData.price}
                onChange={(value) => setFormData({ ...formData, price: value })}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                value={formData.quantity_available}
                onChange={(e) => setFormData({ ...formData, quantity_available: e.target.value })}
                min="0"
              />
            </div>
          </div>

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

          <div className="space-y-2">
            <Label>Imagens</Label>
            <div className="flex flex-wrap gap-2">
              {formData.images.map((img, i) => (
                <div key={i} className="relative w-20 h-20">
                  <img src={img} alt="" className="w-full h-full object-cover rounded-lg" />
                  <button
                    onClick={() => setFormData({ ...formData, images: formData.images.filter((_, j) => j !== i) })}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-50">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5 text-slate-400" />}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
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

