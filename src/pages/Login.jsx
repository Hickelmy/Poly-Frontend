import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Map, Mail, Lock, Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import { polysApi } from '@/api/polysClient';
import { createPageUrl } from '../utils';
import { signInWithGoogle, getGoogleRedirectResult, isFirebaseConfigured } from '@/lib/firebase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const searchParams = new URLSearchParams(location.search);
  const redirect = searchParams.get('redirect') || createPageUrl('Dashboard');

  // Processa retorno do redirect do Google (mobile)
  useEffect(() => {
    getGoogleRedirectResult().then(async (result) => {
      if (!result) return;
      setGoogleLoading(true);
      try {
        await polysApi.auth.loginWithGoogle(result.idToken);
        toast.success('Login com Google realizado!');
        navigate(redirect, { replace: true });
      } catch (err) {
        toast.error(err.message || 'Erro ao fazer login com Google');
      } finally {
        setGoogleLoading(false);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Verifica se o usuário já está autenticado ao carregar a página
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const isAuth = await polysApi.auth.isAuthenticated();
        if (isAuth) {
          // Se há token, tenta validar com o backend
          try {
            await polysApi.auth.me();
            // Token válido, redireciona para o dashboard
            navigate(redirect, { replace: true });
          } catch (err) {
            // Token inválido ou expirado, limpa e mostra a página de login
            // O erro já foi tratado pelo auth.me() que limpa o storage
            setCheckingAuth(false);
          }
        } else {
          setCheckingAuth(false);
        }
      } catch (err) {
        // Em caso de erro, apenas mostra a página de login
        setCheckingAuth(false);
      }
    };

    checkAuthentication();
  }, [navigate, redirect]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error('Preencha email e senha');
      return;
    }

    setLoading(true);
    try {
      await polysApi.auth.login({
        email: formData.email,
        password: formData.password,
      });
      toast.success('Login realizado com sucesso!');
      navigate(redirect, { replace: true });
    } catch (err) {
      toast.error(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  // Mostra loading enquanto verifica autenticação
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4 transition-colors">
        <div className="w-full max-w-md text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-600" />
        </div>
      </div>
    );
  }

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

        {/* Login Card */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Entrar</CardTitle>
            <CardDescription>Acesse sua conta na comunidade</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    placeholder="Sua senha"
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

              <Button
                type="submit"
                className="w-full h-11 bg-teal-600 hover:bg-teal-700"
                disabled={loading || googleLoading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <LogIn className="w-4 h-4 mr-2" />
                )}
                Entrar
              </Button>
            </form>

            {isFirebaseConfigured() && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-slate-900 px-2 text-slate-500">ou</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11"
                  disabled={loading || googleLoading}
                  onClick={async () => {
                    setGoogleLoading(true);
                    try {
                      const result = await signInWithGoogle();
                      if (!result) return; // mobile redirect — page will reload
                      await polysApi.auth.loginWithGoogle(result.idToken);
                      toast.success('Login com Google realizado!');
                      navigate(redirect, { replace: true });
                    } catch (err) {
                      if (err.code !== 'auth/popup-closed-by-user') {
                        toast.error(err.message || 'Erro ao fazer login com Google');
                      }
                    } finally {
                      setGoogleLoading(false);
                    }
                  }}
                >
                  {googleLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  )}
                  Entrar com Google
                </Button>
              </>
            )}

            <p className="text-center text-sm text-slate-500">
              Ainda não tem conta?{' '}
              <Link to={createPageUrl('Register')} className="text-teal-600 hover:underline">
                Criar conta
              </Link>
            </p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}


