import React, { useState, useEffect } from 'react';
import { polysApi } from '@/api/polysClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Link2, Plus, Copy, Trash2, Clock, CheckCircle, XCircle,
  Mail, Send, Loader2, Users, Shield
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";

export default function InviteLinks() {
  const [user, setUser] = useState<any>(null);
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [inviteType, setInviteType] = useState<string>('administrador');
  const [email, setEmail] = useState<string>('');
  const [zoneId, setZoneId] = useState<string>('');

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await polysApi.auth.me();
        if (userData.user_role !== 'gestor') {
          toast.error('Acesso negado');
          window.history.back();
          return;
        }
        setUser(userData);
      } catch (e) {
        window.location.href = '/';
      }
    };
    loadUser();
  }, []);

  // Fetch invite links
  const { data: invites = [], isLoading } = useQuery({
    queryKey: ['inviteLinks'],
    queryFn: () => polysApi.entities.InviteLink.list('-created_date'),
  });

  // Fetch zones for assignment
  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: () => polysApi.entities.Zone.filter({ active: true }),
  });

  // Fetch admin requests
  const { data: requests = [] } = useQuery({
    queryKey: ['adminRequests'],
    queryFn: () => polysApi.entities.AdminRequest.filter({ status: 'pending' }, '-created_date'),
  });

  const generateToken = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  const createInviteMutation = useMutation({
    mutationFn: async () => {
      if (!email) throw new Error('Informe o email');
      if (inviteType === 'administrador' && !zoneId) throw new Error('Selecione uma área');

      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      await polysApi.entities.InviteLink.create({
        token,
        type: inviteType,
        email,
        zone_id: inviteType === 'administrador' ? zoneId : null,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        created_by_email: user.email
      });

      // Send email with link
      const link = `${window.location.origin}/AdminCompleteRegister?token=${token}`;
      await polysApi.integrations.Core.SendEmail({
        to: email,
        subject: `Convite para ${inviteType === 'gestor' ? 'Gestor' : 'Administrador'} - POLYS`,
        body: `
Olá!

Você foi convidado para ser ${inviteType === 'gestor' ? 'Gestor' : 'Administrador'} na plataforma POLYS.

Clique no link abaixo para completar seu cadastro:
${link}

Este link expira em 7 dias.

Atenciosamente,
Equipe POLYS
        `
      });

      return { token, link };
    },
    onSuccess: ({ link }) => {
      queryClient.invalidateQueries(['inviteLinks']);
      toast.success('Convite criado e enviado por email!');
      navigator.clipboard.writeText(link);
      toast.info('Link copiado para a área de transferência');
      setCreateModalOpen(false);
      setEmail('');
      setZoneId('');
    },
    onError: (e) => {
      toast.error(e.message || 'Erro ao criar convite');
    }
  });

  const approveRequestMutation = useMutation({
    mutationFn: async ({ request, selectedZone }) => {
      // Update request status
      await polysApi.entities.AdminRequest.update(request.id, {
        status: 'approved',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString()
      });

      // Create invite
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await polysApi.entities.InviteLink.create({
        token,
        type: 'administrador',
        email: request.email,
        zone_id: selectedZone,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        created_by_email: user.email
      });

      // Send email
      const link = `${window.location.origin}/AdminCompleteRegister?token=${token}`;
      await polysApi.integrations.Core.SendEmail({
        to: request.email,
        subject: 'Sua solicitação foi aprovada - POLYS',
        body: `
Olá!

Sua solicitação para ser Administrador foi APROVADA!

Clique no link abaixo para completar seu cadastro:
${link}

Este link expira em 7 dias.

Atenciosamente,
Equipe POLYS
        `
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminRequests', 'inviteLinks']);
      toast.success('Solicitação aprovada e convite enviado!');
    }
  });

  const rejectRequestMutation = useMutation({
    mutationFn: async (request) => {
      await polysApi.entities.AdminRequest.update(request.id, {
        status: 'rejected',
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminRequests']);
      toast.success('Solicitação rejeitada');
    }
  });

  const deleteInviteMutation = useMutation({
    mutationFn: (id) => polysApi.entities.InviteLink.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['inviteLinks']);
      toast.success('Convite removido');
    }
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'used':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Utilizado</Badge>;
      case 'expired':
        return <Badge className="bg-slate-100 text-slate-700"><XCircle className="w-3 h-3 mr-1" />Expirado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const copyLink = (token) => {
    const link = `${window.location.origin}/AdminCompleteRegister?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado!');
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Links de Convite
          </h1>
          <p className="text-slate-500">Gerencie convites para Administradores e Gestores</p>
        </div>
        <Button 
          className="bg-teal-600 hover:bg-teal-700"
          onClick={() => setCreateModalOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Convite
        </Button>
      </div>

      <Tabs defaultValue="invites">
        <TabsList>
          <TabsTrigger value="invites">
            Convites ({invites.length})
          </TabsTrigger>
          <TabsTrigger value="requests">
            Solicitações ({requests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invites" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center">Carregando...</div>
              ) : invites.length === 0 ? (
                <div className="p-12 text-center">
                  <Link2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nenhum convite criado</p>
                </div>
              ) : (
                <div className="divide-y">
                  {invites.map(invite => (
                    <div key={invite.id} className="p-4 flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-slate-100">
                        {invite.type === 'gestor' ? (
                          <Shield className="w-5 h-5 text-purple-600" />
                        ) : (
                          <Users className="w-5 h-5 text-teal-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{invite.email}</p>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Badge variant="outline" className="text-xs">
                            {invite.type === 'gestor' ? 'Gestor' : 'Administrador'}
                          </Badge>
                          {invite.expires_at && (
                            <span>
                              Expira: {format(new Date(invite.expires_at), 'dd/MM/yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(invite.status)}
                      <div className="flex gap-1">
                        {invite.status === 'pending' && (
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => copyLink(invite.token)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        )}
                        <Button 
                          size="icon" 
                          variant="ghost"
                          className="text-red-600"
                          onClick={() => deleteInviteMutation.mutate(invite.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {requests.length === 0 ? (
                <div className="p-12 text-center">
                  <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nenhuma solicitação pendente</p>
                </div>
              ) : (
                <div className="divide-y">
                  {requests.map(request => (
                    <RequestCard 
                      key={request.id}
                      request={request}
                      zones={zones}
                      onApprove={(zoneId) => approveRequestMutation.mutate({ request, selectedZone: zoneId })}
                      onReject={() => rejectRequestMutation.mutate(request)}
                      isApproving={approveRequestMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Invite Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Convite</DialogTitle>
            <DialogDescription>
              Crie um link de convite para um novo membro
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Convite</Label>
              <Select value={inviteType} onValueChange={setInviteType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrador">Administrador de Área</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Email do Convidado</Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {inviteType === 'administrador' && (
              <div className="space-y-2">
                <Label>Área Atribuída</Label>
                <Select value={zoneId} onValueChange={setZoneId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a área" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map(zone => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button 
              className="w-full bg-teal-600 hover:bg-teal-700"
              onClick={() => createInviteMutation.mutate()}
              disabled={createInviteMutation.isPending}
            >
              {createInviteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Criar e Enviar Convite
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface RequestCardProps {
  request: any;
  zones: any[];
  onApprove: (zoneId: string) => void;
  onReject: () => void;
  isApproving: boolean;
}

function RequestCard({ request, zones, onApprove, onReject, isApproving }: RequestCardProps) {
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [showZoneSelect, setShowZoneSelect] = useState<boolean>(false);

  return (
    <div className="p-4">
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-amber-100">
          <Mail className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <p className="font-medium">{request.email}</p>
          <p className="text-sm text-slate-500">CPF: {request.cpf}</p>
          <p className="text-sm text-slate-500">Local: {request.location}</p>
          <p className="text-sm text-slate-600 mt-2 p-2 bg-slate-50 rounded">
            "{request.objective}"
          </p>
          <p className="text-xs text-slate-400 mt-2">
            {format(new Date(request.created_date), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
      </div>

      {showZoneSelect ? (
        <div className="mt-4 p-4 bg-slate-50 rounded-lg space-y-3">
          <Label>Selecione a área para este Administrador:</Label>
          <Select value={selectedZone} onValueChange={setSelectedZone}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha uma área" />
            </SelectTrigger>
            <SelectContent>
              {zones.map(zone => (
                <SelectItem key={zone.id} value={zone.id}>
                  {zone.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button 
              size="sm"
              variant="outline"
              onClick={() => setShowZoneSelect(false)}
            >
              Cancelar
            </Button>
            <Button 
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => onApprove(selectedZone)}
              disabled={!selectedZone || isApproving}
            >
              {isApproving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirmar Aprovação
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 mt-4">
          <Button 
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => setShowZoneSelect(true)}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Aprovar
          </Button>
          <Button 
            size="sm"
            variant="outline"
            className="text-red-600"
            onClick={onReject}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Rejeitar
          </Button>
        </div>
      )}
    </div>
  );
}