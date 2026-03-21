import React, { useState, useEffect, useMemo } from 'react';
import { polysApi } from '@/api/polysClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Users, Search, Shield, ShieldOff, ShieldAlert, ShieldCheck,
  MoreVertical, UserCog, Ban, Lock, Unlock, Eye, Filter,
  Package, Wrench, FolderOpen, MessageSquare, ShoppingBag,
  ClipboardList, ChevronRight, AlertTriangle, CheckCircle2,
  Activity, MousePointerClick, Globe, Clock, BarChart2, RefreshCw,
  Star, Megaphone, Trash2, Sparkles, Edit3, AlertOctagon, CheckSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

// ─── constants ────────────────────────────────────────────────────────────────

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
  block_user: 'Bloqueou usuário', unblock_user: 'Desbloqueou usuário',
  ban_user: 'Baniu usuário', unban_user: 'Desbaniu usuário',
  update_user_role: 'Alterou cargo',
  content_active: 'Reativou conteúdo', content_restricted: 'Restringiu conteúdo',
  content_removed: 'Removeu conteúdo', content_highlighted: 'Destacou conteúdo',
  content_approved: 'Aprovou conteúdo', content_moderated: 'Moderou conteúdo',
};

const MOD_STATUS_LABELS: Record<string, string> = {
  active: 'Ativo', restricted: 'Restrito', removed: 'Removido',
  highlighted: 'Destacado', approved: 'Aprovado',
};

const MOD_STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  restricted: 'bg-amber-100 text-amber-700',
  removed: 'bg-red-100 text-red-700',
  highlighted: 'bg-purple-100 text-purple-700',
  approved: 'bg-teal-100 text-teal-700',
};

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// ─── helpers ──────────────────────────────────────────────────────────────────

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

// ─── ApprovalSeal ─────────────────────────────────────────────────────────────

interface ApprovalSealProps {
  approvedByEmail?: string;
  approvedAt?: string;
  approvalNote?: string;
  small?: boolean;
}

function ApprovalSeal({ approvedByEmail, approvedAt, approvalNote, small }: ApprovalSealProps) {
  const sz = small ? 'w-14 h-14' : 'w-28 h-28';
  const tipText = [
    approvedAt ? `Aprovado em ${fmtDate(approvedAt)}` : '',
    approvedByEmail ? `por ${approvedByEmail}` : '',
    approvalNote ? `"${approvalNote}"` : '',
  ].filter(Boolean).join(' · ');

  return (
    <div className={`relative flex-shrink-0 ${sz} select-none`} title={tipText}>
      <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full drop-shadow-md">
        {/* Outer dashed ceremonial ring */}
        <circle cx="60" cy="60" r="57" fill="none" stroke="#92400e" strokeWidth="1.2" strokeDasharray="3 2.5" />
        {/* Main background */}
        <circle cx="60" cy="60" r="53" fill="url(#sealGrad)" stroke="#d97706" strokeWidth="2.5" />
        {/* Inner decorative ring */}
        <circle cx="60" cy="60" r="45" fill="none" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="2.5 3" />
        {/* Gradient definition */}
        <defs>
          <radialGradient id="sealGrad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#fffdf0" />
            <stop offset="100%" stopColor="#fef3c7" />
          </radialGradient>
        </defs>
        {/* Top star */}
        <polygon points="60,10 62.6,17.5 70.6,17.5 64.3,22.3 66.9,29.8 60,25 53.1,29.8 55.7,22.3 49.4,17.5 57.4,17.5"
          fill="#d97706" />
        {/* Bottom star */}
        <polygon points="60,110 62.6,102.5 70.6,102.5 64.3,97.7 66.9,90.2 60,95 53.1,90.2 55.7,97.7 49.4,102.5 57.4,102.5"
          fill="#d97706" />
        {/* Left ornament */}
        <circle cx="14" cy="60" r="3" fill="#f59e0b" />
        <circle cx="22" cy="60" r="1.5" fill="#d97706" />
        {/* Right ornament */}
        <circle cx="106" cy="60" r="3" fill="#f59e0b" />
        <circle cx="98" cy="60" r="1.5" fill="#d97706" />
        {/* Horizontal accent lines */}
        <line x1="26" y1="47" x2="94" y2="47" stroke="#f59e0b" strokeWidth="0.7" />
        <line x1="26" y1="73" x2="94" y2="73" stroke="#f59e0b" strokeWidth="0.7" />
      </svg>
      {/* Text overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 pointer-events-none">
        <span className={`font-black uppercase tracking-widest text-amber-900 leading-none ${small ? 'text-[6px]' : 'text-[11px]'}`}>
          Aprovado
        </span>
        <span className={`font-bold uppercase tracking-wider text-amber-800 leading-none ${small ? 'text-[5px]' : 'text-[8px]'}`}>
          pela gestão
        </span>
        <div className={`border-t border-amber-600 ${small ? 'w-6 my-px' : 'w-10 my-1'}`} />
        <span className={`font-extrabold text-amber-700 leading-none ${small ? 'text-[5px]' : 'text-[9px]'}`}>
          ✦ POLYS ✦
        </span>
      </div>
    </div>
  );
}

// ─── CalendarHeatmap ──────────────────────────────────────────────────────────

function CalendarHeatmap({ daily }: { daily: Record<string, number> }) {
  const cells = useMemo(() => {
    const today = new Date();
    const arr: { date: string; count: number; weekday: number }[] = [];
    for (let i = 90; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      arr.push({ date: key, count: daily[key] ?? 0, weekday: d.getDay() });
    }
    return arr;
  }, [daily]);

  const max = Math.max(...cells.map((c) => c.count), 1);

  const color = (n: number) => {
    if (n === 0) return 'bg-slate-100 dark:bg-slate-800';
    const r = n / max;
    if (r < 0.25) return 'bg-teal-200 dark:bg-teal-900/60';
    if (r < 0.5) return 'bg-teal-400 dark:bg-teal-700';
    if (r < 0.75) return 'bg-teal-500 dark:bg-teal-600';
    return 'bg-teal-600 dark:bg-teal-500';
  };

  // Group into columns (weeks), pad start
  const weeks: (typeof cells[0] | null)[][] = [];
  let col: (typeof cells[0] | null)[] = Array(cells[0]?.weekday ?? 0).fill(null);
  for (const cell of cells) {
    col.push(cell);
    if (col.length === 7) { weeks.push(col); col = []; }
  }
  if (col.length) weeks.push(col);

  return (
    <div className="space-y-2">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) =>
              day ? (
                <div key={di}
                  title={`${day.date}: ${day.count} evento${day.count !== 1 ? 's' : ''}`}
                  className={`w-3 h-3 rounded-sm cursor-default transition-transform hover:scale-125 ${color(day.count)}`}
                />
              ) : (
                <div key={di} className="w-3 h-3" />
              )
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 justify-between">
        <div className="flex gap-0.5 text-[9px]">
          {WEEKDAY_LABELS.map((l) => <span key={l} className="w-3 text-center">{l[0]}</span>)}
        </div>
        <div className="flex items-center gap-1">
          <span>Menos</span>
          {['bg-slate-100 dark:bg-slate-800', 'bg-teal-200', 'bg-teal-400', 'bg-teal-500', 'bg-teal-600'].map((c, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
          ))}
          <span>Mais</span>
        </div>
      </div>
    </div>
  );
}

// ─── HourlyChart ──────────────────────────────────────────────────────────────

function HourlyChart({ hourly }: { hourly: number[] }) {
  const max = Math.max(...hourly, 1);
  return (
    <div className="space-y-1">
      <div className="flex items-end gap-px h-14">
        {hourly.map((v, h) => (
          <div key={h} className="flex-1 flex flex-col justify-end" title={`${String(h).padStart(2, '0')}h: ${v} eventos`}>
            <div
              className="w-full rounded-t-sm bg-teal-500 dark:bg-teal-600 hover:bg-teal-400 transition-colors"
              style={{ height: `${Math.round((v / max) * 100)}%`, minHeight: v > 0 ? '3px' : '0' }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[9px] text-slate-400 px-0.5">
        {[0, 3, 6, 9, 12, 15, 18, 21, 23].map((h) => (
          <span key={h}>{String(h).padStart(2, '0')}h</span>
        ))}
      </div>
    </div>
  );
}

// ─── WeekdayChart ─────────────────────────────────────────────────────────────

function WeekdayChart({ weekday }: { weekday: number[] }) {
  const max = Math.max(...weekday, 1);
  return (
    <div className="flex items-end gap-1 h-10">
      {weekday.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5"
          title={`${WEEKDAY_LABELS[i]}: ${v} eventos`}>
          <div
            className="w-full rounded-t-sm bg-purple-400 dark:bg-purple-700 hover:bg-purple-500 transition-colors"
            style={{ height: `${Math.round((v / max) * 100)}%`, minHeight: v > 0 ? '3px' : '0' }}
          />
          <span className="text-[8px] text-slate-400">{WEEKDAY_LABELS[i][0]}</span>
        </div>
      ))}
    </div>
  );
}

// ─── ActivitySection ──────────────────────────────────────────────────────────

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

// ─── ContentItem (activity item with moderation actions) ──────────────────────

interface ContentItemProps {
  entityType: string;
  entityId: string;
  title: string;
  date?: string;
  badge?: string;
  badgeColor?: string;
  moderation: any;
  onModerate: (entityType: string, entityId: string, action: any) => void;
  onApprove: (entityType: string, entityId: string) => void;
  onRevokeApproval: (entityType: string, entityId: string) => void;
}

function ContentItem({
  entityType, entityId, title, date, badge, badgeColor,
  moderation, onModerate, onApprove, onRevokeApproval,
}: ContentItemProps) {
  const [noticeInput, setNoticeInput] = useState('');
  const [showNoticeInput, setShowNoticeInput] = useState(false);
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700',
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-100 text-blue-700',
    teal: 'bg-teal-100 text-teal-700',
  };

  const status = moderation?.status ?? 'active';
  const isApproved = status === 'approved';
  const isRemoved = status === 'removed';

  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-lg transition-all ${
      isRemoved ? 'bg-red-50 dark:bg-red-900/10 opacity-60' :
      isApproved ? 'bg-teal-50 dark:bg-teal-900/10 border border-teal-200 dark:border-teal-800' :
      status === 'highlighted' ? 'bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800' :
      status === 'restricted' ? 'bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800' :
      'bg-slate-50 dark:bg-slate-800/50'
    }`}>
      <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />

      {isApproved && <ApprovalSeal small approvedByEmail={moderation?.approvedByEmail} approvedAt={moderation?.approvedAt} />}

      <span className="text-xs text-slate-700 dark:text-slate-300 flex-1 min-w-0 line-clamp-1">{title}</span>

      {moderation?.managerNotice && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-0.5 shrink-0 max-w-[100px] truncate">
          <Megaphone className="w-2.5 h-2.5 flex-shrink-0" />{moderation.managerNotice}
        </span>
      )}

      {status !== 'active' && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${MOD_STATUS_COLORS[status] ?? ''}`}>
          {MOD_STATUS_LABELS[status]}
        </span>
      )}

      {badge && !moderation && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${colorMap[badgeColor || 'slate'] || colorMap.slate}`}>
          {badge}
        </span>
      )}

      {date && <span className="text-[10px] text-slate-400 shrink-0">{fmtDate(date)}</span>}

      {/* Moderation actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0">
            <MoreVertical className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => onModerate(entityType, entityId, { status: 'highlighted' })}>
            <Sparkles className="w-3.5 h-3.5 mr-2 text-purple-500" />Destacar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onModerate(entityType, entityId, { status: 'restricted' })}>
            <AlertOctagon className="w-3.5 h-3.5 mr-2 text-amber-500" />Restringir
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onModerate(entityType, entityId, { status: 'removed' })}>
            <Trash2 className="w-3.5 h-3.5 mr-2 text-red-500" />Remover (soft)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowNoticeInput((v) => !v)}>
            <Megaphone className="w-3.5 h-3.5 mr-2 text-blue-500" />
            {moderation?.managerNotice ? 'Editar aviso' : 'Adicionar aviso'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onModerate(entityType, entityId, { wasEdited: true })}>
            <Edit3 className="w-3.5 h-3.5 mr-2 text-slate-500" />Marcar como editado
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {!isApproved ? (
            <DropdownMenuItem onClick={() => onApprove(entityType, entityId)}>
              <CheckSquare className="w-3.5 h-3.5 mr-2 text-teal-600" />Aprovar com selo
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => onRevokeApproval(entityType, entityId)}>
              <ShieldOff className="w-3.5 h-3.5 mr-2 text-slate-500" />Revogar aprovação
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onModerate(entityType, entityId, { status: 'active', managerNotice: null })}>
            <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-500" />Reativar / limpar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Inline notice input */}
      {showNoticeInput && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3 w-64">
          <p className="text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300">Aviso público no conteúdo</p>
          <Input
            value={noticeInput}
            onChange={(e) => setNoticeInput(e.target.value)}
            placeholder="Ex: Conteúdo em revisão pela equipe"
            className="h-8 text-xs mb-2"
          />
          <div className="flex gap-1.5">
            <Button size="sm" className="flex-1 h-7 text-xs bg-teal-600 hover:bg-teal-700"
              onClick={() => {
                onModerate(entityType, entityId, { managerNotice: noticeInput });
                setShowNoticeInput(false);
                setNoticeInput('');
              }}>
              Salvar
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => setShowNoticeInput(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── UserDetailModal ──────────────────────────────────────────────────────────

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
  const [eventsPage, setEventsPage] = useState<string>('');
  const [eventsAction, setEventsAction] = useState<string>('');
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

  const { data: userEvents, isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['userEvents', user?.id, eventsPage, eventsAction],
    queryFn: () => polysApi.events.getByUser(user.id, {
      limit: 200,
      page: eventsPage || undefined,
      action: eventsAction || undefined,
    }),
    enabled: open && !!user?.id,
  });

  const { data: contentMod, isLoading: contentModLoading } = useQuery({
    queryKey: ['contentMod', user?.id],
    queryFn: () => polysApi.contentModeration.getByUser(user.id),
    enabled: open && !!user?.id,
  });

  // Build a lookup map: "entityType:entityId" → moderation record
  const modMap = useMemo(() => {
    const m: Record<string, any> = {};
    if (contentMod?.items) {
      for (const item of contentMod.items) {
        if (item.moderation) m[`${item.entityType}:${item.entityId}`] = item.moderation;
      }
    }
    return m;
  }, [contentMod]);

  const invalidateContent = () => {
    queryClient.invalidateQueries({ queryKey: ['contentMod', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['userAuditLogs', user?.id] });
  };

  const moderateMutation = useMutation({
    mutationFn: ({ et, eid, data }: { et: string; eid: string; data: any }) =>
      polysApi.contentModeration.upsert(et, eid, data),
    onSuccess: () => { invalidateContent(); toast.success('Moderação aplicada'); },
    onError: (e: any) => toast.error(e?.message || 'Erro'),
  });

  const approveMutation = useMutation({
    mutationFn: ({ et, eid }: { et: string; eid: string }) =>
      polysApi.contentModeration.approve(et, eid),
    onSuccess: () => { invalidateContent(); toast.success('Conteúdo aprovado com selo'); },
    onError: (e: any) => toast.error(e?.message || 'Erro'),
  });

  const revokeApprovalMutation = useMutation({
    mutationFn: ({ et, eid }: { et: string; eid: string }) =>
      polysApi.contentModeration.revokeApproval(et, eid),
    onSuccess: () => { invalidateContent(); toast.success('Aprovação revogada'); },
    onError: (e: any) => toast.error(e?.message || 'Erro'),
  });

  const mutOpts = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['userAuditLogs', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['userActivity', user?.id] });
      onRefresh(); setConfirmAction(null); setReasonInput('');
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

  const handleModerate = (et: string, eid: string, data: any) =>
    moderateMutation.mutate({ et, eid, data });
  const handleApprove = (et: string, eid: string) =>
    approveMutation.mutate({ et, eid });
  const handleRevokeApproval = (et: string, eid: string) =>
    revokeApprovalMutation.mutate({ et, eid });

  const isBlocked = user?.is_blocked || user?.isBlocked;
  const isBanned = user?.is_banned || user?.isBanned;

  if (!user) return null;

  const heatmap = userEvents?.heatmap;
  const totalDurSec = userEvents?.totalDurationSec ?? 0;
  const totalDurLabel = totalDurSec >= 3600
    ? `${Math.round(totalDurSec / 3600)}h`
    : `${Math.round(totalDurSec / 60)}min`;

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
                <TabsTrigger value="behavior" className="flex-1 gap-1">
                  <MousePointerClick className="w-3.5 h-3.5" />Comportamento
                </TabsTrigger>
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

                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <AlertOctagon className="w-3 h-3" />
                      Use o menu ⋮ em cada item para moderar, aprovar, restringir ou adicionar avisos.
                    </p>

                    {activity.products?.length > 0 && (
                      <ActivitySection title="Produtos cadastrados" icon={Package}>
                        {activity.products.slice(0, 15).map((p: any) => (
                          <div key={p.id} className="relative">
                            <ContentItem
                              entityType="product" entityId={p.id}
                              title={p.title} date={p.createdAt}
                              badge={p.active ? 'Ativo' : 'Inativo'} badgeColor={p.active ? 'emerald' : 'slate'}
                              moderation={modMap[`product:${p.id}`]}
                              onModerate={handleModerate} onApprove={handleApprove} onRevokeApproval={handleRevokeApproval}
                            />
                          </div>
                        ))}
                      </ActivitySection>
                    )}

                    {activity.services?.length > 0 && (
                      <ActivitySection title="Serviços cadastrados" icon={Wrench}>
                        {activity.services.slice(0, 15).map((s: any) => (
                          <div key={s.id} className="relative">
                            <ContentItem
                              entityType="service" entityId={s.id}
                              title={s.title} date={s.createdAt}
                              badge={s.active ? 'Ativo' : 'Inativo'} badgeColor={s.active ? 'emerald' : 'slate'}
                              moderation={modMap[`service:${s.id}`]}
                              onModerate={handleModerate} onApprove={handleApprove} onRevokeApproval={handleRevokeApproval}
                            />
                          </div>
                        ))}
                      </ActivitySection>
                    )}

                    {activity.projects?.length > 0 && (
                      <ActivitySection title="Projetos criados" icon={FolderOpen}>
                        {activity.projects.slice(0, 15).map((p: any) => (
                          <div key={p.id} className="relative">
                            <ContentItem
                              entityType="project" entityId={p.id}
                              title={p.title} date={p.createdAt}
                              badge={p.status} badgeColor="blue"
                              moderation={modMap[`project:${p.id}`]}
                              onModerate={handleModerate} onApprove={handleApprove} onRevokeApproval={handleRevokeApproval}
                            />
                          </div>
                        ))}
                      </ActivitySection>
                    )}

                    {activity.comments?.length > 0 && (
                      <ActivitySection title="Comentários em notícias" icon={MessageSquare}>
                        {activity.comments.slice(0, 15).map((c: any) => (
                          <div key={c.id} className="relative">
                            <ContentItem
                              entityType="comment" entityId={c.id}
                              title={c.content?.slice(0, 100) + (c.content?.length > 100 ? '…' : '')}
                              date={c.createdAt}
                              moderation={modMap[`comment:${c.id}`]}
                              onModerate={handleModerate} onApprove={handleApprove} onRevokeApproval={handleRevokeApproval}
                            />
                          </div>
                        ))}
                      </ActivitySection>
                    )}

                    {activity.orders?.length > 0 && (
                      <ActivitySection title="Pedidos realizados" icon={ShoppingBag}>
                        {activity.orders.slice(0, 10).map((o: any) => (
                          <div key={o.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                            <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="text-xs text-slate-700 dark:text-slate-300 flex-1 min-w-0 line-clamp-1">
                              Pedido #{o.id.slice(-6).toUpperCase()} · R$ {(o.total || 0).toFixed(2)}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 shrink-0">{o.status}</span>
                            <span className="text-[10px] text-slate-400 shrink-0">{fmtDate(o.createdAt)}</span>
                          </div>
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

              {/* ── BEHAVIOR TAB ── */}
              <TabsContent value="behavior" className="space-y-5 mt-0">
                {/* Filters */}
                <div className="flex gap-2 flex-wrap">
                  <Input
                    placeholder="Filtrar por página (ex: /marketplace)"
                    value={eventsPage}
                    onChange={(e) => setEventsPage(e.target.value)}
                    className="flex-1 min-w-0 h-8 text-xs"
                  />
                  <Select value={eventsAction} onValueChange={setEventsAction}>
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="pageview">Pageview</SelectItem>
                      <SelectItem value="click">Clique</SelectItem>
                      <SelectItem value="search">Busca</SelectItem>
                      <SelectItem value="filter">Filtro</SelectItem>
                      <SelectItem value="feature_use">Feature</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => refetchEvents()}>
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {eventsLoading ? (
                  <div className="text-center py-8 text-slate-400">Carregando dados comportamentais...</div>
                ) : userEvents ? (
                  <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { icon: Globe, label: 'Páginas únicas', value: userEvents.topPages?.length ?? 0, color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30' },
                        { icon: MousePointerClick, label: 'Total de eventos', value: userEvents.total ?? 0, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' },
                        { icon: Activity, label: 'Sessões', value: userEvents.totalSessions ?? 0, color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' },
                        { icon: Clock, label: 'Tempo registrado', value: totalDurLabel, color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' },
                      ].map(({ icon: Icon, label, value, color }) => (
                        <Card key={label} className="border-0 shadow-sm">
                          <CardContent className="p-3 flex items-center gap-2">
                            <div className={`p-2 rounded-lg ${color}`}><Icon className="w-4 h-4" /></div>
                            <div>
                              <p className="text-base font-bold text-slate-900 dark:text-white">{value}</p>
                              <p className="text-xs text-slate-500">{label}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Calendar heatmap */}
                    {heatmap?.daily && Object.keys(heatmap.daily).length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <BarChart2 className="w-4 h-4" />Mapa de calor — últimos 90 dias
                        </h4>
                        <CalendarHeatmap daily={heatmap.daily} />
                      </div>
                    )}

                    {/* Hourly + weekday charts side by side */}
                    {heatmap?.hourly && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Clock className="w-4 h-4" />Atividade por hora do dia
                          </h4>
                          <HourlyChart hourly={heatmap.hourly} />
                        </div>
                        {heatmap?.weekday && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                              <Activity className="w-4 h-4" />Atividade por dia da semana
                            </h4>
                            <WeekdayChart weekday={heatmap.weekday} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Top pages */}
                    {userEvents.topPages?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <Globe className="w-4 h-4" />Páginas mais acessadas
                        </h4>
                        <div className="space-y-1.5">
                          {userEvents.topPages.map((p: any) => {
                            const pct = Math.round((p.count / (userEvents.topPages[0]?.count || 1)) * 100);
                            return (
                              <div key={p.page} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="text-xs text-slate-700 dark:text-slate-300 flex-1 font-mono truncate">{p.page}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                    <div className="h-full bg-teal-500 rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-[10px] text-slate-500 w-6 text-right">{p.count}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Action frequency */}
                    {userEvents.actionFreq && Object.keys(userEvents.actionFreq).length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <Activity className="w-4 h-4" />Distribuição de ações
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(userEvents.actionFreq as Record<string, number>)
                            .sort((a, b) => b[1] - a[1])
                            .map(([action, count]) => (
                              <span key={action}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                                {action}
                                <span className="text-[10px] text-slate-400">{count}</span>
                              </span>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Recent events timeline */}
                    {userEvents.recent?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <Clock className="w-4 h-4" />Eventos recentes
                          <span className="text-xs font-normal text-slate-400">
                            ({userEvents.recent.length} de {userEvents.total})
                          </span>
                        </h4>
                        <div className="space-y-1">
                          {userEvents.recent.map((ev: any) => (
                            <div key={ev.id} className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-xs">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${
                                ev.action === 'pageview' ? 'bg-teal-100 text-teal-700' :
                                ev.action === 'click' ? 'bg-blue-100 text-blue-700' :
                                ev.action === 'search' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>{ev.action}</span>
                              <span className="font-mono text-slate-600 dark:text-slate-400 flex-1 truncate">{ev.page}</span>
                              {ev.target && <span className="text-[10px] text-slate-400 shrink-0 truncate max-w-[80px]">{ev.target}</span>}
                              {ev.duration != null && <span className="text-[10px] text-slate-400 shrink-0">{ev.duration}s</span>}
                              <span className="text-[10px] text-slate-400 shrink-0">{fmtDate(ev.createdAt)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {userEvents.total === 0 && (
                      <div className="text-center py-8 text-slate-400">
                        Nenhum evento comportamental registrado para este usuário ainda.
                      </div>
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

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Motivo da ação (opcional)</Label>
                  <Textarea
                    value={reasonInput}
                    onChange={(e) => setReasonInput(e.target.value)}
                    placeholder="Descreva o motivo para bloquear ou banir este usuário..."
                    rows={3}
                  />
                </div>

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
                          {log.actorEmail && <p className="text-xs text-slate-500 mt-0.5">por {log.actorEmail}</p>}
                          {log.details?.reason && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Motivo: {log.details.reason}</p>
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

      <AlertDialog open={!!confirmAction} onOpenChange={(v) => { if (!v) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />{confirmAction?.label}
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
            <AlertDialogAction onClick={execConfirm}
              className={
                confirmAction?.type === 'ban' ? 'bg-red-600 hover:bg-red-700' :
                confirmAction?.type === 'block' ? 'bg-amber-600 hover:bg-amber-700' :
                'bg-teal-600 hover:bg-teal-700'
              }>
              {confirmAction?.label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

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
          Moderação, cargos, conteúdo e auditoria de todos os usuários da plataforma
        </p>
      </div>

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
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
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
          <SelectTrigger className="w-40">
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

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-900">
              <TableHead>Usuário</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-400">Carregando...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-400">Nenhum usuário encontrado</TableCell>
              </TableRow>
            ) : filtered.map((u: any) => (
              <TableRow key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                onClick={() => { setSelectedUser(u); setDetailOpen(true); }}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={u.avatar_url || u.avatarUrl} />
                      <AvatarFallback className="bg-teal-100 text-teal-700 text-xs">
                        {(u.full_name || u.name || u.email)?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.full_name || u.name || '—'}</p>
                      <p className="text-xs text-slate-500 truncate">{u.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={`${ROLE_COLORS[u.user_role || u.role] || ROLE_COLORS.USER} text-xs`}>
                    {ROLE_LABELS[u.user_role || u.role] || 'Usuário'}
                  </Badge>
                </TableCell>
                <TableCell>{statusBadge(u)}</TableCell>
                <TableCell className="text-sm text-slate-500">
                  {u.city ? `${u.city}${u.state ? `, ${u.state}` : ''}` : '—'}
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  {fmtDate(u.created_date || u.createdAt)}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSelectedUser(u); setDetailOpen(true); }}>
                        <Eye className="w-4 h-4 mr-2" />Ver detalhes
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          currentUser={currentUser}
          onRefresh={refetch}
        />
      )}
    </div>
  );
}
