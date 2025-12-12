import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { polysApi } from '@/api/polysClient';
import { Map, Mail, Lock, Eye, EyeOff, User, Loader2, ArrowLeft, MapPin } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import AddressPicker from "@/components/address/AddressPicker";
import { encryptObject, SENSITIVE_FIELDS } from "@/utils/encryption";

const getPasswordStrength = (password) => {
  if (!password) {
    return { label: 'Senha vazia', score: 0, color: 'bg-slate-200' };
  }

  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) {
    return { label: 'Muito fraca', score, color: 'bg-red-500' };
  }
  if (score === 2) {
    return { label: 'Fraca', score, color: 'bg-orange-500' };
  }
  if (score === 3) {
    return { label: 'Boa', score, color: 'bg-yellow-500' };
  }
  if (score === 4) {
    return { label: 'Forte', score, color: 'bg-emerald-500' };
  }
  return { label: 'Muito forte', score, color: 'bg-teal-600' };
};

function PasswordStrengthIndicator({ password }) {
  const { label, score, color } = getPasswordStrength(password);
  const percentage = Math.min((score / 5) * 100, 100);

  return (
    <div className="space-y-1 mt-1">
      <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-slate-500">
        Força da senha: <span className="font-medium">{label}</span>
      </p>
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: ''
  });
  const [address, setAddress] = useState({
    street: '',
    house_number: '',
    neighborhood: '',
    city: '',
    state: '',
    cep: '',
    latitude: null,
    longitude: null,
    address: '',
  });
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.email || !formData.password) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    
    if (formData.password !== formData.confirm_password) {
      toast.error('As senhas não coincidem');
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    // Validação do endereço (obrigatório)
    if (!address.street || !address.house_number || !address.city || !address.state) {
      toast.error('Preencha todos os campos do endereço (rua, número, cidade e estado são obrigatórios)');
      return;
    }

    if (!phone) {
      toast.error('O telefone é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const settings = await polysApi.settings.get().catch(() => null);
      if (settings && settings.openSignup === false) {
        toast.error('Cadastro desativado no momento. Fale com o gestor da comunidade.');
        return;
      }

      // Prepara dados do endereço (obrigatório)
      // Criptografa dados sensíveis do endereço antes de enviar
      const addressData = await encryptObject(
        {
          phone: phone,
          cep: address.cep || '',
          street: address.street,
          houseNumber: address.house_number,
          neighborhood: address.neighborhood || '',
          city: address.city,
          state: address.state,
        },
        SENSITIVE_FIELDS.ADDRESS,
        formData.email // Usa o email como chave de criptografia
      );

      await polysApi.auth.register({
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        phone: addressData.phone,
        cep: addressData.cep,
        state: addressData.state,
        city: addressData.city,
        neighborhood: addressData.neighborhood,
        street: addressData.street,
        houseNumber: addressData.houseNumber,
      });
      toast.success('Conta criada com sucesso!');
      navigate(createPageUrl('Dashboard'), {
        replace: true,
        state: { fromRegister: true },
      });
    } catch (err) {
      toast.error(err.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to={createPageUrl('Landing')} className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
              <Map className="w-7 h-7 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">POLYS</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Melhoria Comunitária</p>
            </div>
          </Link>
        </div>

        {/* Register Card */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Criar Conta</CardTitle>
            <CardDescription>Junte-se à sua comunidade</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="name"
                    placeholder="Seu nome completo"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Password strength meter */}
                <PasswordStrengthIndicator password={formData.password} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="confirm_password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite a senha novamente"
                    value={formData.confirm_password}
                    onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Seção de Telefone e Endereço (Obrigatórios) */}
              <div className="pt-4 border-t">
                {/* Campo de telefone */}
                <div className="space-y-2 mb-4">
                  <Label htmlFor="phone">
                    Telefone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={(e) => {
                      // Formata telefone
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                      let formatted = digits;
                      if (digits.length > 2) {
                        formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
                      }
                      if (digits.length > 7) {
                        formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
                      }
                      setPhone(formatted);
                    }}
                    required
                  />
                </div>

                {/* Seção de Endereço */}
                <div className="mb-4">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Endereço <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">
                    O endereço é obrigatório para facilitar entregas. Você pode alterá-lo depois no seu perfil.
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  <AddressPicker
                    value={address}
                    onChange={setAddress}
                    user={null}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 bg-teal-600 hover:bg-teal-700"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Criar Conta
              </Button>
            </form>

            <p className="text-center text-sm text-slate-500">
              Já tem uma conta?{' '}
              <Link to={createPageUrl('Login')} className="text-teal-600 hover:underline">
                Entrar
              </Link>
            </p>

            <Link to={createPageUrl('Login')}>
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}