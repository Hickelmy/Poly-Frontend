import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { polysApi } from '@/api/polysClient';
import { PolysLogo } from '@/components/shared/PolysLogo';
import { createPageUrl } from '../utils';
import { Users, Loader2, CheckCircle, XCircle, LogIn, MapPin } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function JoinZone() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'joining' | 'success' | 'error'>('loading');
  const [linkInfo, setLinkInfo] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const validate = async () => {
      if (!code) { setStatus('invalid'); setErrorMsg('Código não informado'); return; }

      // Check if user is logged in
      try {
        await polysApi.auth.me();
        setIsLoggedIn(true);
      } catch {
        setIsLoggedIn(false);
      }

      // Validate the code
      try {
        const info = await polysApi.inviteLinks.validate(code);
        setLinkInfo(info);
        setStatus(info.valid ? 'valid' : 'invalid');
        if (!info.valid) setErrorMsg(info.reason || 'Convite inválido');
      } catch (err: any) {
        setStatus('invalid');
        setErrorMsg(err.message || 'Código de convite inválido');
      }
    };
    validate();
  }, [code]);

  const handleJoin = async () => {
    if (!code) return;
    setStatus('joining');
    try {
      await polysApi.inviteLinks.join(code);
      setStatus('success');
      toast.success('Você entrou na zona!');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Erro ao entrar na zona');
      toast.error(err.message || 'Erro ao entrar na zona');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link to={createPageUrl('Landing')}><PolysLogo size="lg" /></Link>
        </div>

        <Card className="border-0 shadow-xl">
          <CardContent className="p-8">

            {/* Loading */}
            {status === 'loading' && (
              <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-teal-500 mx-auto" />
                <p className="text-slate-500">Validando convite...</p>
              </div>
            )}

            {/* Valid - ready to join */}
            {status === 'valid' && (
              <div className="text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center mx-auto">
                  <Users className="w-8 h-8 text-teal-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Convite para zona</h2>
                  {linkInfo?.zone?.name && (
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <MapPin className="w-4 h-4 text-teal-500" />
                      <span className="text-lg font-semibold text-teal-600">{linkInfo.zone_name}</span>
                    </div>
                  )}
                  <p className="text-sm text-slate-500 mt-2">
                    Você foi convidado para entrar nesta zona exclusiva.
                  </p>
                </div>

                {isLoggedIn ? (
                  <Button className="w-full h-11 bg-teal-600 hover:bg-teal-700" onClick={handleJoin}>
                    <Users className="w-4 h-4 mr-2" /> Entrar na Zona
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                      Faça login ou crie uma conta para entrar nesta zona.
                    </p>
                    <div className="flex gap-2">
                      <Link to={`${createPageUrl('Login')}?redirect=/join/${code}`} className="flex-1">
                        <Button className="w-full bg-teal-600 hover:bg-teal-700">
                          <LogIn className="w-4 h-4 mr-2" /> Entrar
                        </Button>
                      </Link>
                      <Link to={`${createPageUrl('Register')}?redirect=/join/${code}`} className="flex-1">
                        <Button variant="outline" className="w-full">Criar Conta</Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Joining */}
            {status === 'joining' && (
              <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-teal-500 mx-auto" />
                <p className="text-slate-500">Entrando na zona...</p>
              </div>
            )}

            {/* Success */}
            {status === 'success' && (
              <div className="text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Você entrou!</h2>
                  {linkInfo?.zone?.name && (
                    <p className="text-sm text-slate-500 mt-1">
                      Agora você é membro de <strong>{linkInfo.zone_name}</strong>
                    </p>
                  )}
                </div>
                <Button className="w-full bg-teal-600 hover:bg-teal-700"
                  onClick={() => navigate(createPageUrl('Dashboard'), { replace: true })}>
                  Ir para o Dashboard
                </Button>
              </div>
            )}

            {/* Invalid or Error */}
            {(status === 'invalid' || status === 'error') && (
              <div className="text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center mx-auto">
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Convite inválido</h2>
                  <p className="text-sm text-slate-500 mt-1">{errorMsg}</p>
                </div>
                <Link to={createPageUrl('Dashboard')}>
                  <Button variant="outline" className="w-full">Voltar ao início</Button>
                </Link>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
