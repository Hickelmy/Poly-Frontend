import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { polysApi } from '@/api/polysClient';
import { 
  Map, Mail, Lock, Eye, EyeOff, User, Phone, FileText, 
  MapPin, Calendar as CalendarIcon, Loader2, CheckCircle, XCircle, ArrowLeft 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminCompleteRegister() {
  const [token, setToken] = useState(null);
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    cpf: '',
    location: '',
    birth_date: '',
    phone: '',
    email: '',
    password: '',
    confirm_password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [birthDate, setBirthDate] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    setToken(tokenParam);
    
    if (tokenParam) {
      validateToken(tokenParam);
    } else {
      setError('Link inválido');
      setLoading(false);
    }
  }, []);

  const validateToken = async (tokenValue) => {
    try {
      const invites = await polysApi.entities.InviteLink.filter({ token: tokenValue });
      
      if (invites.length === 0) {
        setError('Link não encontrado');
        setLoading(false);
        return;
      }

      const inv = invites[0];
      
      if (inv.status === 'used') {
        setError('Este link já foi utilizado');
        setLoading(false);
        return;
      }

      if (inv.status === 'expired' || (inv.expires_at && new Date(inv.expires_at) < new Date())) {
        setError('Este link expirou');
        setLoading(false);
        return;
      }

      setInvite(inv);
      setFormData(prev => ({ ...prev, email: inv.email }));
      setLoading(false);
    } catch (e) {
      setError('Erro ao validar link');
      setLoading(false);
    }
  };

  const formatCPF = (value) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.first_name || !formData.last_name || !formData.cpf || 
        !formData.phone || !formData.password) {
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

    setSaving(true);
    try {
      // Criar usuário no backend
      const fullName = `${formData.first_name} ${formData.last_name}`.trim();
      
      const userData = {
        name: fullName,
        email: formData.email,
        password: formData.password,
        role: invite.type === 'gestor' ? 'gestor' : 'administrador',
        phone: formData.phone || null,
        // Campos extras que podem ser salvos no localStorage para uso futuro
        // (já que o schema do User não tem esses campos)
        cpf: formData.cpf || null,
        location: formData.location || null,
        birth_date: birthDate ? birthDate.toISOString() : null,
      };

      // Registrar usuário no backend
      await polysApi.auth.register({
        full_name: fullName,
        email: formData.email,
        password: formData.password,
        role: invite.type === 'gestor' ? 'gestor' : 'administrador',
      });

      // Salvar dados extras no localStorage (para uso futuro se necessário)
      try {
        const db = JSON.parse(localStorage.getItem('polys_db') || '{}');
        if (!db.users) db.users = [];
        const userIndex = db.users.findIndex(u => u.email === formData.email);
        const extraData = {
          cpf: formData.cpf,
          location: formData.location,
          birth_date: birthDate ? birthDate.toISOString() : null,
          first_name: formData.first_name,
          last_name: formData.last_name,
        };
        if (userIndex >= 0) {
          db.users[userIndex] = { ...db.users[userIndex], ...extraData };
        } else {
          db.users.push({ email: formData.email, ...extraData });
        }
        localStorage.setItem('polys_db', JSON.stringify(db));
      } catch (e) {
        console.warn('Erro ao salvar dados extras:', e);
      }

      // Mark invite as used
      await polysApi.entities.InviteLink.update(invite.id, {
        status: 'used',
        used_at: new Date().toISOString()
      });

      toast.success('Cadastro concluído com sucesso!');
      setSuccess(true);
    } catch (error) {
      console.error('Erro ao completar cadastro:', error);
      toast.error(error.message || 'Erro ao completar cadastro');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-xl">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Link Inválido</h2>
            <p className="text-slate-500 mb-6">{error}</p>
            <Button 
              className="bg-teal-600 hover:bg-teal-700"
              onClick={() => polysApi.auth.redirectToLogin(createPageUrl('Dashboard'))}
            >
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-xl">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Cadastro Concluído!</h2>
            <p className="text-slate-500 mb-6">
              Sua conta de {invite.type === 'gestor' ? 'Gestor' : 'Administrador'} foi criada com sucesso.
            </p>
            <Button 
              className="bg-teal-600 hover:bg-teal-700"
              onClick={() => polysApi.auth.redirectToLogin(createPageUrl('Dashboard'))}
            >
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 py-8 px-4">
      <div className="w-full max-w-lg mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to={createPageUrl('Landing')} className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <Map className="w-7 h-7 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-slate-900">POLYS</h1>
              <p className="text-xs text-slate-500">Melhoria Comunitária</p>
            </div>
          </Link>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">
              Cadastro de {invite.type === 'gestor' ? 'Gestor' : 'Administrador'}
            </CardTitle>
            <CardDescription>
              Complete seu cadastro para acessar a plataforma
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Nome *</Label>
                  <Input
                    id="first_name"
                    placeholder="Nome"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Sobrenome *</Label>
                  <Input
                    id="last_name"
                    placeholder="Sobrenome"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF *</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="cpf"
                    placeholder="000.000.000-00"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                    className="pl-10"
                    maxLength={14}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Localização</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="location"
                    placeholder="Endereço ou bairro"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birth_date">Data de Nascimento</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal pl-10",
                          !birthDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="absolute left-3 h-4 w-4 text-slate-400" />
                        {birthDate
                          ? birthDate.toLocaleDateString('pt-BR')
                          : "Escolha uma data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={birthDate}
                        onSelect={setBirthDate}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(23, 59, 59, 999);
                          return date > today;
                        }}
                        initialFocus
                    />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="phone"
                      placeholder="(00) 00000-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                      className="pl-10"
                      maxLength={15}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    className="pl-10 bg-teal-50/50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800"
                    disabled
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirmar Senha *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="confirm_password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirme sua senha"
                    value={formData.confirm_password}
                    onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 bg-teal-600 hover:bg-teal-700"
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Completar Cadastro
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}