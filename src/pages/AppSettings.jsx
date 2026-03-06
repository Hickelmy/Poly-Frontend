import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, Bell, Globe, Key, Plus, Pencil, Trash2, 
  GripVertical, Eye, EyeOff, Loader2, Check, X, Save,
  CreditCard
} from 'lucide-react';
import { polysApi } from '@/api/polysClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Provedores de API disponíveis
const API_PROVIDERS = [
  { id: 'abacate_pay', name: 'Abacate Pay', description: 'Gateway de pagamento PIX', icon: '🥑' },
  { id: 'stripe', name: 'Stripe', description: 'Pagamentos internacionais', icon: '💳' },
  { id: 'pagseguro', name: 'PagSeguro', description: 'Gateway brasileiro', icon: '🔐' },
  { id: 'custom', name: 'Outro', description: 'Provedor personalizado', icon: '🔧' },
];

export default function AppSettings() {
  const [canEdit, setCanEdit] = useState(false);
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    openSignup: true,
    dailySummary: true,
  });
  const [loading, setLoading] = useState(true);
  
  // Modal de token
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [editingToken, setEditingToken] = useState(null);
  const [showToken, setShowToken] = useState(false);
  const [tokenForm, setTokenForm] = useState({
    name: '',
    provider: '',
    token: '',
    description: '',
    active: true,
  });

  const queryClient = useQueryClient();

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

  // Query para buscar tokens
  const { data: apiTokens = [], isLoading: tokensLoading } = useQuery({
    queryKey: ['apiTokens'],
    queryFn: () => polysApi.apiTokens.list(),
    enabled: canEdit,
  });

  // Mutation para criar token
  const createTokenMutation = useMutation({
    mutationFn: (data) => polysApi.apiTokens.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['apiTokens']);
      toast.success('Token criado com sucesso!');
      resetTokenForm();
    },
    onError: (error) => {
      toast.error('Erro ao criar token', { description: error.message });
    },
  });

  // Mutation para atualizar token
  const updateTokenMutation = useMutation({
    mutationFn: ({ id, data }) => polysApi.apiTokens.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['apiTokens']);
      toast.success('Token atualizado com sucesso!');
      resetTokenForm();
    },
    onError: (error) => {
      toast.error('Erro ao atualizar token', { description: error.message });
    },
  });

  // Mutation para excluir token
  const deleteTokenMutation = useMutation({
    mutationFn: (id) => polysApi.apiTokens.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['apiTokens']);
      toast.success('Token excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir token', { description: error.message });
    },
  });

  // Mutation para reordenar tokens
  const reorderTokensMutation = useMutation({
    mutationFn: (tokenIds) => polysApi.apiTokens.reorder(tokenIds),
    onSuccess: () => {
      queryClient.invalidateQueries(['apiTokens']);
    },
  });

  const resetTokenForm = () => {
    setTokenModalOpen(false);
    setEditingToken(null);
    setShowToken(false);
    setTokenForm({
      name: '',
      provider: '',
      token: '',
      description: '',
      active: true,
    });
  };

  const openTokenModal = (token = null) => {
    if (token) {
      setEditingToken(token);
      setTokenForm({
        name: token.name || '',
        provider: token.provider || '',
        token: '', // Token mascarado, não preenche
        description: token.description || '',
        active: token.active ?? true,
      });
    }
    setTokenModalOpen(true);
  };

  const handleSaveToken = () => {
    if (!tokenForm.name || !tokenForm.provider) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!editingToken && !tokenForm.token) {
      toast.error('Token é obrigatório');
      return;
    }

    if (editingToken) {
      const updateData = { ...tokenForm };
      if (!updateData.token) {
        delete updateData.token; // Não envia token vazio (mantém o existente)
      }
      updateTokenMutation.mutate({ id: editingToken.id, data: updateData });
    } else {
      createTokenMutation.mutate(tokenForm);
    }
  };

  const moveToken = (index, direction) => {
    const newTokens = [...apiTokens];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= newTokens.length) return;
    
    [newTokens[index], newTokens[newIndex]] = [newTokens[newIndex], newTokens[index]];
    
    const tokenIds = newTokens.map(t => t.id);
    reorderTokensMutation.mutate(tokenIds);
  };

  const getProviderInfo = (providerId) => {
    return API_PROVIDERS.find(p => p.id === providerId) || { name: providerId, icon: '🔧' };
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

      {/* API Tokens */}
      {canEdit && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-600" />
                API Tokens
              </CardTitle>
              <Button 
                size="sm" 
                className="bg-teal-600 hover:bg-teal-700"
                onClick={() => openTokenModal()}
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Token
              </Button>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Configure tokens de integração para pagamentos e outros serviços. 
              O primeiro token ativo será usado como padrão.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {tokensLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
              </div>
            ) : apiTokens.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 mb-4">
                  Nenhum token configurado
                </p>
                <p className="text-sm text-slate-400 max-w-md mx-auto mb-4">
                  Configure um token do Abacate Pay para habilitar pagamentos via PIX em doações de projetos.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => openTokenModal()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar primeiro token
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {apiTokens.map((token, index) => {
                  const provider = getProviderInfo(token.provider);
                  return (
                    <div 
                      key={token.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border ${
                        index === 0 ? 'border-teal-200 bg-teal-50/50 dark:border-teal-800 dark:bg-teal-900/20' : ''
                      }`}
                    >
                      {/* Drag handle */}
                      <div className="flex flex-col gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => moveToken(index, 'up')}
                          disabled={index === 0}
                        >
                          <GripVertical className="w-4 h-4 text-slate-400" />
                        </Button>
                      </div>

                      {/* Icon */}
                      <div className="text-2xl">{provider.icon}</div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{token.name}</span>
                          {index === 0 && (
                            <Badge className="bg-teal-600 text-white text-xs">
                              Padrão
                            </Badge>
                          )}
                          {!token.active && (
                            <Badge variant="secondary" className="text-xs">
                              Inativo
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 truncate">
                          {provider.name} • {token.token_masked}
                        </p>
                        {token.description && (
                          <p className="text-xs text-slate-400 truncate">
                            {token.description}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openTokenModal(token)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            if (confirm('Tem certeza que deseja excluir este token?')) {
                              deleteTokenMutation.mutate(token.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Dica:</strong> Para obter seu token do Abacate Pay, acesse o painel em{' '}
                <a 
                  href="https://abacatepay.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  abacatepay.com
                </a>{' '}
                e vá em Integração → API Keys.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Token */}
      <Dialog open={tokenModalOpen} onOpenChange={() => resetTokenForm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-600" />
              {editingToken ? 'Editar Token' : 'Novo Token'}
            </DialogTitle>
            <DialogDescription>
              {editingToken 
                ? 'Atualize as informações do token de API' 
                : 'Configure um novo token para integração de pagamentos'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Provedor *</Label>
              <Select
                value={tokenForm.provider}
                onValueChange={(v) => {
                  const provider = API_PROVIDERS.find(p => p.id === v);
                  setTokenForm({ 
                    ...tokenForm, 
                    provider: v,
                    name: tokenForm.name || provider?.name || '',
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o provedor" />
                </SelectTrigger>
                <SelectContent>
                  {API_PROVIDERS.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      <span className="flex items-center gap-2">
                        <span>{provider.icon}</span>
                        <span>{provider.name}</span>
                        <span className="text-xs text-slate-500">- {provider.description}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                placeholder="Ex: Meu Token Abacate Pay"
                value={tokenForm.name}
                onChange={(e) => setTokenForm({ ...tokenForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>
                Token {editingToken ? '(deixe vazio para manter o atual)' : '*'}
              </Label>
              <div className="relative">
                <Input
                  type={showToken ? 'text' : 'password'}
                  placeholder={editingToken ? '••••••••••••••••' : 'Cole seu token aqui'}
                  value={tokenForm.token}
                  onChange={(e) => setTokenForm({ ...tokenForm, token: e.target.value })}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="Ex: Token de produção"
                value={tokenForm.description}
                onChange={(e) => setTokenForm({ ...tokenForm, description: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border px-4 py-3">
              <div>
                <Label className="font-medium">Token ativo</Label>
                <p className="text-xs text-slate-500">
                  Tokens inativos não são usados para pagamentos
                </p>
              </div>
              <Switch
                checked={tokenForm.active}
                onCheckedChange={(v) => setTokenForm({ ...tokenForm, active: v })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={resetTokenForm}>
                Cancelar
              </Button>
              <Button 
                className="bg-teal-600 hover:bg-teal-700"
                onClick={handleSaveToken}
                disabled={createTokenMutation.isPending || updateTokenMutation.isPending}
              >
                {(createTokenMutation.isPending || updateTokenMutation.isPending) ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {editingToken ? 'Salvar' : 'Criar Token'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <p className="text-xs text-slate-400 text-center">
        Apenas gestores e administradores podem alterar essas configurações.
      </p>
    </div>
  );
}
