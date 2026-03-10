import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Shield, Bell, Globe } from 'lucide-react';
import { polysApi } from '@/api/polysClient';

export default function AppSettings() {
  const [canEdit, setCanEdit] = useState(false);
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    openSignup: true,
    dailySummary: true,
  });
  const [loading, setLoading] = useState(true);

  // Carrega permissões e estado salvo (backend + fallback local)
  useEffect(() => {
    const load = async () => {
      try {
        const user = await polysApi.auth.me();
        const role = user.user_role || 'usuario';
        if (role === 'gestor' || role === 'administrador') {
          setCanEdit(true);
        }
      } catch {
        setCanEdit(false);
      }

      try {
        const backendSettings = await polysApi.settings.get();
        setSettings({
          maintenanceMode: backendSettings.maintenanceMode,
          openSignup: backendSettings.openSignup,
          dailySummary: backendSettings.dailySummary,
        });
      } catch {
        // fallback para localStorage se backend não responder
        if (typeof window !== 'undefined') {
          const raw = window.localStorage.getItem('polys-app-settings');
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              setSettings((prev) => ({ ...prev, ...parsed }));
            } catch {
              // ignore
            }
          }
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Persiste as configurações localmente (frontend apenas)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('polys-app-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSetting = async (key, value) => {
    if (!canEdit) return;
    const partial = { [key]: !!value };
    setSettings((prev) => ({ ...prev, ...partial }));
    try {
      await polysApi.settings.update(partial);
    } catch (e) {
      console.error('Erro ao salvar configurações', e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Configurações da Plataforma */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-teal-600" />
            Configurações da Plataforma
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading && (
            <p className="text-sm text-slate-500">Carregando configurações...</p>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Preferências gerais
            </h3>
            <div className="flex items-center justify-between rounded-xl border px-4 py-3">
              <div>
                <Label className="font-medium">Modo de manutenção</Label>
                <p className="text-xs text-slate-500">
                  Exibe uma página de manutenção para todos os usuários.
                </p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(v) => updateSetting('maintenanceMode', v)}
                disabled={!canEdit}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border px-4 py-3">
              <div>
                <Label className="font-medium">Cadastro aberto</Label>
                <p className="text-xs text-slate-500">
                  Permite que novos usuários se registrem sem convite.
                </p>
              </div>
              <Switch
                checked={settings.openSignup}
                onCheckedChange={(v) => updateSetting('openSignup', v)}
                disabled={!canEdit}
              />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Notificações
            </h3>
            <div className="flex items-center justify-between rounded-xl border px-4 py-3">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-slate-500" />
                <div>
                  <Label className="font-medium">Resumo diário</Label>
                  <p className="text-xs text-slate-500">
                    Enviar resumo diário de atividades para gestores.
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.dailySummary}
                onCheckedChange={(v) => updateSetting('dailySummary', v)}
                disabled={!canEdit}
              />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Regionalização
            </h3>
            <div className="flex items-center justify-between rounded-xl border px-4 py-3">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-slate-500" />
                <div>
                  <Label className="font-medium">Idioma padrão</Label>
                  <p className="text-xs text-slate-500">
                    Atualmente: Português (Brasil). Em breve outros idiomas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-slate-400 text-center">
        Apenas gestores e administradores podem alterar essas configurações.
      </p>
    </div>
  );
}
