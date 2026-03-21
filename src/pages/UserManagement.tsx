import React, { useState, useEffect, useMemo } from 'react';
import { polysApi } from '@/api/polysClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Users, Search, Shield, ShieldOff, ShieldAlert, ShieldCheck,
  MoreVertical, UserCog, Ban, Lock, Unlock, Eye, Filter,
  Package, Wrench, FolderOpen, MessageSquare, ShoppingBag, Newspaper,
  ClipboardList, ChevronRight, ChevronLeft, AlertTriangle, CheckCircle2,
  Activity, MousePointerClick, Globe, Clock, BarChart2, RefreshCw,
  Star, Megaphone, Trash2, Sparkles, Edit3, AlertOctagon, CheckSquare, EyeOff,
  Undo2,
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
  verify_user: 'Verificou perfil', unverify_user: 'Removeu verificação de perfil',
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

function fmtRelative(d: any): string {
  if (!d) return 'Nunca';
  const ms = Date.now() - new Date(d).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'Agora';
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}m`;
  return `${Math.floor(months / 12)}a`;
}

// ─── ApprovalSeal ─────────────────────────────────────────────────────────────

interface ApprovalSealProps {
  approvedByEmail?: string;
  approvedAt?: string;
  approvalNote?: string;
  small?: boolean;
}

function ApprovalSeal({ approvedByEmail, approvedAt, approvalNote, small }: ApprovalSealProps) {
  const sz = small ? 'w-14 h-14' : 'w-24 h-24';
  const tipText = [
    approvedAt ? `Aprovado em ${fmtDate(approvedAt)}` : '',
    approvedByEmail ? `por ${approvedByEmail}` : '',
    approvalNote ? `"${approvalNote}"` : '',
  ].filter(Boolean).join(' · ');

  return (
    <div className={`flex-shrink-0 ${sz} select-none`} title={tipText}>
      <img src={aprovadoImg} alt="Aprovado pela gestão" className="w-full h-full object-contain drop-shadow-md" />
    </div>
  );
}

// ─── Verified Badge (custom image) ───────────────────────────────────────────

import verificadoImg from '@/assets/verificado.png';
import aprovadoImg from '@/assets/aprovado.png';

function VerifiedBadge({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-7 h-7' };
  return (
    <img src={verificadoImg} alt="Perfil verificado" title="Perfil verificado" className={`${sizes[size]} inline-block shrink-0 object-contain`} />
  );
}

// ─── CalendarHeatmap ──────────────────────────────────────────────────────────

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function CalendarHeatmap({ daily }: { daily: Record<string, number> }) {
  const { weeks, months, max } = useMemo(() => {
    const today = new Date();
    // Start from Sunday of the week 12 full weeks ago
    const start = new Date(today);
    start.setDate(start.getDate() - 12 * 7 - start.getDay());

    const arr: { date: string; count: number; weekday: number; month: number; day: number }[] = [];
    const d = new Date(start);
    while (d <= today) {
      const key = d.toISOString().split('T')[0];
      arr.push({
        date: key,
        count: daily[key] ?? 0,
        weekday: d.getDay(),
        month: d.getMonth(),
        day: d.getDate(),
      });
      d.setDate(d.getDate() + 1);
    }

    // Build weeks (columns)
    const wks: (typeof arr[0] | null)[][] = [];
    let col: (typeof arr[0] | null)[] = [];
    for (const cell of arr) {
      if (col.length === 0 && cell.weekday > 0 && wks.length === 0) {
        col = Array(cell.weekday).fill(null);
      }
      col.push(cell);
      if (col.length === 7) { wks.push(col); col = []; }
    }
    if (col.length) {
      while (col.length < 7) col.push(null);
      wks.push(col);
    }

    // Detect months for top labels
    const mos: { label: string; col: number }[] = [];
    let lastMonth = -1;
    wks.forEach((week, wi) => {
      const firstDay = week.find((c) => c != null);
      if (firstDay && firstDay.month !== lastMonth) {
        mos.push({ label: MONTH_LABELS[firstDay.month], col: wi });
        lastMonth = firstDay.month;
      }
    });

    return { weeks: wks, months: mos, max: Math.max(...arr.map((c) => c.count), 1) };
  }, [daily]);

  const intensity = (n: number): string => {
    if (n === 0) return 'bg-[#161b22] dark:bg-[#161b22]';
    const r = n / max;
    if (r <= 0.25) return 'bg-[#0e4429] dark:bg-[#0e4429]';
    if (r <= 0.5) return 'bg-[#006d32] dark:bg-[#006d32]';
    if (r <= 0.75) return 'bg-[#26a641] dark:bg-[#26a641]';
    return 'bg-[#39d353] dark:bg-[#39d353]';
  };

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex flex-col gap-0">
        {/* Month labels */}
        <div className="flex" style={{ marginLeft: 28 }}>
          {weeks.map((_, wi) => {
            const mo = months.find((m) => m.col === wi);
            return (
              <div key={wi} style={{ width: 13, marginRight: 2 }} className="shrink-0">
                {mo && <span className="text-[10px] text-slate-400 leading-none">{mo.label}</span>}
              </div>
            );
          })}
        </div>

        <div className="flex gap-0">
          {/* Weekday labels */}
          <div className="flex flex-col shrink-0" style={{ width: 26 }}>
            {['', 'Seg', '', 'Qua', '', 'Sex', ''].map((l, i) => (
              <div key={i} style={{ height: 11, marginBottom: 2 }} className="flex items-center">
                <span className="text-[9px] text-slate-400 leading-none">{l}</span>
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex gap-[2px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[2px]">
                {week.map((cell, di) => (
                  <div
                    key={di}
                    title={cell ? `${cell.date}: ${cell.count} evento${cell.count !== 1 ? 's' : ''}` : ''}
                    className={`w-[11px] h-[11px] rounded-[2px] transition-all ${
                      cell ? `${intensity(cell.count)} hover:ring-1 hover:ring-slate-400 cursor-default` : 'bg-transparent'
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-2 justify-end">
          <span className="text-[10px] text-slate-400">Menos</span>
          {['bg-[#161b22]', 'bg-[#0e4429]', 'bg-[#006d32]', 'bg-[#26a641]', 'bg-[#39d353]'].map((c, i) => (
            <div key={i} className={`w-[11px] h-[11px] rounded-[2px] ${c}`} />
          ))}
          <span className="text-[10px] text-slate-400">Mais</span>
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
      <div className="flex items-end gap-[2px] h-20 px-1">
        {hourly.map((v, h) => {
          const pct = Math.round((v / max) * 100);
          const green = v === 0 ? '#161b22' : pct <= 25 ? '#0e4429' : pct <= 50 ? '#006d32' : pct <= 75 ? '#26a641' : '#39d353';
          return (
            <div key={h} className="flex-1 flex flex-col justify-end group" title={`${String(h).padStart(2, '0')}h: ${v} eventos`}>
              <div
                className="w-full rounded-t-sm transition-all group-hover:opacity-80"
                style={{ height: `${Math.max(pct, v > 0 ? 4 : 0)}%`, backgroundColor: green }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[9px] text-slate-400 px-1">
        {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
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
    <div className="space-y-1">
      <div className="flex items-end gap-2 h-20 px-1">
        {weekday.map((v, i) => {
          const pct = Math.round((v / max) * 100);
          const green = v === 0 ? '#161b22' : pct <= 25 ? '#0e4429' : pct <= 50 ? '#006d32' : pct <= 75 ? '#26a641' : '#39d353';
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 group"
              title={`${WEEKDAY_LABELS[i]}: ${v} eventos`}>
              <span className="text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">{v}</span>
              <div
                className="w-full rounded-t-sm transition-all group-hover:opacity-80"
                style={{ height: `${Math.max(pct, v > 0 ? 5 : 0)}%`, backgroundColor: green }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[9px] text-slate-400 px-1">
        {WEEKDAY_LABELS.map((l) => <span key={l} className="flex-1 text-center">{l}</span>)}
      </div>
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

// ─── ModerationConfigDialog ──────────────────────────────────────────────────

type ModAction = 'highlighted' | 'restricted' | 'removed' | 'notice' | 'edited' | 'approve' | 'revoke' | 'clear';

const MOD_ACTION_META: Record<ModAction, { label: string; description: string; color: string; icon: any; hasDuration: boolean }> = {
  highlighted: {
    label: 'Destacar conteúdo',
    description: 'O conteúdo será visualmente destacado na plataforma por um período definido.',
    color: 'text-purple-600', icon: Sparkles, hasDuration: true,
  },
  restricted: {
    label: 'Restringir conteúdo',
    description: 'O conteúdo ficará oculto/limitado na plataforma por um período definido.',
    color: 'text-amber-600', icon: AlertOctagon, hasDuration: true,
  },
  removed: {
    label: 'Remover conteúdo (soft)',
    description: 'O conteúdo será removido visualmente mas permanece no banco de dados.',
    color: 'text-red-600', icon: Trash2, hasDuration: false,
  },
  notice: {
    label: 'Adicionar aviso',
    description: 'Um aviso público será exibido junto ao conteúdo para todos os usuários.',
    color: 'text-blue-600', icon: Megaphone, hasDuration: false,
  },
  edited: {
    label: 'Marcar como editado',
    description: 'Indica que o conteúdo foi editado pela moderação.',
    color: 'text-slate-600', icon: Edit3, hasDuration: false,
  },
  approve: {
    label: 'Aprovar com selo',
    description: 'O conteúdo receberá um selo oficial de aprovação da gestão Polys.',
    color: 'text-teal-600', icon: CheckSquare, hasDuration: false,
  },
  revoke: {
    label: 'Revogar aprovação',
    description: 'Remove o selo de aprovação do conteúdo.',
    color: 'text-slate-500', icon: ShieldOff, hasDuration: false,
  },
  clear: {
    label: 'Reativar / limpar',
    description: 'Remove toda moderação e retorna o conteúdo ao estado normal.',
    color: 'text-emerald-600', icon: CheckCircle2, hasDuration: false,
  },
};

const DURATION_OPTIONS = [
  { label: '1 hora', hours: 1 },
  { label: '6 horas', hours: 6 },
  { label: '12 horas', hours: 12 },
  { label: '1 dia', hours: 24 },
  { label: '3 dias', hours: 72 },
  { label: '7 dias', hours: 168 },
  { label: '15 dias', hours: 360 },
  { label: '30 dias', hours: 720 },
  { label: 'Permanente', hours: 0 },
];

interface ModerationConfigDialogProps {
  open: boolean;
  onClose: () => void;
  action: ModAction | null;
  entityType: string;
  entityId: string;
  entityTitle: string;
  currentModeration: any;
  onSubmit: (data: { action: ModAction; payload: any }) => void;
}

function ModerationConfigDialog({
  open, onClose, action, entityType, entityId, entityTitle,
  currentModeration, onSubmit,
}: ModerationConfigDialogProps) {
  const [notice, setNotice] = useState(currentModeration?.managerNotice || '');
  const [noticeVisible, setNoticeVisible] = useState(currentModeration?.noticeVisible ?? true);
  const [editNote, setEditNote] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [durationHours, setDurationHours] = useState(24);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setNotice(currentModeration?.managerNotice || '');
      setNoticeVisible(currentModeration?.noticeVisible ?? true);
      setEditNote('');
      setApprovalNote('');
      setDurationHours(24);
      setReason('');
    }
  }, [open, currentModeration]);

  if (!action) return null;
  const meta = MOD_ACTION_META[action];
  const Icon = meta.icon;

  const handleSubmit = () => {
    let payload: any = {};

    if (action === 'highlighted' || action === 'restricted') {
      const expiresAt = durationHours > 0
        ? new Date(Date.now() + durationHours * 3600_000).toISOString()
        : null;
      payload = { status: action, managerNotice: notice || null, noticeVisible, expiresAt };
    } else if (action === 'removed') {
      payload = { status: 'removed', managerNotice: reason || null, noticeVisible };
    } else if (action === 'notice') {
      payload = { managerNotice: notice || null, noticeVisible };
    } else if (action === 'edited') {
      payload = { wasEdited: true, editNote: editNote || null };
    } else if (action === 'approve') {
      payload = { _approve: true, approvalNote: approvalNote || undefined };
    } else if (action === 'revoke') {
      payload = { _revoke: true };
    } else if (action === 'clear') {
      payload = { status: 'active', managerNotice: null, expiresAt: null };
    }

    onSubmit({ action, payload });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${meta.color}`} />
            {meta.label}
          </DialogTitle>
          <DialogDescription className="text-xs">{meta.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Target info */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs">
            <span className="text-slate-400">Conteúdo:</span>{' '}
            <span className="font-medium text-slate-700 dark:text-slate-300">{entityTitle}</span>
            <br />
            <span className="text-slate-400">Tipo:</span>{' '}
            <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">{entityType}</span>
          </div>

          {/* Duration selector for highlight/restrict */}
          {meta.hasDuration && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Duração</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {DURATION_OPTIONS.map((opt) => (
                  <Button key={opt.hours} size="sm" variant={durationHours === opt.hours ? 'default' : 'outline'}
                    className={`h-8 text-xs ${durationHours === opt.hours ? 'bg-teal-600 hover:bg-teal-700' : ''}`}
                    onClick={() => setDurationHours(opt.hours)}>
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Notice input for highlight/restrict/notice */}
          {(action === 'highlighted' || action === 'restricted' || action === 'notice') && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Mensagem pública (aviso)</Label>
              <Textarea
                value={notice}
                onChange={(e) => setNotice(e.target.value)}
                placeholder={
                  action === 'highlighted' ? 'Ex: Conteúdo destaque da semana!' :
                  action === 'restricted' ? 'Ex: Conteúdo em revisão pela equipe de moderação' :
                  'Ex: Este conteúdo foi verificado pela equipe'
                }
                rows={2}
                className="text-sm"
              />
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setNoticeVisible(!noticeVisible)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${noticeVisible ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${noticeVisible ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  {noticeVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {noticeVisible ? 'Aviso visível para todos' : 'Aviso oculto (só gestores veem)'}
                </span>
              </div>
            </div>
          )}

          {/* Reason for removal */}
          {action === 'removed' && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Motivo da remoção</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Violação dos termos de uso, conteúdo impróprio..."
                rows={2}
                className="text-sm"
              />
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setNoticeVisible(!noticeVisible)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${noticeVisible ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${noticeVisible ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  {noticeVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {noticeVisible ? 'Motivo visível para o dono' : 'Motivo oculto do dono'}
                </span>
              </div>
            </div>
          )}

          {/* Edit note */}
          {action === 'edited' && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Nota da edição (interna)</Label>
              <Textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Ex: Removida informação pessoal do descrição"
                rows={2}
                className="text-sm"
              />
              <p className="text-[10px] text-slate-400">Esta nota é interna e não será visível para o usuário.</p>
            </div>
          )}

          {/* Approval note */}
          {action === 'approve' && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Nota de aprovação (opcional)</Label>
              <Textarea
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder="Ex: Conteúdo verificado e aprovado pela gestão"
                rows={2}
                className="text-sm"
              />
            </div>
          )}

          {/* Preview for highlight/restrict */}
          {meta.hasDuration && durationHours > 0 && (
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <p className="font-semibold text-slate-700 dark:text-slate-300">Resumo da ação:</p>
              <p className="text-slate-500">
                {action === 'highlighted' ? 'Destaque' : 'Restrição'} por{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {DURATION_OPTIONS.find((d) => d.hours === durationHours)?.label}
                </span>
              </p>
              <p className="text-slate-500">
                Expira em:{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {fmtDate(new Date(Date.now() + durationHours * 3600_000).toISOString())}
                </span>
              </p>
              {notice && (
                <p className="text-slate-500">
                  Aviso: <span className="font-medium text-slate-700 dark:text-slate-300">{notice}</span>
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className={`flex-1 ${
            action === 'removed' ? 'bg-red-600 hover:bg-red-700' :
            action === 'restricted' ? 'bg-amber-600 hover:bg-amber-700' :
            action === 'highlighted' ? 'bg-purple-600 hover:bg-purple-700' :
            action === 'approve' ? 'bg-teal-600 hover:bg-teal-700' :
            'bg-teal-600 hover:bg-teal-700'
          } text-white`} onClick={handleSubmit}>
            <Icon className="w-4 h-4 mr-2" />
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── ContentItem (activity card with image + moderation) ─────────────────────

const ENTITY_TYPE_ICONS: Record<string, any> = {
  product: Package, service: Wrench, project: FolderOpen,
  news: Newspaper, comment: MessageSquare,
};

interface ContentItemProps {
  entityType: string;
  entityId: string;
  title: string;
  date?: string;
  badge?: string;
  badgeColor?: string;
  imageUrl?: string | null;
  price?: number | null;
  subtitle?: string;
  moderation: any;
  onOpenModConfig: (entityType: string, entityId: string, title: string, action: ModAction, moderation: any) => void;
}

function ContentItem({
  entityType, entityId, title, date, badge, badgeColor,
  imageUrl, price, subtitle,
  moderation, onOpenModConfig,
  details,
}: ContentItemProps & { details?: Record<string, any> }) {
  const [expanded, setExpanded] = useState(false);
  const badgeColors: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400',
  };

  const status = moderation?.status ?? 'active';
  const isApproved = status === 'approved';
  const isRemoved = status === 'removed';
  const isExpired = moderation?.expiresAt && new Date(moderation.expiresAt) < new Date();
  const FallbackIcon = ENTITY_TYPE_ICONS[entityType] || Package;

  const open = (a: ModAction) => onOpenModConfig(entityType, entityId, title, a, moderation);

  const leftStrip =
    isExpired ? 'bg-slate-400' :
    isRemoved ? 'bg-red-500' :
    status === 'restricted' ? 'bg-amber-500' :
    status === 'highlighted' ? 'bg-purple-500' :
    isApproved ? 'bg-teal-500' :
    moderation?.wasEdited ? 'bg-blue-400' :
    moderation?.managerNotice ? 'bg-sky-400' :
    'bg-transparent';

  const borderClass =
    isExpired ? 'border border-dashed border-slate-300 dark:border-slate-600' :
    isRemoved ? 'border border-red-200 dark:border-red-800' :
    isApproved ? 'border border-teal-300 dark:border-teal-700 shadow-teal-100 dark:shadow-teal-900/20 shadow-sm' :
    status === 'highlighted' ? 'border border-purple-300 dark:border-purple-700 ring-2 ring-purple-200/50 dark:ring-purple-800/30 shadow-sm' :
    status === 'restricted' ? 'border border-amber-300 dark:border-amber-700' :
    'border border-slate-200 dark:border-slate-700/60';

  const StatusIcon = isRemoved ? Ban : status === 'restricted' ? AlertTriangle : status === 'highlighted' ? Sparkles : isApproved ? ShieldCheck : null;

  return (
    <div className={`rounded-xl overflow-hidden transition-all ${borderClass} bg-white dark:bg-slate-800/80 hover:shadow-md group ${isRemoved ? 'opacity-60' : ''}`}>
      {/* Main row */}
      <div className="flex items-stretch cursor-pointer select-none" onClick={() => setExpanded((v) => !v)}>
        {/* Left color strip */}
        <div className={`w-1 shrink-0 ${leftStrip}`} />

        {/* Image / Thumbnail */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 relative overflow-hidden bg-slate-100 dark:bg-slate-700/50">
          {imageUrl ? (
            <img src={imageUrl} alt={title} className={`w-full h-full object-cover ${isRemoved ? 'grayscale' : ''}`} loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FallbackIcon className="w-6 h-6 text-slate-300 dark:text-slate-500" />
            </div>
          )}
          {/* Status overlay on image */}
          {isRemoved && (
            <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center">
              <Ban className="w-5 h-5 text-red-200" />
            </div>
          )}
          {status === 'restricted' && !isExpired && (
            <div className="absolute inset-0 bg-amber-900/50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-200" />
            </div>
          )}
          {isApproved && (
            <div className="absolute -bottom-1 -right-1">
              <ApprovalSeal small approvedByEmail={moderation?.approvedByEmail} approvedAt={moderation?.approvedAt} />
            </div>
          )}
          {status === 'highlighted' && !isExpired && (
            <div className="absolute inset-0 bg-purple-500/15 flex items-start justify-start p-1">
              <Sparkles className="w-4 h-4 text-purple-400 drop-shadow" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 px-3 py-2 flex flex-col justify-center gap-0.5">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold truncate flex-1 ${isRemoved ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>{title}</span>
            <ChevronRight className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {subtitle && <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[200px]">{subtitle}</span>}
            {price != null && price > 0 && (
              <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400">R$ {price.toFixed(2)}</span>
            )}
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {badge && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${badgeColors[badgeColor || 'slate'] || badgeColors.slate}`}>
                {badge}
              </span>
            )}

            {isExpired && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300 font-medium flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />Expirado
              </span>
            )}

            {!isExpired && status !== 'active' && StatusIcon && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium flex items-center gap-0.5 ${MOD_STATUS_COLORS[status] ?? ''}`}>
                <StatusIcon className="w-2.5 h-2.5" />
                {MOD_STATUS_LABELS[status]}
              </span>
            )}

            {moderation?.wasEdited && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium flex items-center gap-0.5">
                <Edit3 className="w-2.5 h-2.5" />Editado
              </span>
            )}

            {moderation?.managerNotice && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center gap-0.5 max-w-[160px] truncate" title={moderation.managerNotice}>
                <Megaphone className="w-2.5 h-2.5 flex-shrink-0" />{moderation.managerNotice}
              </span>
            )}

            {date && <span className="text-[10px] text-slate-400 ml-auto shrink-0">{fmtDate(date)}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center pr-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost"
                className="h-7 w-7 p-0 opacity-60 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}>
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => open('highlighted')}>
                <Sparkles className="w-3.5 h-3.5 mr-2 text-purple-500" />Destacar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => open('restricted')}>
                <AlertOctagon className="w-3.5 h-3.5 mr-2 text-amber-500" />Restringir
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => open('removed')}>
                <Trash2 className="w-3.5 h-3.5 mr-2 text-red-500" />Remover (soft)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => open('notice')}>
                <Megaphone className="w-3.5 h-3.5 mr-2 text-blue-500" />
                {moderation?.managerNotice ? 'Editar aviso' : 'Adicionar aviso'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => open('edited')}>
                <Edit3 className="w-3.5 h-3.5 mr-2 text-slate-500" />Marcar como editado
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {!isApproved ? (
                <DropdownMenuItem onClick={() => open('approve')}>
                  <CheckSquare className="w-3.5 h-3.5 mr-2 text-teal-600" />Aprovar com selo
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => open('revoke')}>
                  <ShieldOff className="w-3.5 h-3.5 mr-2 text-slate-500" />Revogar aprovação
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => open('clear')}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-500" />Reativar / limpar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Expanded details panel */}
      {expanded && details && (
        <div className="px-4 pb-3 pt-2 border-t border-slate-100 dark:border-slate-700/50 text-xs">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {Object.entries(details).map(([key, val]) => {
              if (val == null || val === '' || (Array.isArray(val) && val.length === 0)) return null;
              const isLong = typeof val === 'string' && val.length > 60;
              return (
                <div key={key} className={`flex flex-col ${isLong ? 'col-span-2' : ''}`}>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{key}</span>
                  <span className="text-slate-700 dark:text-slate-300 break-words">
                    {Array.isArray(val)
                      ? val.join(', ')
                      : typeof val === 'number' && (key.toLowerCase().includes('prec') || key.toLowerCase().includes('valor') || key.toLowerCase().includes('meta') || key.toLowerCase().includes('atual'))
                      ? `R$ ${val.toFixed(2)}`
                      : String(val)}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Moderation info */}
          {moderation && status !== 'active' && (
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50 grid grid-cols-2 gap-x-4 gap-y-1">
              <div className="col-span-2"><span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Moderação</span></div>
              {moderation.actorEmail && (
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400">Moderado por</span>
                  <span className="text-slate-600 dark:text-slate-300">{moderation.actorEmail}</span>
                </div>
              )}
              {moderation.expiresAt && (
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400">Expira em</span>
                  <span className="text-slate-600 dark:text-slate-300">{fmtDate(moderation.expiresAt)}</span>
                </div>
              )}
              {moderation.editNote && (
                <div className="flex flex-col col-span-2">
                  <span className="text-[10px] text-slate-400">Nota interna</span>
                  <span className="text-slate-600 dark:text-slate-300">{moderation.editNote}</span>
                </div>
              )}
            </div>
          )}
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
  const [eventsAction, setEventsAction] = useState<string>('all');
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
      action: eventsAction === 'all' ? undefined : eventsAction || undefined,
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

  // Moderation config dialog state
  const [modConfigOpen, setModConfigOpen] = useState(false);
  const [modConfigAction, setModConfigAction] = useState<ModAction | null>(null);
  const [modConfigTarget, setModConfigTarget] = useState<{ et: string; eid: string; title: string; mod: any } | null>(null);

  const openModConfig = (et: string, eid: string, title: string, action: ModAction, mod: any) => {
    setModConfigTarget({ et, eid, title, mod });
    setModConfigAction(action);
    setModConfigOpen(true);
  };

  const moderateMutation = useMutation({
    mutationFn: ({ et, eid, data }: { et: string; eid: string; data: any }) =>
      polysApi.contentModeration.upsert(et, eid, data),
    onSuccess: () => { invalidateContent(); toast.success('Moderação aplicada'); },
    onError: (e: any) => toast.error(e?.message || 'Erro'),
  });

  const approveMutation = useMutation({
    mutationFn: ({ et, eid, approvalNote }: { et: string; eid: string; approvalNote?: string }) =>
      polysApi.contentModeration.approve(et, eid, approvalNote),
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
  const verifyMutation = useMutation({
    mutationFn: () => polysApi.users.verify(user.id),
    ...mutOpts,
    onSuccess: () => { mutOpts.onSuccess(); toast.success('Perfil verificado com selo azul'); },
  });
  const unverifyMutation = useMutation({
    mutationFn: () => polysApi.users.unverify(user.id),
    ...mutOpts,
    onSuccess: () => { mutOpts.onSuccess(); toast.success('Verificação removida'); },
  });

  const execConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'block') blockMutation.mutate();
    else if (confirmAction.type === 'unblock') unblockMutation.mutate();
    else if (confirmAction.type === 'ban') banMutation.mutate();
    else if (confirmAction.type === 'unban') unbanMutation.mutate();
  };

  const handleModConfigSubmit = ({ action, payload }: { action: ModAction; payload: any }) => {
    if (!modConfigTarget) return;
    const { et, eid } = modConfigTarget;

    if (payload._approve) {
      approveMutation.mutate({ et, eid, approvalNote: payload.approvalNote });
    } else if (payload._revoke) {
      revokeApprovalMutation.mutate({ et, eid });
    } else {
      moderateMutation.mutate({ et, eid, data: payload });
    }
  };

  const isBlocked = user?.is_blocked || user?.isBlocked;
  const isBanned = user?.is_banned || user?.isBanned;
  const isUserVerified = user?.isVerified || user?.is_verified;

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
                <p className="text-base font-semibold truncate flex items-center gap-1.5">
                  {user.full_name || user.name || 'Sem nome'}
                  {isUserVerified ? (
                    <span className="inline-flex items-center gap-1">
                      <VerifiedBadge size="md" />
                      <button onClick={() => unverifyMutation.mutate()} className="text-[10px] text-red-400 hover:text-red-600 font-normal" title="Remover verificação">
                        <ShieldOff className="w-3 h-3" />
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => verifyMutation.mutate()}
                      className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 font-medium px-1.5 py-0.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                      title="Verificar perfil"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verificar
                    </button>
                  )}
                </p>
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {[
                        { icon: Package, label: 'Produtos', count: activity.products?.length, color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30' },
                        { icon: Wrench, label: 'Serviços', count: activity.services?.length, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' },
                        { icon: FolderOpen, label: 'Projetos', count: activity.projects?.length, color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' },
                        { icon: Newspaper, label: 'Notícias', count: activity.news?.length, color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30' },
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
                        {activity.products.slice(0, 20).map((p: any) => (
                          <ContentItem key={p.id}
                            entityType="product" entityId={p.id}
                            title={p.title} date={p.createdAt}
                            imageUrl={p.images?.[0]}
                            price={p.price}
                            subtitle={[p.category, p.condition].filter(Boolean).join(' · ')}
                            badge={p.active ? 'Ativo' : 'Inativo'} badgeColor={p.active ? 'emerald' : 'slate'}
                            moderation={modMap[`product:${p.id}`]}
                            onOpenModConfig={openModConfig}
                            details={{
                              Preço: p.price, Categoria: p.category, Condição: p.condition,
                              Estoque: p.quantityAvailable,
                              Descrição: p.description?.slice(0, 200),
                            }}
                          />
                        ))}
                      </ActivitySection>
                    )}

                    {activity.services?.length > 0 && (
                      <ActivitySection title="Serviços cadastrados" icon={Wrench}>
                        {activity.services.slice(0, 20).map((s: any) => (
                          <ContentItem key={s.id}
                            entityType="service" entityId={s.id}
                            title={s.title} date={s.createdAt}
                            imageUrl={s.images?.[0]}
                            price={s.pricePerHour}
                            subtitle={s.serviceType || undefined}
                            badge={s.active ? 'Ativo' : 'Inativo'} badgeColor={s.active ? 'emerald' : 'slate'}
                            moderation={modMap[`service:${s.id}`]}
                            onOpenModConfig={openModConfig}
                            details={{
                              'Preço/hora': s.pricePerHour, Tipo: s.serviceType,
                              Descrição: s.description?.slice(0, 200),
                            }}
                          />
                        ))}
                      </ActivitySection>
                    )}

                    {activity.projects?.length > 0 && (
                      <ActivitySection title="Projetos criados" icon={FolderOpen}>
                        {activity.projects.slice(0, 20).map((p: any) => (
                          <ContentItem key={p.id}
                            entityType="project" entityId={p.id}
                            title={p.title} date={p.createdAt}
                            imageUrl={p.imageUrl}
                            subtitle={p.status}
                            badge={p.status} badgeColor="blue"
                            moderation={modMap[`project:${p.id}`]}
                            onOpenModConfig={openModConfig}
                            details={{
                              'Valor meta': p.targetAmount, 'Valor atual': p.currentAmount,
                              Descrição: p.description?.slice(0, 200),
                            }}
                          />
                        ))}
                      </ActivitySection>
                    )}

                    {activity.news?.length > 0 && (
                      <ActivitySection title="Notícias publicadas" icon={Newspaper}>
                        {activity.news.slice(0, 20).map((n: any) => (
                          <ContentItem key={n.id}
                            entityType="news" entityId={n.id}
                            title={n.title} date={n.createdAt}
                            imageUrl={n.imageUrl}
                            subtitle={n.summary?.slice(0, 60)}
                            badge={n.isPublished ? 'Publicada' : 'Rascunho'} badgeColor={n.isPublished ? 'emerald' : 'slate'}
                            moderation={modMap[`news:${n.id}`]}
                            onOpenModConfig={openModConfig}
                            details={{
                              Resumo: n.summary?.slice(0, 200),
                              Curtidas: n.likesCount, Comentários: n.commentsCount,
                            }}
                          />
                        ))}
                      </ActivitySection>
                    )}

                    {activity.comments?.length > 0 && (
                      <ActivitySection title="Comentários em notícias" icon={MessageSquare}>
                        {activity.comments.slice(0, 20).map((c: any) => (
                          <ContentItem key={c.id}
                            entityType="comment" entityId={c.id}
                            title={c.content?.slice(0, 100) + (c.content?.length > 100 ? '…' : '')}
                            date={c.createdAt}
                            subtitle={c.news?.title ? `em: ${c.news.title}` : undefined}
                            moderation={modMap[`comment:${c.id}`]}
                            onOpenModConfig={openModConfig}
                            details={{
                              'Notícia': c.news?.title ?? `ID: ${c.newsId}`,
                              'Conteúdo completo': c.content,
                            }}
                          />
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
                      !activity.projects?.length && !activity.news?.length && !activity.comments?.length && !activity.orders?.length && (
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
                      <SelectItem value="all">Todos</SelectItem>
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

                    {/* Calendar heatmap — always shown */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <BarChart2 className="w-4 h-4" />Mapa de calor — últimos 90 dias
                      </h4>
                      <CalendarHeatmap daily={heatmap?.daily ?? {}} />
                    </div>

                    {/* Hourly + weekday charts side by side */}
                    {(heatmap?.hourly || heatmap?.weekday) && (
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

                {/* Profile verification */}
                <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <VerifiedBadge size="lg" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Verificação de perfil</p>
                        <p className="text-[11px] text-slate-500">
                          {isUserVerified
                            ? `Verificado${user.verifiedByEmail ? ` por ${user.verifiedByEmail}` : ''}${user.verifiedAt ? ` em ${fmtDate(user.verifiedAt)}` : ''}`
                            : 'Este perfil não possui selo de verificação'
                          }
                        </p>
                      </div>
                    </div>
                    {isUserVerified ? (
                      <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 h-8 text-xs"
                        onClick={() => unverifyMutation.mutate()}>
                        <ShieldOff className="w-3.5 h-3.5 mr-1.5" />Remover selo
                      </Button>
                    ) : (
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs"
                        onClick={() => verifyMutation.mutate()}>
                        <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />Verificar perfil
                      </Button>
                    )}
                  </div>
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
                ) : (() => {
                  const logs = auditLogs as any[];
                  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

                  // Group content logs by entity key, keep non-content logs separate
                  const groups: { key: string; entityType?: string; entityId?: string; content?: any; currentMod?: any; logs: any[] }[] = [];
                  const entityGroupMap: Record<string, number> = {};

                  for (const log of logs) {
                    const isContent = log.action?.startsWith('content_');
                    if (isContent && log.entity && log.entityId) {
                      const gk = `${log.entity}:${log.entityId}`;
                      if (entityGroupMap[gk] != null) {
                        groups[entityGroupMap[gk]].logs.push(log);
                        // Update currentMod to the latest enriched one
                        if (log._currentModeration) groups[entityGroupMap[gk]].currentMod = log._currentModeration;
                        if (log._content) groups[entityGroupMap[gk]].content = log._content;
                      } else {
                        entityGroupMap[gk] = groups.length;
                        groups.push({ key: gk, entityType: log.entity, entityId: log.entityId, content: log._content, currentMod: log._currentModeration, logs: [log] });
                      }
                    } else {
                      groups.push({ key: `solo-${log.id}`, logs: [log] });
                    }
                  }

                  const ACTION_DOT_COLOR: Record<string, string> = {
                    content_removed: 'bg-red-500',
                    content_restricted: 'bg-amber-500',
                    content_highlighted: 'bg-purple-500',
                    content_approved: 'bg-teal-500',
                    content_active: 'bg-emerald-500',
                  };

                  return (
                    <div className="space-y-3">
                      {groups.map((group) => {
                        // ── Solo (non-content) log ──
                        if (!group.entityType) {
                          const log = group.logs[0];
                          const actionColor =
                            log.action?.includes('ban') ? 'border-l-red-500' :
                            log.action?.includes('block') ? 'border-l-amber-500' :
                            log.action?.includes('verify') ? 'border-l-blue-500' :
                            'border-l-slate-300';
                          return (
                            <div key={group.key} className={`rounded-lg border border-slate-200 dark:border-slate-700 border-l-4 ${actionColor} px-3 py-2`}>
                              <div className="flex items-center justify-between">
                                <Badge className={`text-[10px] px-1.5 py-0.5 ${MOD_STATUS_COLORS[log.details?.status] || 'bg-slate-100 text-slate-600'}`}>
                                  {ACTION_LABELS[log.action] || log.action}
                                </Badge>
                                <span className="text-[11px] text-slate-400">{fmtDate(log.createdAt)}</span>
                              </div>
                              {log.actorEmail && <p className="text-[11px] text-slate-500 mt-1">Por: <span className="font-medium text-slate-700 dark:text-slate-300">{log.actorEmail}</span></p>}
                              {log.details?.reason && <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">Motivo: {log.details.reason}</p>}
                              {log.details?.new_role && <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">Novo cargo: {ROLE_LABELS[log.details.new_role] || log.details.new_role}</p>}
                            </div>
                          );
                        }

                        // ── Grouped content logs ──
                        const { content, currentMod, entityType: et, entityId: eid } = group;
                        const contentTitle = content?.title || group.logs[0]?.details?.contentTitle || 'Sem título';
                        const contentImage = content?.images?.[0] || content?.imageUrl || null;
                        const contentPrice = content?.price ?? content?.pricePerHour ?? content?.targetAmount ?? null;
                        const entityLabel = content?._entityLabel || ({ product: 'Produto', service: 'Serviço', project: 'Projeto', news: 'Notícia', comment: 'Comentário' }[et!] || et);
                        const EntityIcon = et ? (ENTITY_TYPE_ICONS[et] || ClipboardList) : ClipboardList;

                        return (
                          <div key={group.key} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            {/* Entity header — shown once */}
                            <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-700/50">
                              {contentImage ? (
                                <img src={contentImage} alt="" className="w-10 h-10 rounded-md object-cover shrink-0" />
                              ) : (
                                <div className="w-10 h-10 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                  <EntityIcon className="w-5 h-5 text-slate-400" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{contentTitle}</p>
                                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold shrink-0">{entityLabel}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {contentPrice != null && (
                                    <span className="text-xs font-bold text-teal-600 dark:text-teal-400">{formatCurrency(contentPrice)}</span>
                                  )}
                                  {currentMod && (
                                    <Badge className={`text-[9px] px-1.5 py-0 ${MOD_STATUS_COLORS[currentMod.status] || 'bg-slate-100 text-slate-600'}`}>
                                      {MOD_STATUS_LABELS[currentMod.status] || currentMod.status}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {/* Action buttons — once per entity */}
                              {et && eid && (
                                <div className="flex gap-1.5 shrink-0">
                                  {currentMod && currentMod.status !== 'active' && (
                                    <Button size="sm" variant="outline"
                                      className="h-7 text-[10px] gap-1 px-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/30"
                                      onClick={() => openModConfig(et, eid, contentTitle, 'clear', null)}>
                                      <Undo2 className="w-3 h-3" />Reverter
                                    </Button>
                                  )}
                                  <Button size="sm" variant="outline"
                                    className="h-7 text-[10px] gap-1 px-2 text-slate-500 border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                                    onClick={() => {
                                      const cs = currentMod?.status || group.logs[0]?.details?.status;
                                      const action: ModAction = cs === 'highlighted' ? 'highlighted' :
                                        cs === 'restricted' ? 'restricted' :
                                        cs === 'removed' ? 'removed' : 'notice';
                                      openModConfig(et, eid, contentTitle, action, currentMod || group.logs[0]?.details);
                                    }}>
                                    <Edit3 className="w-3 h-3" />Editar
                                  </Button>
                                </div>
                              )}
                            </div>

                            {/* Timeline rows — compact, one per action */}
                            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                              {group.logs.map((log: any) => (
                                <div key={log.id} className="px-3 py-2 flex items-start gap-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${ACTION_DOT_COLOR[log.action] || (log.action?.includes('ban') ? 'bg-red-500' : log.action?.includes('block') ? 'bg-amber-500' : 'bg-slate-400')}`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{ACTION_LABELS[log.action] || log.action}</span>
                                      {log.actorEmail && <span className="text-[10px] text-slate-400">por {log.actorEmail}</span>}
                                      <span className="text-[10px] text-slate-400 ml-auto shrink-0">{fmtDate(log.createdAt)}</span>
                                    </div>
                                    {(log.details?.managerNotice || log.details?.reason) && (
                                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                        {log.details?.reason ? `Motivo: ${log.details.reason}` : `Aviso: ${log.details.managerNotice}`}
                                      </p>
                                    )}
                                    {log.details?.editNote && <p className="text-[11px] text-slate-500 mt-0.5 truncate">Nota: {log.details.editNote}</p>}
                                    {log.details?.approvalNote && <p className="text-[11px] text-slate-500 mt-0.5 truncate">Aprovação: {log.details.approvalNote}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {modConfigTarget && (
        <ModerationConfigDialog
          open={modConfigOpen}
          onClose={() => setModConfigOpen(false)}
          action={modConfigAction}
          entityType={modConfigTarget.et}
          entityId={modConfigTarget.eid}
          entityTitle={modConfigTarget.title}
          currentModeration={modConfigTarget.mod}
          onSubmit={handleModConfigSubmit}
        />
      )}

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
  const [tablePage, setTablePage] = useState(0);
  const PAGE_SIZE = 15;

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
      (statusFilter === 'banned' && isBanned) ||
      (statusFilter === 'inactive' && isInactive(u) && !isBanned) ||
      (statusFilter === 'verified' && (u.isVerified || u.is_verified));

    return matchSearch && matchRole && matchStatus;
  });

  const INACTIVE_DAYS = 30;
  const inactiveThreshold = new Date(Date.now() - INACTIVE_DAYS * 24 * 3600_000);
  const isInactive = (u: any) => {
    const lastSeen = u.lastLoginAt || u.last_login_at;
    if (!lastSeen) return true; // never logged in
    return new Date(lastSeen) < inactiveThreshold;
  };

  const totalActive = (users as any[]).filter((u: any) => !u.is_blocked && !u.isBlocked && !u.is_banned && !u.isBanned).length;
  const totalBlocked = (users as any[]).filter((u: any) => (u.is_blocked || u.isBlocked) && !(u.is_banned || u.isBanned)).length;
  const totalBanned = (users as any[]).filter((u: any) => u.is_banned || u.isBanned).length;
  const totalInactive = (users as any[]).filter((u: any) => isInactive(u) && !(u.is_banned || u.isBanned)).length;
  const totalVerified = (users as any[]).filter((u: any) => u.isVerified || u.is_verified).length;

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestão de Usuários</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Moderação, cargos, conteúdo e auditoria de todos os usuários da plataforma
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: 'Total', value: (users as any[]).length, icon: Users, color: 'bg-slate-100 dark:bg-slate-800', iconColor: 'text-slate-600 dark:text-slate-400', filter: 'all' },
          { label: 'Ativos', value: totalActive, icon: CheckCircle2, color: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600', filter: 'active' },
          { label: 'Verificados', value: totalVerified, icon: ShieldCheck, color: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600', filter: 'verified' },
          { label: 'Ausentes', value: totalInactive, icon: Clock, color: 'bg-orange-100 dark:bg-orange-900/30', iconColor: 'text-orange-600', filter: 'inactive' },
          { label: 'Bloqueados', value: totalBlocked, icon: Lock, color: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600', filter: 'blocked' },
          { label: 'Banidos', value: totalBanned, icon: Ban, color: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-red-600', filter: 'banned' },
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
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setTablePage(0); }}>
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
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setTablePage(0); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="verified">Verificados</SelectItem>
            <SelectItem value="inactive">Ausentes (+30 dias)</SelectItem>
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
              <TableHead>Último acesso</TableHead>
              <TableHead>Localização</TableHead>
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
                <TableCell colSpan={7} className="text-center py-8 text-slate-400">Nenhum usuário encontrado</TableCell>
              </TableRow>
            ) : filtered.slice(tablePage * PAGE_SIZE, (tablePage + 1) * PAGE_SIZE).map((u: any) => (
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
                      <p className="text-sm font-medium truncate flex items-center gap-1">
                        {u.full_name || u.name || '—'}
                        {(u.isVerified || u.is_verified) && <VerifiedBadge size="sm" />}
                      </p>
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
                <TableCell>
                  {(() => {
                    const lastSeen = u.lastLoginAt || u.last_login_at;
                    const inactive = isInactive(u);
                    return (
                      <span className={`text-xs font-medium ${inactive ? 'text-orange-500' : 'text-slate-500'}`} title={lastSeen ? fmtDate(lastSeen) : 'Nunca acessou'}>
                        {inactive && <Clock className="w-3 h-3 inline mr-1 -mt-0.5" />}
                        {fmtRelative(lastSeen)}
                      </span>
                    );
                  })()}
                </TableCell>
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

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">
            {tablePage * PAGE_SIZE + 1}–{Math.min((tablePage + 1) * PAGE_SIZE, filtered.length)} de {filtered.length} usuários
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={tablePage === 0}
              onClick={() => setTablePage((p) => p - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" />Anterior
            </Button>
            <span className="text-sm text-slate-600 dark:text-slate-400 min-w-[60px] text-center">
              {tablePage + 1} / {Math.ceil(filtered.length / PAGE_SIZE)}
            </span>
            <Button size="sm" variant="outline" disabled={(tablePage + 1) * PAGE_SIZE >= filtered.length}
              onClick={() => setTablePage((p) => p + 1)}>
              Próximo<ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

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
