import React, { useState, useEffect } from 'react';
import { polysApi } from '@/api/polysClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Link2, Plus, Copy, Trash2, Clock, CheckCircle, XCircle,
  Mail, Loader2, Users, Shield, MapPin
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";

export default function InviteLinks() {
  const [user, setUser] = useState<any>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('7');

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await polysApi.auth.me();
        const canAccess = userData.user_role === 'gestor' || userData.user_role === 'administrador'
          || userData.account_type === 'ZONE_ADMIN';
        if (!canAccess) {
          toast.error('Acesso negado');
          window.history.back();
          return;
        }
        setUser(userData);
      } catch {
        window.location.href = '/';
      }
    };
    loadUser();
  }, []);

  const isManager = user?.user_role === 'gestor' || user?.user_role === 'administrador';

  // Zonas que o usuario pode gerenciar
  const { data: myZones = [] } = useQuery({
    queryKey: ['myZones'],
    queryFn: () => polysApi.entities.Zone.list('-created_date'),
    enabled: !!user,
  });

  // Links de convite da zona selecionada (ou todas para manager)
  const { data: inviteLinks = [], isLoading: linksLoading } = useQuery({
    queryKey: ['inviteLinks', selectedZoneId],
    queryFn: () => {
      if (!selectedZoneId) return [];
      return polysApi.inviteLinks.listByZone(selectedZoneId);
    },
    enabled: !!selectedZoneId,
  });

  // Admin requests (so gestores veem)
  const { data: adminRequests = [] } = useQuery({
    queryKey: ['adminRequests'],
    queryFn: () => polysApi.adminRequests.list('pending'),
    enabled: isManager,
  });

  // Auto-selecionar primeira zona
  useEffect(() => {
    if (myZones.length > 0 && !selectedZoneId) {
      setSelectedZoneId(myZones[0].id);
    }
  }, [myZones, selectedZoneId]);

  const createLinkMutation = useMutation({
    mutationFn: async () => {
      if (!selectedZoneId) throw new Error('Selecione uma zona');
      const expiresAt = expiresInDays
        ? new Date(Date.now() + parseInt(expiresInDays) * 86400000).toISOString()
        : undefined;
      return polysApi.inviteLinks.create({
        zone_id: selectedZoneId,
        max_uses: maxUses ? parseInt(maxUses) : undefined,
        expires_at: expiresAt,
      });
    },
    onSuccess: (link: any) => {
      queryClient.invalidateQueries({ queryKey: ['inviteLinks'] });
      const fullLink = `${window.location.origin}/join/${link.code}`;
      navigator.clipboard.writeText(fullLink).catch(() => {});
      toast.success(`Link criado! Código: ${link.code}`);
      setCreateModalOpen(false);
      setMaxUses('');
      setExpiresInDays('7');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao criar link'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => polysApi.inviteLinks.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inviteLinks'] });
      toast.success('Link desativado');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => polysApi.adminRequests.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRequests'] });
      toast.success('Solicitação aprovada! O usuário agora pode criar zonas.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      polysApi.adminRequests.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRequests'] });
      toast.success('Solicitação rejeitada');
    },
  });

  const copyCode = (code: string) => {
    const link = `${window.location.origin}/join/${code}`;
    navigator.clipboard.writeText(link);
    toast.success(`Link copiado! Código: ${code}`);
  };

  const getLinkStatus = (link: any) => {
    if (!link.active) return { label: 'Desativado', color: 'bg-slate-100 text-slate-600' };
    if (link.expires_at && new Date(link.expires_at) < new Date()) return { label: 'Expirado', color: 'bg-red-100 text-red-600' };
    if (link.max_uses > 0 && link.uses_count >= link.max_uses) return { label: 'Esgotado', color: 'bg-amber-100 text-amber-600' };
    return { label: 'Ativo', color: 'bg-green-100 text-green-600' };
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Links de Convite</h1>
          <p className="text-slate-500">Gerencie convites para suas zonas privadas</p>
        </div>
      </div>

      <Tabs defaultValue="invites">
        <TabsList>
          <TabsTrigger value="invites">
            <Link2 className="w-4 h-4 mr-1.5" /> Convites
          </TabsTrigger>
          {isManager && (
            <TabsTrigger value="requests">
              <Mail className="w-4 h-4 mr-1.5" /> Solicitações ({adminRequests.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="invites" className="mt-4 space-y-4">
          {/* Zone selector + create button */}
          <div className="flex items-center gap-3">
            <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Selecione uma zona" />
              </SelectTrigger>
              <SelectContent>
                {myZones.map((z: any) => (
                  <SelectItem key={z.id} value={z.id}>
                    <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: z.color || '#14b8a6' }} />
                    {z.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => setCreateModalOpen(true)} disabled={!selectedZoneId}>
              <Plus className="w-4 h-4 mr-2" /> Novo Convite
            </Button>
          </div>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {linksLoading ? (
                <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
              ) : !selectedZoneId ? (
                <div className="p-12 text-center">
                  <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Selecione uma zona para ver os convites</p>
                </div>
              ) : inviteLinks.length === 0 ? (
                <div className="p-12 text-center">
                  <Link2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nenhum convite criado para esta zona</p>
                </div>
              ) : (
                <div className="divide-y">
                  {inviteLinks.map((link: any) => {
                    const status = getLinkStatus(link);
                    return (
                      <div key={link.id} className="p-4 flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                          <Link2 className="w-5 h-5 text-teal-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-mono font-semibold text-lg">{link.code}</p>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                            <span>{link.uses_count}{link.max_uses > 0 ? `/${link.max_uses}` : ''} usos</span>
                            {link.expires_at && (
                              <span>Expira: {format(new Date(link.expires_at), 'dd/MM/yyyy')}</span>
                            )}
                            {link.created_by_email && <span>por {link.created_by_email}</span>}
                          </div>
                        </div>
                        <Badge className={status.color}>{status.label}</Badge>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => copyCode(link.code)} title="Copiar link">
                            <Copy className="w-4 h-4" />
                          </Button>
                          {link.active && (
                            <Button size="icon" variant="ghost" className="text-red-600" onClick={() => deactivateMutation.mutate(link.id)} title="Desativar">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isManager && (
          <TabsContent value="requests" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                {adminRequests.length === 0 ? (
                  <div className="p-12 text-center">
                    <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Nenhuma solicitação pendente</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {adminRequests.map((req: any) => (
                      <div key={req.id} className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="p-2 rounded-lg bg-amber-100">
                            <Shield className="w-5 h-5 text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{req.name}</p>
                            <p className="text-sm text-slate-500">{req.email}</p>
                            {req.phone && <p className="text-sm text-slate-500">Tel: {req.phone}</p>}
                            {req.location && <p className="text-sm text-slate-500">Local: {req.location}</p>}
                            {req.objective && (
                              <p className="text-sm text-slate-600 mt-2 p-2 bg-slate-50 dark:bg-slate-800 rounded">
                                "{req.objective}"
                              </p>
                            )}
                            <p className="text-xs text-slate-400 mt-2">
                              {format(new Date(req.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3 ml-14">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700"
                            onClick={() => approveMutation.mutate(req.id)}
                            disabled={approveMutation.isPending}>
                            {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                            Aprovar
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600"
                            onClick={() => rejectMutation.mutate({ id: req.id })}>
                            <XCircle className="w-4 h-4 mr-1" /> Rejeitar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Create Invite Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Link de Convite</DialogTitle>
            <DialogDescription>
              Crie um código de convite para a zona selecionada. Membros podem usar este código para entrar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Limite de usos (0 = ilimitado)</Label>
              <Input type="number" min="0" placeholder="0" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Expira em (dias)</Label>
              <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 dia</SelectItem>
                  <SelectItem value="3">3 dias</SelectItem>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="14">14 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="">Nunca expira</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-teal-600 hover:bg-teal-700"
              onClick={() => createLinkMutation.mutate()}
              disabled={createLinkMutation.isPending}>
              {createLinkMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Gerar Código de Convite
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
