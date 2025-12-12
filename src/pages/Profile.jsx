import React, { useState, useEffect, useRef } from 'react';
import { polysApi } from '@/api/polysClient';
import { 
  User, Mail, Phone, MapPin, Save, Camera, Loader2,
  Shield, Bell, CreditCard, LogOut
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";

const roleLabels = {
  usuario: 'Usuário',
  administrador: 'Administrador',
  gestor: 'Gestor',
  suporte: 'Suporte'
};

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const bannerInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    bio: '',
    cep: '',
    state: '',
    city: '',
    neighborhood: '',
    street: '',
    house_number: '',
    pix_random: '',
    pix_phone: '',
    pix_email: '',
    pix_cpf: '',
  });

  const [pixType, setPixType] = useState('random');
  const [pixErrors, setPixErrors] = useState({
    random: '',
    phone: '',
    email: '',
    cpf: '',
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      // Força buscar do backend (ignora cache) para garantir dados descriptografados
      // Limpa o cache local primeiro para forçar busca do backend
      const storage = window.localStorage;
      if (storage) {
        storage.removeItem('polys-auth-user-cache');
      }
      
      const userData = await polysApi.auth.me();
      setUser(userData);
      setFormData({
        full_name: userData.full_name || '',
        phone: userData.phone || '',
        bio: userData.bio || '',
        cep: userData.cep || '',
        state: userData.state || '',
        city: userData.city || '',
        neighborhood: userData.neighborhood || '',
        street: userData.street || '',
        house_number: userData.house_number || '',
        pix_random: userData.pix_random || '',
        pix_phone: userData.pix_phone || '',
        pix_email: userData.pix_email || '',
        pix_cpf: userData.pix_cpf || '',
      });
    } catch (e) {
      polysApi.auth.redirectToLogin();
    }
    setLoading(false);
  };

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  const formatCpf = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const isValidCpf = (cpf) => {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digits)) return false;

    const calcCheckDigit = (base, factor) => {
      let total = 0;
      for (let i = 0; i < base.length; i += 1) {
        total += parseInt(base[i], 10) * (factor - i);
      }
      const remainder = total % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };

    const firstNine = digits.substring(0, 9);
    const d1 = calcCheckDigit(firstNine, 10);
    const d2 = calcCheckDigit(firstNine + d1, 11);

    return digits.endsWith(`${d1}${d2}`);
  };

  const handlePixValueChange = (e) => {
    const raw = e.target.value;
    if (pixType === 'phone') {
      const formatted = formatPhone(raw);
      setFormData({ ...formData, pix_phone: formatted });
    } else if (pixType === 'cpf') {
      const formatted = formatCpf(raw);
      setFormData({ ...formData, pix_cpf: formatted });
    } else if (pixType === 'email') {
      setFormData({ ...formData, pix_email: raw.trimStart() });
    } else {
      setFormData({ ...formData, pix_random: raw.trimStart() });
    }
    setPixErrors((prev) => ({ ...prev, [pixType]: '' }));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await polysApi.integrations.Core.UploadFile({ file });
      await polysApi.auth.updateMe({ avatar_url: file_url });
      toast.success('Foto atualizada!');
      loadUser();
    } catch (e) {
      toast.error('Erro ao fazer upload da foto');
    }
    setUploading(false);
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBanner(true);
    try {
      const { file_url } = await polysApi.integrations.Core.UploadFile({ file });
      await polysApi.auth.updateMe({ banner_url: file_url });
      toast.success('Banner atualizado!');
      loadUser();
    } catch (err) {
      toast.error('Erro ao fazer upload do banner');
    }
    setUploadingBanner(false);
  };

  const handleLogout = () => {
    polysApi.auth.logout('/');
  };

  const handleCepChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
    const masked = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    setFormData({ ...formData, cep: masked });
  };

  const handleCepBlur = async () => {
    const cepDigits = formData.cep.replace(/\D/g, '');
    if (cepDigits.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
      const data = await res.json();
      if (data.erro) return;
      setFormData((prev) => ({
        ...prev,
        state: data.uf || prev.state,
        city: data.localidade || prev.city,
        neighborhood: data.bairro || prev.neighborhood,
        street: data.logradouro || prev.street,
      }));
    } catch (err) {
      console.error('Erro ao buscar CEP', err);
    }
  };

  const validatePix = (type, value) => {
    const trimmed = (value || '').trim();
    if (!trimmed) {
      return 'Informe uma chave Pix.';
    }
    if (type === 'phone') {
      const digits = trimmed.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 11) {
        return 'Pix celular inválido. Verifique o número.';
      }
    }
    if (type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) {
        return 'Pix email inválido. Verifique o endereço de email.';
      }
    }
    if (type === 'cpf') {
      if (!isValidCpf(trimmed)) {
        return 'Pix CPF inválido. Verifique o documento.';
      }
    }
    return '';
  };

  const handleAddPix = async () => {
    const value =
      pixType === 'random'
        ? formData.pix_random
        : pixType === 'phone'
        ? formData.pix_phone
        : pixType === 'email'
        ? formData.pix_email
        : formData.pix_cpf;

    const error = validatePix(pixType, value);
    setPixErrors((prev) => ({ ...prev, [pixType]: error }));
    if (error) {
      toast.error(error);
      return;
    }

    const payload = {};
    if (pixType === 'random') payload.pix_random = value.trim();
    if (pixType === 'phone') payload.pix_phone = value.trim();
    if (pixType === 'email') payload.pix_email = value.trim();
    if (pixType === 'cpf') payload.pix_cpf = value.trim();

    try {
      await polysApi.auth.updateMe(payload);
      toast.success('Chave Pix cadastrada com sucesso!');
      await loadUser();
    } catch (e) {
      toast.error('Erro ao salvar chave Pix');
    }
  };

  const handleEditPix = (type) => {
    setPixType(type);
    setPixErrors((prev) => ({ ...prev, [type]: '' }));
    if (!user) return;
    if (type === 'random') {
      setFormData((prev) => ({ ...prev, pix_random: user.pix_random || '' }));
    } else if (type === 'phone') {
      setFormData((prev) => ({ ...prev, pix_phone: user.pix_phone || '' }));
    } else if (type === 'email') {
      setFormData((prev) => ({ ...prev, pix_email: user.pix_email || '' }));
    } else if (type === 'cpf') {
      setFormData((prev) => ({ ...prev, pix_cpf: user.pix_cpf || '' }));
    }
  };

  const handleRemovePix = async (type) => {
    const payload = {};
    if (type === 'random') payload.pix_random = '';
    if (type === 'phone') payload.pix_phone = '';
    if (type === 'email') payload.pix_email = '';
    if (type === 'cpf') payload.pix_cpf = '';

    try {
      await polysApi.auth.updateMe(payload);
      toast.success('Chave Pix removida.');
      await loadUser();
    } catch (e) {
      toast.error('Erro ao remover chave Pix');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // valida de novo todas as chaves antes de salvar
      const newErrors = {
        random: formData.pix_random ? validatePix('random', formData.pix_random) : '',
        phone: formData.pix_phone ? validatePix('phone', formData.pix_phone) : '',
        email: formData.pix_email ? validatePix('email', formData.pix_email) : '',
        cpf: formData.pix_cpf ? validatePix('cpf', formData.pix_cpf) : '',
      };
      setPixErrors(newErrors);
      const hasError = Object.values(newErrors).some((e) => e);
      if (hasError) {
        toast.error('Corrija as chaves Pix destacadas antes de salvar.');
        setSaving(false);
        return;
      }

      await polysApi.auth.updateMe(formData);
      toast.success('Perfil atualizado com sucesso!');
      loadUser();
    } catch (e) {
      toast.error('Erro ao salvar perfil');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-48" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-32" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-24" />
              <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Card */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="h-32 relative">
          <div
            className="h-32 w-full bg-gradient-to-r from-teal-500 to-emerald-600"
            style={
              user?.banner_url
                ? {
                    backgroundImage: `url(${user.banner_url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }
          />
          <input
            ref={bannerInputRef}
            id="bannerUpload"
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            onChange={handleBannerUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            className="absolute right-4 bottom-2 z-20 p-2 bg-white rounded-full shadow-md cursor-pointer hover:bg-slate-50"
          >
            {uploadingBanner ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
            ) : (
              <Camera className="w-5 h-5 text-slate-500" />
            )}
          </button>
        </div>
        <CardContent className="relative pt-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-16">
            <div className="relative">
              <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
                <AvatarImage src={user?.avatar_url} />
                <AvatarFallback className="bg-teal-100 text-teal-700 text-4xl">
                  {user?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md cursor-pointer hover:bg-slate-50">
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                ) : (
                  <Camera className="w-5 h-5 text-slate-500" />
                )}
                <input 
                  type="file" 
                  accept=".png,.jpg,.jpeg,.webp" 
                  onChange={handleAvatarUpload}
                  className="hidden" 
                />
              </label>
            </div>
            <div className="flex-1 pb-4">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {user?.full_name || 'Seu Nome'}
              </h1>
              <p className="text-slate-500">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-teal-100 text-teal-700">
                  {roleLabels[user?.user_role] || 'Usuário'}
                </Badge>
                {user?.email_confirmed && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Email Verificado
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} className="text-red-600">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-2" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="payment">
            <CreditCard className="w-4 h-4 mr-2" />
            Pagamento
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-4 h-4 mr-2" />
            Segurança
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>
                Atualize suas informações de perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="pl-10"
                      placeholder="Seu nome completo"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="email"
                      value={user?.email || ''}
                    className="pl-10 bg-slate-50 dark:bg-slate-900 dark:text-slate-50"
                      disabled
                    />
                  </div>
                  <p className="text-xs text-slate-500">O email não pode ser alterado</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      className="pl-10"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="cep"
                      value={formData.cep}
                      onChange={handleCepChange}
                      onBlur={handleCepBlur}
                      className="pl-10"
                      placeholder="00000-000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="UF"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Cidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    placeholder="Bairro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="street">Rua</Label>
                  <Input
                    id="street"
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    placeholder="Rua / Logradouro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="house_number">Número</Label>
                  <Input
                    id="house_number"
                    value={formData.house_number}
                    onChange={(e) => setFormData({ ...formData, house_number: e.target.value })}
                    placeholder="Número"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Sobre Você</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Conte um pouco sobre você..."
                  rows={4}
                />
              </div>

              <Button 
                className="bg-teal-600 hover:bg-teal-700"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Tab */}
        <TabsContent value="payment">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Configurações de Pagamento</CardTitle>
              <CardDescription>
                Configure como você deseja receber pagamentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Chave PIX</Label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="sm:w-48">
                    <Label htmlFor="pix_type" className="text-xs text-slate-500">
                      Tipo de chave
                    </Label>
                    <select
                      id="pix_type"
                      className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-background"
                      value={pixType}
                      onChange={(e) => setPixType(e.target.value)}
                    >
                      <option value="random">Aleatória</option>
                      <option value="phone">Celular</option>
                      <option value="email">Email</option>
                      <option value="cpf">CPF</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="pix_value" className="text-xs text-slate-500">
                      Valor da chave
                    </Label>
                    <div className="flex items-start gap-2 mt-1">
                      <Input
                        id="pix_value"
                        className={pixErrors[pixType] ? 'border-red-500 focus-visible:ring-red-500' : ''}
                        value={
                          pixType === 'random'
                            ? formData.pix_random
                            : pixType === 'phone'
                            ? formData.pix_phone
                            : pixType === 'email'
                            ? formData.pix_email
                            : formData.pix_cpf
                        }
                        onChange={handlePixValueChange}
                        placeholder={
                          pixType === 'random'
                            ? 'Chave aleatória (UUID)'
                            : pixType === 'phone'
                            ? '(00) 00000-0000'
                            : pixType === 'email'
                            ? 'email@dominio.com'
                            : '000.000.000-00'
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddPix}
                      >
                        Adicionar chave
                      </Button>
                    </div>
                    {pixErrors[pixType] && (
                      <p className="mt-1 text-xs text-red-600">{pixErrors[pixType]}</p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Escolha o tipo, informe a chave e clique em salvar. Você pode manter uma chave de cada tipo.
                </p>

                <div className="space-y-2">
                  <Label>Chaves cadastradas</Label>
                  {(!user?.pix_random && !user?.pix_phone && !user?.pix_email && !user?.pix_cpf) ? (
                    <p className="text-xs text-slate-500">
                      Nenhuma chave Pix cadastrada ainda.
                    </p>
                  ) : (
                    <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
                      {user?.pix_random && (
                        <li className="flex items-center justify-between gap-2">
                          <span>• Pix Aleatória: {user.pix_random}</span>
                          <div className="flex gap-1">
                            <Button size="xs" variant="outline" onClick={() => handleEditPix('random')}>
                              Editar
                            </Button>
                            <Button size="xs" variant="outline" className="text-red-600" onClick={() => handleRemovePix('random')}>
                              Remover
                            </Button>
                          </div>
                        </li>
                      )}
                      {user?.pix_phone && (
                        <li className="flex items-center justify-between gap-2">
                          <span>• Pix Celular: {user.pix_phone}</span>
                          <div className="flex gap-1">
                            <Button size="xs" variant="outline" onClick={() => handleEditPix('phone')}>
                              Editar
                            </Button>
                            <Button size="xs" variant="outline" className="text-red-600" onClick={() => handleRemovePix('phone')}>
                              Remover
                            </Button>
                          </div>
                        </li>
                      )}
                      {user?.pix_email && (
                        <li className="flex items-center justify-between gap-2">
                          <span>• Pix Email: {user.pix_email}</span>
                          <div className="flex gap-1">
                            <Button size="xs" variant="outline" onClick={() => handleEditPix('email')}>
                              Editar
                            </Button>
                            <Button size="xs" variant="outline" className="text-red-600" onClick={() => handleRemovePix('email')}>
                              Remover
                            </Button>
                          </div>
                        </li>
                      )}
                      {user?.pix_cpf && (
                        <li className="flex items-center justify-between gap-2">
                          <span>• Pix CPF: {user.pix_cpf}</span>
                          <div className="flex gap-1">
                            <Button size="xs" variant="outline" onClick={() => handleEditPix('cpf')}>
                              Editar
                            </Button>
                            <Button size="xs" variant="outline" className="text-red-600" onClick={() => handleRemovePix('cpf')}>
                              Remover
                            </Button>
                          </div>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
                <h4 className="font-medium mb-2">Como funcionam os pagamentos</h4>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <li>• Vendas de produtos: pagamento liberado após confirmação de entrega</li>
                  <li>• Serviços: pagamento liberado após conclusão do serviço</li>
                  <li>• Taxa da plataforma: 10% sobre cada transação</li>
                  <li>
                    • Alguns produtos ou serviços podem ter o pagamento retido em caso de fraude ou contestação
                  </li>
                </ul>
              </div>

              <Button 
                className="bg-teal-600 hover:bg-teal-700"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Chave PIX
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Segurança da Conta</CardTitle>
              <CardDescription>
                Gerencie as configurações de segurança
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${user?.email_confirmed ? 'bg-green-100' : 'bg-amber-100'}`}>
                      <Mail className={`w-5 h-5 ${user?.email_confirmed ? 'text-green-600' : 'text-amber-600'}`} />
                    </div>
                    <div>
                      <p className="font-medium">Verificação de Email</p>
                      <p className="text-sm text-slate-500">
                        {user?.email_confirmed ? 'Email verificado' : 'Email não verificado'}
                      </p>
                    </div>
                  </div>
                  <Badge className={user?.email_confirmed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                    {user?.email_confirmed ? 'Verificado' : 'Pendente'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${user?.phone_confirmed ? 'bg-green-100' : 'bg-amber-100'}`}>
                      <Phone className={`w-5 h-5 ${user?.phone_confirmed ? 'text-green-600' : 'text-amber-600'}`} />
                    </div>
                    <div>
                      <p className="font-medium">Verificação de Telefone</p>
                      <p className="text-sm text-slate-500">
                        {user?.phone_confirmed ? 'Telefone verificado' : 'Telefone não verificado'}
                      </p>
                    </div>
                  </div>
                  <Badge className={user?.phone_confirmed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                    {user?.phone_confirmed ? 'Verificado' : 'Pendente'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-100">
                      <Shield className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-medium">Seu Cargo</p>
                      <p className="text-sm text-slate-500">
                        {roleLabels[user?.user_role] || 'Usuário'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <h4 className="font-medium text-red-700 dark:text-red-400 mb-2">Zona de Perigo</h4>
                <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                  Ações irreversíveis que afetam sua conta
                </p>
                <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Desconectar de todos os dispositivos
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}