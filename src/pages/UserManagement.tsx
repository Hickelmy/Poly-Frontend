import React, { useState, useEffect } from 'react';
import { polysApi } from '@/api/polysClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Users, Search, Shield, ShieldOff, ShieldAlert, ShieldCheck,
  MoreVertical, UserCog, Ban, Lock, Unlock, Eye, Filter,
  Package, Wrench, FolderOpen, MessageSquare, ShoppingBag,
  ClipboardList, ChevronRight, AlertTriangle, CheckCircle2,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

// ─── helpers ─────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  USER: 'Usuário', usuario: 'Usuário',
  ADMIN: 'Administrador', administrador: 'Administrador',
  MANAGER: 'Gestor', gestor: 'Gestor',
  SUPPORT: 'Suporte', suporte: 'Suporte',
};

const ROLE_COLORS: Record<string, string> = {
  USER: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  usuario: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  ADMIN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  administrador: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  MANAGER: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  gestor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  SUPPORT: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  suporte: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const ACTION_LABELS: Record<string, string> = {
  block_user: 'Bloqueou usuário',
  unblock_user: 'Desbloqueou usuário',
  ban_user: 'Baniu usuário',
  unban_user: 'Desbaniu usuário',
  update_user_role: 'Alterou cargo',
};

function statusBadge(user: any) {
  if (user.is_banned || user.isBanned)
    return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 gap-1"><Ban className="w-3 h-3" />Banido</Badge>;
  if (user.is_blocked || user.isBlocked)
    return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 gap-1"><Lock className="w-3 h-3" />Bloqueado</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1"><CheckCircle2 className="w-3 h-3" />Ativo</Badge>;
}

function fmtDate(d: any) {
  if (!d) return '-';
  try { return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: ptBR }); } catch { return '-'; }
}

// ─── ActivitySection + ActivityItem ──────────────────────────────────────────

function ActivitySection({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
        <Icon className="w-4 h-4" />{title}
      </h4>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function ActivityItem({ title, date, badge, badgeColor }: { title: string; date?: string; badge?: string; badgeColor?: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700',
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-100 text-blue-700',
    teal: 'bg-teal-100 text-teal-700',
  };
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
      <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
      <span className="text-xs text-slate-700 dark:text-slate-300 flex-1 min-w-0 line-clamp-1">{title}</span>
      {badge && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${colorMap[badgeColor || 'slate'] || colorMap.slate}`}>
          {badge}
        </span>
      )}
      {date && <span className="text-[10px] text-slate-400 shrink-0">{fmtDate(date)}</span>}
    </div>
  );
}

// ─── UserDetailModal ─────────────────────────────────────────────────────────

interface UserDetailModalProps {
  user: any;
  open: boolean;
  onClose: () => void;
  currentUser: any;
  onRefresh: () => void;
}

function UserDetailModal({ user, open, onClose, currentUser, onRefresh }: UserDetailModalProps) {
  const [reasonInput, setReasonInput] = useState<string>('');
  const [confirmAction, setConfirmAction] = useState<{ type: string; label: string } | null>(null);
  const queryClient = useQueryClient();

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ['userActivity', user?.id],
    queryFn: () => polysApi.users.getActivity(user.id),
    enabled: open && !!user?.id,
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['userAuditLogs', user?.id],
    queryFn: () => polysApi.users.getAuditLogs({ targetId: user.id, limit: 50 }),
    enabled: open && !!user?.id,
  });

  const mutOpts = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['userAuditLogs', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['userActivity', user?.id] });
      onRefresh();
      setConfirmAction(null);
      setReasonInput('');
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao executar ação'),
  };

  const roleMutation = useMutation({
    mutationFn: (role: string) => polysApi.users.updateRole(user.id, role),
    ...mutOpts,
    onSuccess: () => { mutOpts.onSuccess(); toast.success('Cargo atualizado'); },
  });
  const blockMutation = useMutation({
    mutationFn: () => polysApi.users.block(user.id, reasonInput || undefined),
    ...mutOpts,
    onSuccess: () => { mutOpts.onSuccess(); toast.success('Usuário bloqueado'); },
  });
  const unblockMutation = useMutation({
    mutationFn: () => polysApi.users.unblock(user.id),
    ...mutOpts,
    onSuccess: () => { mutOpts.onSuccess(); toast.success('Usuário desbloqueado'); },
  });
  const banMutation = useMutation({
    mutationFn: () => polysApi.users.ban(user.id, reasonInput || undefined),
    ...mutOpts,
    onSuccess: () => { mutOpts.onSuccess(); toast.success('Usuário banido'); },
  });
  const unbanMutation = useMutation({
    mutationFn: () => polysApi.users.unban(user.id),
    ...mutOpts,
    onSuccess: () => { mutOpts.onSuccess(); toast.success('Usuário desbanido'); },
  });

  const execConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'block') blockMutation.mutate();
    else if (confirmAction.type === 'unblock') unblockMutation.mutate();
    else if (confirmAction.type === 'ban') banMutation.mutate();
    else if (confirmAction.type === 'unban') unbanMutation.mutate();
  };

  const isBlocked = user?.is_blocked || user?.isBlocked;
  const isBanned = user?.is_banned || user?.isBanned;

  if (!user) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0 pb-2 border-b">
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={user.avatar_url || user.avatarUrl} />
                <AvatarFallback className="bg-teal-100 text-teal-700">
                  {(user.full_name || user.name || user.email)?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold truncate">{user.full_name || user.name || 'Sem nome'}</p>
                <p className="text-sm text-slate-500 font-normal truncate">{user.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {statusBadge(user)}
                <Badge className={ROLE_COLORS[user.user_role || user.role] || ROLE_COLORS.USER}>
                  {ROLE_LABELS[user.user_role || user.role] || 'Usuário'}
                </Badge>
              </div>
            </DialogTitle>
            <DialogDescription className="text-xs mt-1">
              Cadastrado em {fmtDate(user.created_date || user.createdAt)}
              {user.city && ` · ${user.city}${user.state ? `, ${user.state}` : ''}`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 pt-4">
            <Tabs defaultValue="activity">
              <TabsList className="w-full mb-4">
                <TabsTrigger value="activity" className="flex-1">Atividade</TabsTrigger>
                <TabsTrigger value="moderation" className="flex-1">Moderação</TabsTrigger>
                <TabsTrigger value="audit" className="flex-1">
                  Auditoria {(auditLogs as any[]).length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px]">
                      {(auditLogs as any[]).length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* ── ACTIVITY TAB ── */}
              <TabsContent value="activity" className="space-y-4 mt-0">
                {activityLoading ? (
                  <div className="text-center py-8 text-slate-400">Carregando atividade...</div>
                ) : activity ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {[
                        { icon: Package, label: 'Produtos', count: activity.products?.length, color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30' },
                        { icon: Wrench, label: 'Serviços', count: activity.services?.length, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' },
                        { icon: FolderOpen, label: 'Projetos', count: activity.projects?.length, color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' },
                        { icon: MessageSquare, label: 'Comentários', count: activity.comments?.length, color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' },
                        { icon: ShoppingBag, label: 'Pedidos', count: activity.orders?.length, color: 'bg-green-100 text-green-600 dark:bg-green-900/30' },
                      ].map(({ icon: Icon, label, count, color }) => (
                        <Card key={label} className="border-0 shadow-sm">
                          <CardContent className="p-3 flex items-center gap-2">
                            <div className={`p-2 rounded-lg ${color}`}><Icon className="w-4 h-4" /></div>
                            <div>
                              <p className="text-lg font-bold text-slate-900 dark:text-white">{count ?? 0}</p>
                              <p className="text-xs text-slate-500">{label}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {activity.products?.length > 0 && (
                      <ActivitySection title="Produtos cadastrados" icon={Package}>
                        {activity.products.slice(0, 10).map((p: any) => (
                          <ActivityItem key={p.id} title={p.title} date={p.createdAt}
                            badge={p.active ? 'Ativo' : 'Inativo'} badgeColor={p.active ? 'emerald' : 'slate'} />
                        ))}
                      </ActivitySection>
                    )}

                    {activity.services?.length > 0 && (
                      <ActivitySection title="Serviços cadastrados" icon={Wrench}>
                        {activity.services.slice(0, 10).map((s: any) => (
                          <ActivityItem key={s.id} title={s.title} date={s.createdAt}
                            badge={s.active ? 'Ativo' : 'Inativo'} badgeColor={s.active ? 'emerald' : 'slate'} />
                        ))}
                      </ActivitySection>
                    )}

                    {activity.projects?.length > 0 && (
                      <ActivitySection title="Projetos criados" icon={FolderOpen}>
                        {activity.projects.slice(0, 10).map((p: any) => (
                          <ActivityItem key={p.id} title={p.title} date={p.createdAt}
                            badge={p.status} badgeColor="blue" />
                        ))}
                      </ActivitySection>
                    )}

                    {activity.comments?.length > 0 && (
                      <ActivitySection title="Comentários em notícias" icon={MessageSquare}>
                        {activity.comments.slice(0, 10).map((c: any) => (
                          <ActivityItem key={c.id}
                            title={c.content?.slice(0, 100) + (c.content?.length > 100 ? '…' : '')}
                            date={c.createdAt} />
                        ))}
                      </ActivitySection>
                    )}

                    {activity.orders?.length > 0 && (
                      <ActivitySection title="Pedidos realizados" icon={ShoppingBag}>
                        {activity.orders.slice(0, 10).map((o: any) => (
                          <ActivityItem key={o.id}
                            title={`Pedido #${o.id.slice(-6).toUpperCase()} · R$ ${(o.total || 0).toFixed(2)}`}
                            date={o.createdAt} badge={o.status} badgeColor="teal" />
                        ))}
                      </ActivitySection>
                    )}

                    {!activity.products?.length && !activity.services?.length &&
                      !activity.projects?.length && !activity.comments?.length && !activity.orders?.length && (
                      <div className="text-center py-8 text-slate-400">Nenhuma atividade registrada</div>
                    )}
                  </>
                ) : null}
              </TabsContent>

              {/* ── MODERATION TAB ── */}
              <TabsContent value="moderation" className="space-y-5 mt-0">
                {(isBlocked || isBanned) && (
                  <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
                    <CardContent className="p-4 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-800 dark:text-amber-400">
                          {isBanned ? 'Usuário banido do sistema' : 'Conta bloqueada'}
                        </p>
                        {(user.blocked_reason || user.blockedReason) && (
                          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            Motivo: {user.blocked_reason || user.blockedReason}
                          </p>
                        )}
                        {(user.blocked_at || user.blockedAt) && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            Em {fmtDate(user.blocked_at || user.blockedAt)}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Cargo */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Cargo do usuário</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { role: 'USER', label: 'Usuário', icon: Users },
                      { role: 'SUPPORT', label: 'Suporte', icon: ShieldCheck },
                      { role: 'ADMIN', label: 'Administrador', icon: Shield },
                      { role: 'MANAGER', label: 'Gestor', icon: ShieldAlert },
                    ].map(({ role, label, icon: Icon }) => {
                      const cur = (user.user_role || user.role || '').toUpperCase();
                      const active = cur === role;
                      return (
                        <Button key={role}
                          variant={active ? 'default' : 'outline'}
                          className={active ? 'bg-teal-600 hover:bg-teal-700' : ''}
                          disabled={active || roleMutation.isPending}
                          onClick={() => roleMutation.mutate(role)}
                        >
                          <Icon className="w-4 h-4 mr-2" />{label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Motivo */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Motivo da ação (opcional)</Label>
                  <Textarea
                    value={reasonInput}
                    onChange={(e) => setReasonInput(e.target.value)}
                    placeholder="Descreva o motivo para bloquear ou banir este usuário..."
                    rows={3}
                  />
                </div>

                {/* Ações */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  {!isBlocked && !isBanned && (
                    <Button variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                      onClick={() => setConfirmAction({ type: 'block', label: 'Bloquear conta' })}>
                      <Lock className="w-4 h-4 mr-2" />Bloquear conta
                    </Button>
                  )}
                  {isBlocked && !isBanned && (
                    <Button variant="outline" className="border-green-400 text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                      onClick={() => setConfirmAction({ type: 'unblock', label: 'Desbloquear conta' })}>
                      <Unlock className="w-4 h-4 mr-2" />Desbloquear conta
                    </Button>
                  )}
                  {!isBanned && (
                    <Button variant="outline" className="border-red-400 text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => setConfirmAction({ type: 'ban', label: 'Banir do sistema' })}>
                      <Ban className="w-4 h-4 mr-2" />Banir do sistema
                    </Button>
                  )}
                  {isBanned && (
                    <Button variant="outline" className="border-blue-400 text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      onClick={() => setConfirmAction({ type: 'unban', label: 'Desbanir' })}>
                      <ShieldOff className="w-4 h-4 mr-2" />Desbanir usuário
                    </Button>
                  )}
                </div>

                <p className="text-xs text-slate-400 pt-1">
                  ⚠ Bloquear impede o login. Banir impede login e re-cadastro com o mesmo e-mail.
                  Todas as ações ficam permanentemente registradas na auditoria.
                </p>
              </TabsContent>

              {/* ── AUDIT TAB ── */}
              <TabsContent value="audit" className="mt-0">
                {(auditLogs as any[]).length === 0 ? (
                  <div className="text-center py-8 text-slate-400">Nenhum registro de auditoria para este usuário</div>
                ) : (
                  <div className="space-y-2">
                    {(auditLogs as any[]).map((log: any) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                          <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {ACTION_LABELS[log.action] || log.action}
                          </p>
                          {log.actorEmail && (
                            <p className="text-xs text-slate-500 mt-0.5">por {log.actorEmail}</p>
                          )}
                          {log.details?.reason && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                              Motivo: {log.details.reason}
                            </p>
                          )}
                          {log.details?.new_role && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                              Novo cargo: {ROLE_LABELS[log.details.new_role] || log.details.new_role}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 shrink-0">{fmtDate(log.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(v) => { if (!v) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {confirmAction?.label}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'ban'
                ? `Banir "${user.full_name || user.name || user.email}" impede login e re-cadastro com este e-mail. Esta ação fica registrada permanentemente.`
                : confirmAction?.type === 'block'
                ? `Bloquear "${user.full_name || user.name || user.email}" impede que a conta seja usada até ser desbloqueada.`
                : `Confirmar ação para "${user.full_name || user.name || user.email}"?`}
              {reasonInput && (
                <span className="block mt-2 p-2 rounded bg-slate-100 dark:bg-slate-800 text-sm font-medium">
                  Motivo: {reasonInput}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={execConfirm}
              className={
                confirmAction?.type === 'ban' ? 'bg-red-600 hover:bg-red-700' :
                confirmAction?.type === 'block' ? 'bg-amber-600 hover:bg-amber-700' :
                'bg-teal-600 hover:bg-teal-700'
              }
            >
              {confirmAction?.label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UserManagement() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState<boolean>(false);

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

  const { data: users = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['allUsers'],
    queryFn: () => polysApi.users.list({ limit: 500 }),
    enabled: !!currentUser,
  });

  const filtered = (users as any[]).filter((u: any) => {
    const name = (u.full_name || u.name || '').toLowerCase();
    const matchSearch = name.includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const role = (u.user_role || u.role || '').toLowerCase();
    const matchRole = roleFilter === 'all' || role === roleFilter ||
      (roleFilter === 'user' && (role === 'user' || role === 'usuario')) ||
      (roleFilter === 'admin' && (role === 'admin' || role === 'administrador')) ||
      (roleFilter === 'manager' && (role === 'manager' || role === 'gestor')) ||
      (roleFilter === 'support' && (role === 'support' || role === 'suporte'));

    const isBlocked = u.is_blocked || u.isBlocked;
    const isBanned = u.is_banned || u.isBanned;
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && !isBlocked && !isBanned) ||
      (statusFilter === 'blocked' && isBlocked && !isBanned) ||
      (statusFilter === 'banned' && isBanned);

    return matchSearch && matchRole && matchStatus;
  });

  const totalActive = (users as any[]).filter((u: any) => !u.is_blocked && !u.isBlocked && !u.is_banned && !u.isBanned).length;
  const totalBlocked = (users as any[]).filter((u: any) => (u.is_blocked || u.isBlocked) && !(u.is_banned || u.isBanned)).length;
  const totalBanned = (users as any[]).filter((u: any) => u.is_banned || u.isBanned).length;

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestão de Usuários</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Moderação, cargos e auditoria de todos os usuários da plataforma
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: (users as any[]).length, icon: Users, color: 'bg-slate-100 dark:bg-slate-800', iconColor: 'text-slate-600 dark:text-slate-400' },
          { label: 'Ativos', value: totalActive, icon: CheckCircle2, color: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600' },
          { label: 'Bloqueados', value: totalBlocked, icon: Lock, color: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600' },
          { label: 'Banidos', value: totalBanned, icon: Ban, color: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-red-600' },
        ].map(({ label, value, icon: Icon, color, iconColor }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${color}`}><Icon className={`w-5 h-5 ${iconColor}`} /></div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                <p className="text-sm text-slate-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Buscar por nome ou email..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-44">
                <Filter className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cargos</SelectItem>
                <SelectItem value="user">Usuário</SelectItem>
                <SelectItem value="support">Suporte</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="manager">Gestor</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <Activity className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="blocked">Bloqueados</SelectItem>
                <SelectItem value="banned">Banidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Usuários ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400">Carregando usuários...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">Nenhum usuário encontrado</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Localização</TableHead>
                    <TableHead className="hidden lg:table-cell">Cadastro</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u: any) => (
                    <TableRow
                      key={u.id}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      onClick={() => { setSelectedUser(u); setDetailOpen(true); }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarImage src={u.avatar_url || u.avatarUrl} />
                            <AvatarFallback className="bg-teal-100 text-teal-700 text-xs">
                              {(u.full_name || u.name || u.email)?.charAt(0)?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{u.full_name || u.name || 'Sem nome'}</p>
                            <p className="text-xs text-slate-500 truncate">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${ROLE_COLORS[u.user_role || u.role] || ROLE_COLORS.USER}`}>
                          {ROLE_LABELS[u.user_role || u.role] || 'Usuário'}
                        </Badge>
                      </TableCell>
                      <TableCell>{statusBadge(u)}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-slate-500">
                        {u.city ? `${u.city}${u.state ? `, ${u.state}` : ''}` : '-'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-slate-400">
                        {fmtDate(u.created_date || u.createdAt)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedUser(u); setDetailOpen(true); }}>
                              <Eye className="w-4 h-4 mr-2" />Ver perfil e atividade
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedUser(u); setDetailOpen(true); }}>
                              <UserCog className="w-4 h-4 mr-2" />Alterar cargo
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-amber-600" onClick={() => { setSelectedUser(u); setDetailOpen(true); }}>
                              <Lock className="w-4 h-4 mr-2" />Bloquear / Desbloquear
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => { setSelectedUser(u); setDetailOpen(true); }}>
                              <Ban className="w-4 h-4 mr-2" />Banir / Desbanir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <UserDetailModal
        user={selectedUser}
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedUser(null); }}
        currentUser={currentUser}
        onRefresh={() => refetch()}
      />
    </div>
  );
}
