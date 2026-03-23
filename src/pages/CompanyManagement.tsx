import React, { useState, useEffect } from 'react';
import { polysApi } from '@/api/polysClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Building2, Search, ShieldCheck, ShieldAlert, MoreVertical, Ban, Lock, Unlock,
  Eye, ChevronRight, ChevronLeft, CheckCircle, XCircle, Clock, Package, Wrench,
  FolderOpen, DollarSign, FileText, Mail, Shield, Loader2, Briefcase, TrendingUp,
  Star, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

// ─── constants ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  restaurante: 'Restaurante', loja: 'Loja', servicos: 'Servicos',
  artesanato: 'Artesanato', tecnologia: 'Tecnologia', saude: 'Saude',
  educacao: 'Educacao', outro: 'Outro',
};

const CATEGORY_COLORS: Record<string, string> = {
  restaurante: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  loja: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  servicos: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  artesanato: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  tecnologia: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  saude: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  educacao: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  outro: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
};

const VERIFICATION_LABELS: Record<string, string> = {
  unverified: 'Nao verificada', pending_review: 'Em analise',
  documents_requested: 'Documentos pendentes', verified: 'Verificada', rejected: 'Rejeitada',
};

const VERIFICATION_COLORS: Record<string, string> = {
  unverified: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  pending_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  documents_requested: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  verified: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente', awaiting_seller: 'Aguardando', accepted: 'Aceito',
  rejected: 'Recusado', paid: 'Pago', shipped: 'Enviado',
  delivered: 'Entregue', cancelled: 'Cancelado', refunded: 'Reembolsado',
};

const PAGE_SIZE = 15;

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return '—';
  try { return format(new Date(d), "dd/MM/yyyy", { locale: ptBR }); } catch { return '—'; }
}

function fmtDateTime(d: string | Date | null | undefined) {
  if (!d) return '—';
  try { return format(new Date(d), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR }); } catch { return '—'; }
}

function fmtCurrency(v: number | null | undefined) {
  if (v == null) return 'R$ 0,00';
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Company Detail Modal ─────────────────────────────────────────────────────

function CompanyDetailModal({ company, open, onClose, onRefresh }: {
  company: any; open: boolean; onClose: () => void; onRefresh: () => void;
}) {
  const [detailTab, setDetailTab] = useState('perfil');
  const [verifyNote, setVerifyNote] = useState('');
  const [docNote, setDocNote] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ['companyStats', company?.id],
    queryFn: () => polysApi.companies.getStats(company.id),
    enabled: !!company?.id && open,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['companyProducts', company?.id],
    queryFn: () => polysApi.companies.getProducts(company.id),
    enabled: !!company?.id && open && detailTab === 'produtos',
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['companyOrders', company?.id],
    queryFn: () => polysApi.companies.getOrders(company.id),
    enabled: !!company?.id && open && detailTab === 'financeiro',
  });

  const { data: services = [] } = useQuery({
    queryKey: ['companyServices', company?.id],
    queryFn: () => polysApi.companies.getServices(company.id),
    enabled: !!company?.id && open && detailTab === 'produtos',
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['companyProjects', company?.id],
    queryFn: () => polysApi.companies.getProjects(company.id),
    enabled: !!company?.id && open && detailTab === 'projetos',
  });

  const verifyMutation = useMutation({
    mutationFn: (args: { status: string; note?: string }) =>
      polysApi.companies.updateVerification(company.id, args.status, args.note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      onRefresh();
      toast.success('Status de verificacao atualizado');
    },
    onError: () => toast.error('Erro ao atualizar verificacao'),
  });

  const blockMutation = useMutation({
    mutationFn: (action: string) => {
      if (action === 'block') return polysApi.users.block(company.id);
      if (action === 'unblock') return polysApi.users.unblock(company.id);
      if (action === 'ban') return polysApi.users.ban(company.id);
      return polysApi.users.unban(company.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      onRefresh();
      toast.success('Acao realizada com sucesso');
    },
  });

  const docMutation = useMutation({
    mutationFn: (note: string) => polysApi.companies.requestDocuments(company.id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      onRefresh();
      toast.success('Solicitacao de documentos enviada');
      setDocNote('');
    },
  });

  if (!company) return null;

  const vs = company.verification_status || 'unverified';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={company.avatar_url} />
              <AvatarFallback className="bg-teal-100 text-teal-700">
                {(company.full_name || company.email)?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <span className="flex items-center gap-2">
                {company.full_name || '—'}
                {company.is_verified && <ShieldCheck className="w-4 h-4 text-blue-500" />}
              </span>
              <p className="text-sm font-normal text-slate-500">{company.email}</p>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">Detalhes da empresa</DialogDescription>
        </DialogHeader>

        <Tabs value={detailTab} onValueChange={setDetailTab}>
          <TabsList className="w-full">
            <TabsTrigger value="perfil" className="gap-1"><Building2 className="w-4 h-4" /> Perfil</TabsTrigger>
            <TabsTrigger value="produtos" className="gap-1"><Package className="w-4 h-4" /> Produtos</TabsTrigger>
            <TabsTrigger value="financeiro" className="gap-1"><DollarSign className="w-4 h-4" /> Financeiro</TabsTrigger>
            <TabsTrigger value="projetos" className="gap-1"><FolderOpen className="w-4 h-4" /> Projetos</TabsTrigger>
          </TabsList>

          {/* PERFIL */}
          <TabsContent value="perfil" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Categoria</p>
                <Badge className={CATEGORY_COLORS[company.company_category] || CATEGORY_COLORS.outro}>
                  {CATEGORY_LABELS[company.company_category] || company.company_category || 'Nao informada'}
                </Badge>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Verificacao</p>
                <Badge className={VERIFICATION_COLORS[vs] || VERIFICATION_COLORS.unverified}>
                  {VERIFICATION_LABELS[vs] || vs}
                </Badge>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Telefone</p>
                <p className="text-sm">{company.phone || '—'}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Localizacao</p>
                <p className="text-sm">{company.city ? `${company.city}${company.state ? `, ${company.state}` : ''}` : '—'}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Website</p>
                <p className="text-sm">{company.company_website || '—'}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Cadastro</p>
                <p className="text-sm">{fmtDate(company.created_date)}</p>
              </div>
            </div>

            {company.company_description && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Descricao</p>
                <p className="text-sm bg-slate-50 dark:bg-slate-800 rounded p-3">{company.company_description}</p>
              </div>
            )}

            {company.company_document_url && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Documento</p>
                <a href={company.company_document_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-teal-600 hover:underline">
                  <FileText className="w-4 h-4" /> Ver documento <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {company.verification_note && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Nota do revisor</p>
                <p className="text-sm bg-amber-50 dark:bg-amber-900/20 rounded p-3 text-amber-800 dark:text-amber-300">
                  {company.verification_note}
                </p>
              </div>
            )}

            {/* Stats summary */}
            {stats && (
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Produtos', value: `${stats.products_active}/${stats.products_total}` },
                  { label: 'Servicos', value: `${stats.services_active}/${stats.services_total}` },
                  { label: 'Pedidos', value: stats.total_orders },
                  { label: 'Projetos', value: stats.projects_count },
                ].map(s => (
                  <Card key={s.label} className="border-0 shadow-sm">
                    <CardContent className="p-3 text-center">
                      <p className="text-lg font-bold">{s.value}</p>
                      <p className="text-xs text-slate-500">{s.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3 pt-2 border-t">
              <p className="text-xs font-medium text-slate-500 uppercase">Acoes</p>

              {vs !== 'verified' && (
                <div className="flex items-center gap-2">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => verifyMutation.mutate({ status: 'verified', note: verifyNote || undefined })}
                    disabled={verifyMutation.isPending}>
                    <CheckCircle className="w-4 h-4 mr-1" /> Verificar
                  </Button>
                  <Input placeholder="Nota (opcional)" value={verifyNote}
                    onChange={e => setVerifyNote(e.target.value)} className="flex-1 h-9" />
                </div>
              )}

              {vs === 'verified' && (
                <Button size="sm" variant="outline" className="text-amber-600"
                  onClick={() => verifyMutation.mutate({ status: 'unverified' })}>
                  <ShieldAlert className="w-4 h-4 mr-1" /> Remover verificacao
                </Button>
              )}

              {vs !== 'rejected' && vs !== 'verified' && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="text-red-600"
                    onClick={() => verifyMutation.mutate({ status: 'rejected', note: rejectNote || undefined })}
                    disabled={verifyMutation.isPending}>
                    <XCircle className="w-4 h-4 mr-1" /> Rejeitar
                  </Button>
                  <Input placeholder="Motivo da rejeicao" value={rejectNote}
                    onChange={e => setRejectNote(e.target.value)} className="flex-1 h-9" />
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline"
                  onClick={() => docMutation.mutate(docNote)}
                  disabled={docMutation.isPending || !docNote.trim()}>
                  <FileText className="w-4 h-4 mr-1" /> Solicitar documentos
                </Button>
                <Input placeholder="Quais documentos?" value={docNote}
                  onChange={e => setDocNote(e.target.value)} className="flex-1 h-9" />
              </div>

              <div className="flex gap-2 pt-2">
                {!company.is_blocked ? (
                  <Button size="sm" variant="outline" className="text-amber-600"
                    onClick={() => blockMutation.mutate('block')}>
                    <Lock className="w-4 h-4 mr-1" /> Bloquear
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="text-emerald-600"
                    onClick={() => blockMutation.mutate('unblock')}>
                    <Unlock className="w-4 h-4 mr-1" /> Desbloquear
                  </Button>
                )}
                {!company.is_banned ? (
                  <Button size="sm" variant="outline" className="text-red-600"
                    onClick={() => blockMutation.mutate('ban')}>
                    <Ban className="w-4 h-4 mr-1" /> Banir
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="text-emerald-600"
                    onClick={() => blockMutation.mutate('unban')}>
                    <Ban className="w-4 h-4 mr-1" /> Desbanir
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          {/* PRODUTOS & SERVICOS */}
          <TabsContent value="produtos" className="space-y-4 mt-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Package className="w-4 h-4" /> Produtos ({products.length})
            </h3>
            {products.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Nenhum produto cadastrado</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {products.map((p: any) => (
                  <Card key={p.id} className="border-0 shadow-sm overflow-hidden">
                    {p.images?.[0] && (
                      <div className="h-24 bg-slate-100 dark:bg-slate-800">
                        <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardContent className="p-3">
                      <p className="text-sm font-medium truncate">{p.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm font-bold text-teal-600">{fmtCurrency(p.price)}</p>
                        <Badge className={p.active
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800'}>
                          {p.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <h3 className="text-sm font-semibold flex items-center gap-2 pt-4 border-t">
              <Wrench className="w-4 h-4" /> Servicos ({services.length})
            </h3>
            {services.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Nenhum servico cadastrado</p>
            ) : (
              <div className="space-y-2">
                {services.map((s: any) => (
                  <Card key={s.id} className="border-0 shadow-sm">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{s.title}</p>
                        <p className="text-xs text-slate-500">{s.service_type || '—'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-teal-600">
                          {s.price_per_service ? fmtCurrency(s.price_per_service) :
                           s.price_per_hour ? `${fmtCurrency(s.price_per_hour)}/h` :
                           s.price_per_day ? `${fmtCurrency(s.price_per_day)}/dia` : '—'}
                        </p>
                        {s.rating > 0 && (
                          <p className="text-xs text-amber-500 flex items-center gap-0.5 justify-end">
                            <Star className="w-3 h-3" /> {s.rating?.toFixed(1)} ({s.reviews_count})
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* FINANCEIRO */}
          <TabsContent value="financeiro" className="space-y-4 mt-4">
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Receita Bruta', value: fmtCurrency(stats.gross_revenue), icon: DollarSign, color: 'text-emerald-600' },
                  { label: 'Total Pedidos', value: stats.total_orders, icon: Package, color: 'text-blue-600' },
                  { label: 'Ticket Medio', value: fmtCurrency(stats.avg_ticket), icon: TrendingUp, color: 'text-purple-600' },
                  { label: 'Projetos', value: stats.projects_count, icon: FolderOpen, color: 'text-teal-600' },
                ].map(s => (
                  <Card key={s.label} className="border-0 shadow-sm">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <s.icon className={`w-4 h-4 ${s.color}`} />
                        <p className="text-xs text-slate-500">{s.label}</p>
                      </div>
                      <p className="text-lg font-bold">{s.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <h3 className="text-sm font-semibold pt-2">Pedidos recentes</h3>
            {orders.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Nenhum pedido</p>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900">
                      <TableHead>Data</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Comprador</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.slice(0, 20).map((o: any) => (
                      <TableRow key={o.id}>
                        <TableCell className="text-xs">{fmtDate(o.created_at)}</TableCell>
                        <TableCell className="text-sm truncate max-w-[150px]">{o.product_title || '—'}</TableCell>
                        <TableCell className="text-xs text-slate-500">{o.user_email || '—'}</TableCell>
                        <TableCell className="text-sm font-medium">{fmtCurrency(o.total)}</TableCell>
                        <TableCell>
                          <Badge className="text-xs bg-slate-100 dark:bg-slate-800">
                            {ORDER_STATUS_LABELS[o.status] || o.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* PROJETOS */}
          <TabsContent value="projetos" className="space-y-3 mt-4">
            {projects.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">Nenhum projeto cadastrado</p>
            ) : (
              projects.map((p: any) => (
                <Card key={p.id} className="border-0 shadow-sm">
                  <CardContent className="p-4 flex items-start gap-3">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.title} className="w-16 h-16 rounded-lg object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
                        <FolderOpen className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{p.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{p.short_description || p.category || '—'}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span>Meta: {fmtCurrency(p.target_amount)}</span>
                        <span>Arrecadado: {fmtCurrency(p.current_amount)}</span>
                        <span>{p.votes_count} votos</span>
                      </div>
                    </div>
                    <Badge className="text-xs bg-slate-100 dark:bg-slate-800">{p.status}</Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CompanyManagement() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('empresas');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [tablePage, setTablePage] = useState(0);
  const [requestStatusFilter, setRequestStatusFilter] = useState<string | undefined>('pending');
  const queryClient = useQueryClient();

  useEffect(() => {
    polysApi.auth.me().then((u: any) => {
      const role = (u.user_role || u.role || '').toLowerCase();
      if (!['gestor', 'manager', 'administrador', 'admin'].includes(role)) {
        toast.error('Acesso negado');
        window.history.back();
        return;
      }
      setCurrentUser(u);
    }).catch(() => polysApi.auth.redirectToLogin());
  }, []);

  const { data: companies = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['companies'],
    queryFn: () => polysApi.companies.list(500),
    enabled: !!currentUser,
  });

  const { data: adminRequests = [] } = useQuery<any[]>({
    queryKey: ['adminRequests', requestStatusFilter],
    queryFn: () => polysApi.adminRequests.list(requestStatusFilter),
    enabled: !!currentUser && activeTab === 'solicitacoes',
  });

  const { data: auditLogs = [] } = useQuery<any[]>({
    queryKey: ['companyAuditLogs'],
    queryFn: () => polysApi.users.getAuditLogs({ action: 'verification', limit: 200 }),
    enabled: !!currentUser && activeTab === 'auditoria',
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => polysApi.adminRequests.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRequests'] });
      toast.success('Solicitacao aprovada!');
    },
    onError: () => toast.error('Erro ao aprovar'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      polysApi.adminRequests.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRequests'] });
      toast.success('Solicitacao rejeitada');
    },
    onError: () => toast.error('Erro ao rejeitar'),
  });

  // Filters
  const filtered = (companies as any[]).filter((c: any) => {
    const name = (c.full_name || c.email || '').toLowerCase();
    const matchSearch = name.includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const vs = c.verification_status || 'unverified';
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && !c.is_blocked && !c.is_banned) ||
      (statusFilter === 'verified' && c.is_verified) ||
      (statusFilter === 'pending' && vs === 'pending_review') ||
      (statusFilter === 'blocked' && c.is_blocked) ||
      (statusFilter === 'banned' && c.is_banned);

    const matchCategory = categoryFilter === 'all' || c.company_category === categoryFilter;

    return matchSearch && matchStatus && matchCategory;
  });

  const pendingVerification = (companies as any[]).filter(
    (c: any) => (c.verification_status || 'unverified') === 'pending_review'
  );

  // Stats
  const totalActive = (companies as any[]).filter(c => !c.is_blocked && !c.is_banned).length;
  const totalVerified = (companies as any[]).filter(c => c.is_verified).length;
  const totalPending = pendingVerification.length;
  const totalBlocked = (companies as any[]).filter(c => c.is_blocked && !c.is_banned).length;
  const totalBanned = (companies as any[]).filter(c => c.is_banned).length;

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestao de Empresas</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Verificacao, auditoria e gestao financeira das empresas cadastradas
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="empresas" className="gap-1.5">
            <Building2 className="w-4 h-4" /> Empresas
          </TabsTrigger>
          <TabsTrigger value="solicitacoes" className="gap-1.5">
            <Mail className="w-4 h-4" /> Solicitacoes
            {adminRequests.length > 0 && activeTab !== 'solicitacoes' && (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {adminRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="verificacao" className="gap-1.5">
            <ShieldCheck className="w-4 h-4" /> Verificacao
            {totalPending > 0 && (
              <span className="ml-1 bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {totalPending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="auditoria" className="gap-1.5">
            <Shield className="w-4 h-4" /> Auditoria
          </TabsTrigger>
        </TabsList>

        {/* ===== TAB: EMPRESAS ===== */}
        <TabsContent value="empresas" className="mt-4 space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[
              { label: 'Total', value: (companies as any[]).length, icon: Building2, color: 'bg-slate-100 dark:bg-slate-800', iconColor: 'text-slate-600 dark:text-slate-400', filter: 'all' },
              { label: 'Ativas', value: totalActive, icon: CheckCircle, color: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600', filter: 'active' },
              { label: 'Verificadas', value: totalVerified, icon: ShieldCheck, color: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600', filter: 'verified' },
              { label: 'Em analise', value: totalPending, icon: Clock, color: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600', filter: 'pending' },
              { label: 'Bloqueadas', value: totalBlocked, icon: Lock, color: 'bg-orange-100 dark:bg-orange-900/30', iconColor: 'text-orange-600', filter: 'blocked' },
              { label: 'Banidas', value: totalBanned, icon: Ban, color: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-red-600', filter: 'banned' },
            ].map(({ label, value, icon: Icon, color, iconColor, filter }) => (
              <Card key={label} className={`border-0 shadow-sm cursor-pointer transition-all hover:shadow-md ${statusFilter === filter ? 'ring-2 ring-teal-500' : ''}`}
                onClick={() => { setStatusFilter(filter); setTablePage(0); }}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${color}`}><Icon className={`w-5 h-5 ${iconColor}`} /></div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setTablePage(0); }}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setTablePage(0); }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setTablePage(0); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="verified">Verificadas</SelectItem>
                <SelectItem value="pending">Em analise</SelectItem>
                <SelectItem value="blocked">Bloqueadas</SelectItem>
                <SelectItem value="banned">Banidas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-900">
                  <TableHead>Empresa</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Verificacao</TableHead>
                  <TableHead>Produtos</TableHead>
                  <TableHead>Receita</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-400">Carregando...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-400">Nenhuma empresa encontrada</TableCell>
                  </TableRow>
                ) : filtered.slice(tablePage * PAGE_SIZE, (tablePage + 1) * PAGE_SIZE).map((c: any) => {
                  const vs = c.verification_status || 'unverified';
                  return (
                    <TableRow key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                      onClick={() => { setSelectedCompany(c); setDetailOpen(true); }}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={c.avatar_url} />
                            <AvatarFallback className="bg-teal-100 text-teal-700 text-xs">
                              {(c.full_name || c.email)?.charAt(0)?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate flex items-center gap-1">
                              {c.full_name || '—'}
                              {c.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{c.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${CATEGORY_COLORS[c.company_category] || CATEGORY_COLORS.outro}`}>
                          {CATEGORY_LABELS[c.company_category] || c.company_category || '—'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${VERIFICATION_COLORS[vs] || VERIFICATION_COLORS.unverified}`}>
                          {VERIFICATION_LABELS[vs] || vs}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{c.products_count}</TableCell>
                      <TableCell className="text-sm font-medium">{fmtCurrency(c.revenue)}</TableCell>
                      <TableCell className="text-xs text-slate-500">{fmtDate(c.created_date)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedCompany(c); setDetailOpen(true); }}>
                              <Eye className="w-4 h-4 mr-2" />Ver detalhes
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                {tablePage * PAGE_SIZE + 1}–{Math.min((tablePage + 1) * PAGE_SIZE, filtered.length)} de {filtered.length} empresas
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={tablePage === 0}
                  onClick={() => setTablePage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4 mr-1" />Anterior
                </Button>
                <span className="text-sm text-slate-600 dark:text-slate-400 min-w-[60px] text-center">
                  {tablePage + 1} / {Math.ceil(filtered.length / PAGE_SIZE)}
                </span>
                <Button size="sm" variant="outline" disabled={(tablePage + 1) * PAGE_SIZE >= filtered.length}
                  onClick={() => setTablePage(p => p + 1)}>
                  Proximo<ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ===== TAB: SOLICITACOES ===== */}
        <TabsContent value="solicitacoes" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Solicitacoes de acesso</h2>
            <Select value={requestStatusFilter || 'pending'} onValueChange={(v) => setRequestStatusFilter(v === 'all' ? undefined : v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="approved">Aprovadas</SelectItem>
                <SelectItem value="rejected">Rejeitadas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {adminRequests.length === 0 ? (
                <div className="p-12 text-center">
                  <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nenhuma solicitacao {requestStatusFilter === 'pending' ? 'pendente' : ''}</p>
                </div>
              ) : (
                <div className="divide-y">
                  {adminRequests.map((req: any) => (
                    <div key={req.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                          <Shield className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{req.name}</p>
                          <p className="text-sm text-slate-500">{req.email}</p>
                          {req.phone && <p className="text-sm text-slate-500">Tel: {req.phone}</p>}
                          {req.location && <p className="text-sm text-slate-500">Local: {req.location}</p>}
                          {req.objective && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 p-2 bg-slate-50 dark:bg-slate-800 rounded">
                              "{req.objective}"
                            </p>
                          )}
                          <p className="text-xs text-slate-400 mt-2">
                            {fmtDateTime(req.created_at)}
                          </p>
                          {req.status === 'approved' && (
                            <Badge className="mt-2 bg-emerald-100 text-emerald-700">Aprovada</Badge>
                          )}
                          {req.status === 'rejected' && (
                            <Badge className="mt-2 bg-red-100 text-red-700">Rejeitada</Badge>
                          )}
                        </div>
                      </div>
                      {req.status === 'pending' && (
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
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TAB: VERIFICACAO ===== */}
        <TabsContent value="verificacao" className="mt-4 space-y-4">
          <h2 className="text-lg font-semibold">
            Fila de verificacao ({pendingVerification.length})
          </h2>

          {pendingVerification.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nenhuma empresa aguardando verificacao</p>
              </CardContent>
            </Card>
          ) : (
            pendingVerification.map((c: any) => (
              <Card key={c.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={c.avatar_url} />
                      <AvatarFallback className="bg-amber-100 text-amber-700">
                        {(c.full_name || c.email)?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <div>
                        <p className="font-semibold">{c.full_name || '—'}</p>
                        <p className="text-sm text-slate-500">{c.email}</p>
                      </div>
                      <div className="flex gap-4 text-xs text-slate-500">
                        <span>Categoria: {CATEGORY_LABELS[c.company_category] || c.company_category || '—'}</span>
                        <span>Cadastro: {fmtDate(c.created_date)}</span>
                        <span>Produtos: {c.products_count}</span>
                        <span>Servicos: {c.services_count}</span>
                      </div>
                      {c.company_description && (
                        <p className="text-sm bg-slate-50 dark:bg-slate-800 rounded p-2">{c.company_description}</p>
                      )}
                      {c.company_document_url && (
                        <a href={c.company_document_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-teal-600 hover:underline">
                          <FileText className="w-4 h-4" /> Ver documento
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 ml-16">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => {
                        polysApi.companies.updateVerification(c.id, 'verified').then(() => {
                          queryClient.invalidateQueries({ queryKey: ['companies'] });
                          refetch();
                          toast.success(`${c.full_name} verificada!`);
                        });
                      }}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Verificar
                    </Button>
                    <Button size="sm" variant="outline"
                      onClick={() => { setSelectedCompany(c); setDetailOpen(true); }}>
                      <Eye className="w-4 h-4 mr-1" /> Ver detalhes
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600"
                      onClick={() => {
                        polysApi.companies.updateVerification(c.id, 'rejected', 'Documentacao insuficiente').then(() => {
                          queryClient.invalidateQueries({ queryKey: ['companies'] });
                          refetch();
                          toast.success('Empresa rejeitada');
                        });
                      }}>
                      <XCircle className="w-4 h-4 mr-1" /> Rejeitar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ===== TAB: AUDITORIA ===== */}
        <TabsContent value="auditoria" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {auditLogs.length === 0 ? (
                <div className="p-12 text-center">
                  <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nenhum registro de auditoria</p>
                </div>
              ) : (
                <div className="rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 dark:bg-slate-900">
                        <TableHead>Data</TableHead>
                        <TableHead>Gestor</TableHead>
                        <TableHead>Acao</TableHead>
                        <TableHead>Alvo</TableHead>
                        <TableHead>Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs">{fmtDateTime(log.created_at || log.createdAt)}</TableCell>
                          <TableCell className="text-sm">{log.actor_email || log.actorEmail || '—'}</TableCell>
                          <TableCell>
                            <Badge className="text-xs bg-slate-100 dark:bg-slate-800">
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{log.target_email || log.targetEmail || '—'}</TableCell>
                          <TableCell className="text-xs text-slate-500 max-w-[200px] truncate">
                            {log.details ? JSON.stringify(log.details) : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedCompany && (
        <CompanyDetailModal
          company={selectedCompany}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          onRefresh={refetch}
        />
      )}
    </div>
  );
}
