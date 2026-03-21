import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { PolysLogo } from '@/components/shared/PolysLogo';
import { polysApi } from '@/api/polysClient';
import { signInWithGoogle, getGoogleRedirectResult, isFirebaseConfigured } from '@/lib/firebase';
import {
  Mail, Lock, Eye, EyeOff, User, Loader2, ArrowLeft, ArrowRight,
  MapPin, Building2, Shield, Users, Check, Phone
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import AddressPicker from "@/components/address/AddressPicker";
import { encryptObject, SENSITIVE_FIELDS } from "@/utils/encryption";

const getPasswordStrength = (password: string) => {
  if (!password) return { label: 'Senha vazia', score: 0, color: 'bg-slate-200' };
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 1) return { label: 'Muito fraca', score, color: 'bg-red-500' };
  if (score === 2) return { label: 'Fraca', score, color: 'bg-orange-500' };
  if (score === 3) return { label: 'Boa', score, color: 'bg-yellow-500' };
  if (score === 4) return { label: 'Forte', score, color: 'bg-emerald-500' };
  return { label: 'Muito forte', score, color: 'bg-teal-600' };
};

function PasswordStrengthIndicator({ password }: { password: string }) {
  const { label, score, color } = getPasswordStrength(password);
  const percentage = Math.min((score / 5) * 100, 100);
  return (
    <div className="space-y-1 mt-1">
      <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${percentage}%` }} />
      </div>
      <p className="text-xs text-slate-500">Força da senha: <span className="font-medium">{label}</span></p>
    </div>
  );
}

const ACCOUNT_TYPES = [
  { value: 'USER', label: 'Morador / Usuário', desc: 'Compre, venda, participe de projetos comunitários', icon: Users },
  { value: 'ZONE_ADMIN', label: 'Administrador de Área', desc: 'Gerencie zonas exclusivas (condomínios, conjuntos)', icon: Shield },
  { value: 'COMPANY', label: 'Empresa', desc: 'Ofereça serviços e licite em projetos', icon: Building2 },
];

const USER_STEPS = [
  { label: 'Dados pessoais', icon: User },
  { label: 'Endereço', icon: MapPin },
  { label: 'Criar conta', icon: Check },
];

const ADMIN_STEPS = [
  { label: 'Seus dados', icon: User },
  { label: 'Sobre a área', icon: MapPin },
  { label: 'Enviar', icon: Check },
];

const COMPANY_STEPS = [
  { label: 'Dados da empresa', icon: Building2 },
  { label: 'Contato', icon: Phone },
  { label: 'Enviar', icon: Check },
];

function Stepper({ steps, current }: { steps: { label: string; icon: any }[]; current: number }) {
  return (
    <div className="flex items-center justify-between mb-6">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                done ? 'bg-teal-600 text-white' :
                active ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-600 ring-2 ring-teal-500' :
                'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}>
                {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-[11px] font-medium text-center leading-tight ${
                active ? 'text-teal-600' : done ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'
              }`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mt-[-18px] rounded-full transition-all ${
                done ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-700'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length > 7) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length > 2) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return digits;
}

export default function Register() {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [adminRequestSent, setAdminRequestSent] = useState(false);
  const [companyRequestSent, setCompanyRequestSent] = useState(false);

  // User form
  const [formData, setFormData] = useState({ full_name: '', email: '', password: '', confirm_password: '' });
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [address, setAddress] = useState<any>({
    street: '', house_number: '', neighborhood: '', city: '', state: '', cep: '',
    latitude: null, longitude: null, address: '',
  });

  // Admin form
  const [adminForm, setAdminForm] = useState({ name: '', email: '', phone: '', location: '', objective: '' });

  // Company form
  const [companyForm, setCompanyForm] = useState({
    name: '', email: '', phone: '', companyName: '', cnpj: '', description: '',
  });

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const result = await getGoogleRedirectResult();
        if (!result) return;
        setGoogleLoading(true);
        try {
          await polysApi.auth.loginWithGoogle(result.idToken);
          toast.success('Conta criada com Google!');
          navigate(createPageUrl('Dashboard'), { replace: true });
        } catch (err: any) {
          toast.error(err.message || 'Erro ao criar conta com Google');
        } finally {
          setGoogleLoading(false);
        }
      } catch (err: any) {
        if (err.code && err.code !== 'auth/null-user') {
          toast.error('Erro ao retornar login com Google. Tente novamente.');
        }
      }
    };
    handleRedirect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Helpers de validação ---
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const isValidPhone = (val: string) => {
    const digits = val.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 11;
  };

  const isValidCNPJ = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length !== 14) return false;
    // Rejeita todos iguais (00000000000000, 11111111111111, etc.)
    if (/^(\d)\1{13}$/.test(digits)) return false;
    // Validação dos dígitos verificadores
    const calc = (slice: string, weights: number[]) => {
      const sum = weights.reduce((acc, w, i) => acc + parseInt(slice[i]) * w, 0);
      const rest = sum % 11;
      return rest < 2 ? 0 : 11 - rest;
    };
    const w1 = [5,4,3,2,9,8,7,6,5,4,3,2];
    const w2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
    const d1 = calc(digits, w1);
    const d2 = calc(digits, w2);
    return parseInt(digits[12]) === d1 && parseInt(digits[13]) === d2;
  };

  // --- Validations per step ---
  const validateUserStep = (s: number): boolean => {
    if (s === 0) {
      if (!formData.full_name.trim()) { toast.error('Nome é obrigatório'); return false; }
      if (!formData.email.trim()) { toast.error('Email é obrigatório'); return false; }
      if (!isValidEmail(formData.email)) { toast.error('Email inválido'); return false; }
      if (!formData.password) { toast.error('Senha é obrigatória'); return false; }
      if (formData.password.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres'); return false; }
      if (formData.password !== formData.confirm_password) { toast.error('As senhas não coincidem'); return false; }
      return true;
    }
    if (s === 1) {
      if (!phone.trim()) { toast.error('O telefone é obrigatório'); return false; }
      if (!isValidPhone(phone)) { toast.error('Telefone inválido. Use (XX) XXXXX-XXXX'); return false; }
      if (!address.street || !address.house_number || !address.city || !address.state) {
        toast.error('Preencha todos os campos do endereço (rua, número, cidade e estado)');
        return false;
      }
      return true;
    }
    return true;
  };

  const validateAdminStep = (s: number): boolean => {
    if (s === 0) {
      if (!adminForm.name.trim()) { toast.error('Nome é obrigatório'); return false; }
      if (!adminForm.email.trim()) { toast.error('Email é obrigatório'); return false; }
      if (!isValidEmail(adminForm.email)) { toast.error('Email inválido'); return false; }
      if (adminForm.phone && !isValidPhone(adminForm.phone)) { toast.error('Telefone inválido. Use (XX) XXXXX-XXXX'); return false; }
      return true;
    }
    return true;
  };

  const validateCompanyStep = (s: number): boolean => {
    if (s === 0) {
      if (!companyForm.companyName.trim()) { toast.error('Nome da empresa é obrigatório'); return false; }
      if (!companyForm.cnpj.trim()) { toast.error('CNPJ é obrigatório'); return false; }
      if (!isValidCNPJ(companyForm.cnpj)) { toast.error('CNPJ inválido'); return false; }
      return true;
    }
    if (s === 1) {
      if (!companyForm.name.trim()) { toast.error('Nome do responsável é obrigatório'); return false; }
      if (!companyForm.email.trim()) { toast.error('Email é obrigatório'); return false; }
      if (!isValidEmail(companyForm.email)) { toast.error('Email inválido'); return false; }
      if (companyForm.phone && !isValidPhone(companyForm.phone)) { toast.error('Telefone inválido. Use (XX) XXXXX-XXXX'); return false; }
      return true;
    }
    return true;
  };

  const nextStep = () => {
    const valid = accountType === 'USER' ? validateUserStep(step)
      : accountType === 'COMPANY' ? validateCompanyStep(step)
      : validateAdminStep(step);
    if (!valid) return;
    if (step < 2) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
    else setAccountType(null);
  };

  // --- Submits ---
  const handleUserSubmit = async () => {
    setLoading(true);
    try {
      const settings = await polysApi.settings.get().catch(() => null);
      if (settings && settings.openSignup === false) {
        toast.error('Cadastro desativado no momento. Fale com o gestor da comunidade.');
        return;
      }
      const addressData = await encryptObject(
        {
          phone, cep: address.cep || '', street: address.street,
          houseNumber: address.house_number, neighborhood: address.neighborhood || '',
          city: address.city, state: address.state,
        },
        SENSITIVE_FIELDS.ADDRESS,
        formData.email
      );
      await polysApi.auth.register({
        full_name: formData.full_name, email: formData.email, password: formData.password,
        phone: addressData.phone, cep: addressData.cep, state: addressData.state,
        city: addressData.city, neighborhood: addressData.neighborhood,
        street: addressData.street, houseNumber: addressData.houseNumber,
      });
      toast.success('Conta criada com sucesso!');
      navigate(createPageUrl('Dashboard'), { replace: true, state: { fromRegister: true } });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async () => {
    setLoading(true);
    try {
      await polysApi.adminRequests.create(adminForm);
      setAdminRequestSent(true);
      toast.success('Solicitação enviada! Aguarde a aprovação de um gestor.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar solicitação');
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySubmit = async () => {
    setLoading(true);
    try {
      await polysApi.adminRequests.create({
        name: `${companyForm.companyName} (${companyForm.name})`,
        email: companyForm.email,
        phone: companyForm.phone,
        location: `CNPJ: ${companyForm.cnpj}`,
        objective: `[EMPRESA] ${companyForm.description || 'Cadastro de empresa'}`,
      });
      setCompanyRequestSent(true);
      toast.success('Solicitação enviada! Aguarde a verificação.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar solicitação');
    } finally {
      setLoading(false);
    }
  };

  // --- Account type selection screen ---
  if (!accountType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Link to={createPageUrl('Landing')}><PolysLogo size="lg" /></Link>
          </div>
          <Card className="border-0 shadow-xl">
            <CardContent className="p-6 space-y-5">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Criar Conta</h1>
                <p className="text-sm text-slate-500 mt-1">Como você quer participar?</p>
              </div>

              <div className="grid gap-3">
                {ACCOUNT_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      disabled={t.disabled}
                      onClick={() => { setAccountType(t.value); setStep(0); }}
                      className={`flex items-center gap-4 px-4 py-4 rounded-xl border-2 text-left transition-all group ${
                        t.disabled
                          ? 'border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed'
                          : 'border-slate-200 dark:border-slate-700 hover:border-teal-400 hover:bg-teal-50/50 dark:hover:bg-teal-950/20'
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        t.disabled ? 'bg-slate-100 dark:bg-slate-800' : 'bg-teal-100 dark:bg-teal-900/40 group-hover:bg-teal-200'
                      }`}>
                        <Icon className={`w-5 h-5 ${t.disabled ? 'text-slate-400' : 'text-teal-600'}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{t.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
                      </div>
                      {!t.disabled && <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500 transition-colors" />}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 text-center">
                <p className="text-sm text-slate-500">
                  Já tem uma conta?{' '}
                  <Link to={createPageUrl('Login')} className="text-teal-600 hover:underline font-medium">Entrar</Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // --- Request sent screen (admin or company) ---
  if ((accountType === 'ZONE_ADMIN' && adminRequestSent) || (accountType === 'COMPANY' && companyRequestSent)) {
    const isCompany = accountType === 'COMPANY';
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Link to={createPageUrl('Landing')}><PolysLogo size="lg" /></Link>
          </div>
          <Card className="border-0 shadow-xl">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-teal-600" />
              </div>
              <h2 className="text-xl font-bold">Solicitação enviada!</h2>
              <p className="text-sm text-slate-500">
                {isCompany
                  ? 'Sua solicitação de cadastro empresarial foi enviada. Um gestor irá verificar os dados e aprovar seu acesso.'
                  : 'Sua solicitação para se tornar Administrador de Área foi enviada com sucesso. Um gestor da plataforma irá analisá-la e você receberá acesso após a aprovação.'
                }
              </p>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => { setAccountType(null); setAdminRequestSent(false); setCompanyRequestSent(false); setStep(0); }}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                </Button>
                <Link to={createPageUrl('Login')} className="flex-1">
                  <Button className="w-full bg-teal-600 hover:bg-teal-700">Fazer Login</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // --- Stepper form screens ---
  const steps = accountType === 'USER' ? USER_STEPS : accountType === 'COMPANY' ? COMPANY_STEPS : ADMIN_STEPS;
  const isLastStep = step === steps.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link to={createPageUrl('Landing')}><PolysLogo size="lg" /></Link>
        </div>

        <Card className="border-0 shadow-xl">
          <CardContent className="p-6">
            <Stepper steps={steps} current={step} />

            {/* ========== USER STEPS ========== */}
            {accountType === 'USER' && step === 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder="Seu nome completo" value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input type="email" placeholder="seu@email.com" value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input type={showPassword ? 'text' : 'password'} placeholder="Mínimo 6 caracteres"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="pl-10 pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <PasswordStrengthIndicator password={formData.password} />
                </div>
                <div className="space-y-2">
                  <Label>Confirmar Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input type={showPassword ? 'text' : 'password'} placeholder="Digite a senha novamente"
                      value={formData.confirm_password}
                      onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })} className="pl-10" />
                  </div>
                </div>
              </div>
            )}

            {accountType === 'USER' && step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Telefone <span className="text-red-500">*</span>
                  </Label>
                  <Input placeholder="(00) 00000-0000" value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Endereço <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-xs text-slate-500">Facilita entregas. Pode alterar depois no perfil.</p>
                </div>
                <AddressPicker value={address} onChange={setAddress} user={null} />
              </div>
            )}

            {accountType === 'USER' && step === 2 && (
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
                  <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Confirme seus dados</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Nome</span>
                      <span className="font-medium">{formData.full_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Email</span>
                      <span className="font-medium">{formData.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Telefone</span>
                      <span className="font-medium">{phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Endereço</span>
                      <span className="font-medium text-right max-w-[200px]">
                        {address.street}{address.house_number ? `, ${address.house_number}` : ''}
                        {address.neighborhood ? ` - ${address.neighborhood}` : ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cidade</span>
                      <span className="font-medium">{address.city}{address.state ? ` / ${address.state}` : ''}</span>
                    </div>
                  </div>
                </div>

                {isFirebaseConfigured() && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><Separator className="w-full" /></div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white dark:bg-slate-900 px-2 text-slate-500">ou cadastre com</span>
                      </div>
                    </div>
                    <Button type="button" variant="outline" className="w-full h-11"
                      disabled={loading || googleLoading}
                      onClick={async () => {
                        setGoogleLoading(true);
                        try {
                          const result = await signInWithGoogle();
                          if (!result) return;
                          await polysApi.auth.loginWithGoogle(result.idToken);
                          toast.success('Conta criada com Google!');
                          navigate(createPageUrl('Dashboard'), { replace: true });
                        } catch (err: any) {
                          toast.error(err.message || 'Erro ao criar conta com Google');
                        } finally {
                          setGoogleLoading(false);
                        }
                      }}>
                      {googleLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                      )}
                      Criar conta com Google
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* ========== ZONE_ADMIN STEPS ========== */}
            {accountType === 'ZONE_ADMIN' && step === 0 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-500 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  Para se tornar Administrador de Área, preencha os dados abaixo. Um gestor irá avaliar sua solicitação.
                </p>
                <div className="space-y-2">
                  <Label>Nome completo *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder="Seu nome" value={adminForm.name}
                      onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input type="email" placeholder="seu@email.com" value={adminForm.email}
                      onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder="(00) 00000-0000" value={adminForm.phone}
                      onChange={(e) => setAdminForm({ ...adminForm, phone: formatPhone(e.target.value) })} className="pl-10" />
                  </div>
                </div>
              </div>
            )}

            {accountType === 'ZONE_ADMIN' && step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Localização (bairro, condomínio, conjunto)</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder="Nome do local que administra" value={adminForm.location}
                      onChange={(e) => setAdminForm({ ...adminForm, location: e.target.value })} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Objetivo / Justificativa</Label>
                  <textarea
                    placeholder="Por que deseja administrar uma área? Descreva sua motivação..."
                    value={adminForm.objective}
                    onChange={(e) => setAdminForm({ ...adminForm, objective: e.target.value })}
                    className="w-full min-h-[100px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            )}

            {accountType === 'ZONE_ADMIN' && step === 2 && (
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
                  <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Confirme sua solicitação</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Nome</span>
                      <span className="font-medium">{adminForm.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Email</span>
                      <span className="font-medium">{adminForm.email}</span>
                    </div>
                    {adminForm.phone && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Telefone</span>
                        <span className="font-medium">{adminForm.phone}</span>
                      </div>
                    )}
                    {adminForm.location && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Localização</span>
                        <span className="font-medium text-right max-w-[200px]">{adminForm.location}</span>
                      </div>
                    )}
                    {adminForm.objective && (
                      <div>
                        <span className="text-slate-500">Objetivo</span>
                        <p className="font-medium mt-1 text-slate-700 dark:text-slate-300">{adminForm.objective}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ========== COMPANY STEPS ========== */}
            {accountType === 'COMPANY' && step === 0 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-500 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  Cadastre sua empresa para oferecer serviços e licitar em projetos comunitários.
                </p>
                <div className="space-y-2">
                  <Label>Nome da Empresa / Razão Social *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder="Razão social da empresa" value={companyForm.companyName}
                      onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>CNPJ *</Label>
                  <Input placeholder="00.000.000/0000-00" value={companyForm.cnpj}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 14);
                      let formatted = digits;
                      if (digits.length > 12) formatted = `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12)}`;
                      else if (digits.length > 8) formatted = `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8)}`;
                      else if (digits.length > 5) formatted = `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5)}`;
                      else if (digits.length > 2) formatted = `${digits.slice(0,2)}.${digits.slice(2)}`;
                      setCompanyForm({ ...companyForm, cnpj: formatted });
                    }} />
                </div>
                <div className="space-y-2">
                  <Label>Descrição da empresa</Label>
                  <textarea
                    placeholder="Descreva os serviços que sua empresa oferece..."
                    value={companyForm.description}
                    onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                    className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            )}

            {accountType === 'COMPANY' && step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do responsável *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder="Seu nome completo" value={companyForm.name}
                      onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email corporativo *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input type="email" placeholder="contato@empresa.com" value={companyForm.email}
                      onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Telefone comercial</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder="(00) 00000-0000" value={companyForm.phone}
                      onChange={(e) => setCompanyForm({ ...companyForm, phone: formatPhone(e.target.value) })} className="pl-10" />
                  </div>
                </div>
              </div>
            )}

            {accountType === 'COMPANY' && step === 2 && (
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
                  <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Confirme os dados da empresa</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Empresa</span>
                      <span className="font-medium">{companyForm.companyName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">CNPJ</span>
                      <span className="font-medium">{companyForm.cnpj}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Responsável</span>
                      <span className="font-medium">{companyForm.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Email</span>
                      <span className="font-medium">{companyForm.email}</span>
                    </div>
                    {companyForm.phone && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Telefone</span>
                        <span className="font-medium">{companyForm.phone}</span>
                      </div>
                    )}
                    {companyForm.description && (
                      <div>
                        <span className="text-slate-500">Descrição</span>
                        <p className="font-medium mt-1 text-slate-700 dark:text-slate-300">{companyForm.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ========== NAVIGATION BUTTONS ========== */}
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={prevStep}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {step === 0 ? 'Tipo de conta' : 'Voltar'}
              </Button>

              {isLastStep ? (
                <Button className="flex-1 bg-teal-600 hover:bg-teal-700" disabled={loading}
                  onClick={() => accountType === 'USER' ? handleUserSubmit() : accountType === 'COMPANY' ? handleCompanySubmit() : handleAdminSubmit()}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  {accountType === 'USER' ? 'Criar Conta' : 'Enviar Solicitação'}
                </Button>
              ) : (
                <Button className="flex-1 bg-teal-600 hover:bg-teal-700" onClick={nextStep}>
                  Próximo <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>

            <p className="text-center text-sm text-slate-500 mt-4">
              Já tem uma conta?{' '}
              <Link to={createPageUrl('Login')} className="text-teal-600 hover:underline font-medium">Entrar</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
