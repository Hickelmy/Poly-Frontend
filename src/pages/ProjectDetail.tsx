import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { polysApi } from '@/api/polysClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft, Heart, Users, Calendar, Target, Share2,
  FileText, Download, ThumbsUp, ThumbsDown, Undo2,
  Clock, TrendingUp, ChevronLeft, ChevronRight, ImageIcon
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import StatusBadge from '../components/shared/StatusBadge';
import DonationModal from '../components/modals/DonationModal';
import { cn } from "@/lib/utils";

const categoryLabels: Record<string, { icon: string; label: string }> = {
  seguranca: { icon: "🛡️", label: "Seguranca" },
  infraestrutura: { icon: "🏗️", label: "Infraestrutura" },
  cultura: { icon: "🎭", label: "Cultura" },
  saude: { icon: "🏥", label: "Saude" },
  educacao: { icon: "📚", label: "Educacao" },
  lazer: { icon: "🎮", label: "Lazer" },
  outro: { icon: "📌", label: "Outro" },
};

export default function ProjectDetail() {
  const [user, setUser] = useState<any>(null);
  const [donationModalOpen, setDonationModalOpen] = useState<boolean>(false);
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [myVoteType, setMyVoteType] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState<number>(0);

  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await polysApi.auth.me();
        setUser(userData);
      } catch (e) {}
    };
    loadUser();
  }, []);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const projects = await polysApi.entities.Project.filter({ id: projectId });
      return projects[0];
    },
    enabled: !!projectId,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['projectPayments', projectId],
    queryFn: () => polysApi.entities.ProjectPayment.filter({ project_id: projectId, status: 'confirmed' }, '-created_date'),
    enabled: !!projectId,
  });

  const voteMutation = useMutation({
    mutationFn: async (type: string) => {
      return polysApi.entities.ProjectVote.create({
        project_id: project.id,
        user_id: user.id,
        user_email: user.email,
        type,
      });
    },
    onSuccess: (_: any, type: string) => {
      queryClient.invalidateQueries(['project', projectId]);
      setHasVoted(true);
      setMyVoteType(type);
      toast.success('Voto registrado!');
    },
    onError: (error: any) => {
      const msg = error?.message || error?.response?.data?.message || '';
      if (msg.includes('ja votou')) toast.info('Voce ja votou neste projeto.');
      else if (msg.includes('proprio projeto')) toast.info('Voce nao pode votar no seu proprio projeto.');
      else toast.error('Erro ao registrar voto', { description: msg || 'Tente novamente.' });
    },
  });

  const undoVoteMutation = useMutation({
    mutationFn: async () => {
      await polysApi.entities.ProjectVote.delete({
        project_id: project.id,
        user_email: user.email,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['project', projectId]);
      setHasVoted(false);
      setMyVoteType(null);
      toast.success('Voto desfeito.');
    },
    onError: () => toast.error('Nao foi possivel desfazer o voto'),
  });

  const handleVote = (type: string) => {
    if (!user) return toast.error('Faca login para votar');
    if (project.owner_email === user.email || project.owner_id === user.id)
      return toast.info('Voce nao pode votar no seu proprio projeto');
    if (hasVoted) return toast.info('Voce ja votou neste projeto');
    voteMutation.mutate(type);
  };

  const handleDonate = () => {
    if (!user) return toast.error('Faca login para doar');
    setDonationModalOpen(true);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: project.title, url });
      } catch {}
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copiado!');
    }
  };

  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-6 w-1/3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          </div>
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <ImageIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">Projeto nao encontrado</h2>
        <p className="text-slate-500 mb-6">O projeto pode ter sido removido ou o link esta incorreto.</p>
        <Link to={createPageUrl('Projects')}>
          <Button>Voltar para Projetos</Button>
        </Link>
      </div>
    );
  }

  // Image logic - use image_url first, then evidences, no fallback to generic
  const coverImage = project.image_url || (project.evidences?.length > 0 ? project.evidences[0] : null);
  const galleryImages: string[] = project.evidences?.length > 0 ? project.evidences : [];

  const canVote: boolean = ['proposed', 'voting'].includes(project.status);
  const canDonate: boolean = ['funding', 'funded', 'in_progress', 'completed'].includes(project.status);
  const isOwner: boolean = user && (project.owner_email === user.email || project.owner_id === user.id);

  const upVotes: number = project.up_votes_count ?? project.votes_count ?? 0;
  const downVotes: number = project.down_votes_count ?? 0;
  const totalVotes: number = upVotes + downVotes;
  const bias: number = totalVotes > 0 ? Math.max(-1, Math.min(1, (upVotes - downVotes) / totalVotes)) : 0;
  const upPercent: number = 50 + bias * 50;
  const downPercent: number = 100 - upPercent;
  const minVotes: number = project.min_votes || 0;
  const diff: number = upVotes - downVotes;
  const remainingVotes: number = Math.max(0, minVotes - Math.max(diff, 0));

  const currentAmount = project.current_amount || 0;
  const targetAmount = project.target_amount || 1;
  const percentage = Math.min((currentAmount / targetAmount) * 100, 100);
  const daysLeft = project.funding_deadline
    ? Math.max(0, Math.ceil((new Date(project.funding_deadline).getTime() - Date.now()) / 86400000))
    : null;

  const cat = categoryLabels[project.category] || categoryLabels.outro;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back */}
      <Link to={createPageUrl('Projects')}>
        <Button variant="ghost" size="sm" className="gap-1.5 text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" />
          Voltar para projetos
        </Button>
      </Link>

      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden">
        {coverImage ? (
          <img
            src={coverImage}
            alt={project.title}
            className="w-full h-72 md:h-96 object-cover"
          />
        ) : (
          <div className="w-full h-72 md:h-96 bg-gradient-to-br from-teal-600 to-emerald-700 flex items-center justify-center">
            <div className="text-center text-white/80">
              <ImageIcon className="w-16 h-16 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Sem imagem de capa</p>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

        {/* Top badges */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <StatusBadge status={project.status} />
          <Badge className="bg-white/90 text-slate-700 backdrop-blur-sm">
            {cat.icon} {cat.label}
          </Badge>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-3 leading-tight">
            {project.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/80">
            {(project.owner_name || project.owner_email) && (
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>{project.owner_name || project.owner_email?.split('@')[0]}</span>
              </div>
            )}
            {project.created_date && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(project.created_date), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}</span>
              </div>
            )}
            {project.location_address && (
              <div className="flex items-center gap-1.5">
                <Target className="w-4 h-4" />
                <span className="truncate max-w-[200px]">{project.location_address}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Description */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Sobre o Projeto</h2>
            {project.short_description && (
              <p className="text-teal-600 dark:text-teal-400 font-medium mb-3">
                {project.short_description}
              </p>
            )}
            <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
              {project.description}
            </p>
          </div>

          {/* Gallery */}
          {galleryImages.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                Galeria de Evidencias
              </h2>

              {/* Featured image */}
              <div className="relative rounded-xl overflow-hidden mb-3">
                <img
                  src={galleryImages[galleryIndex]}
                  alt={`Evidencia ${galleryIndex + 1}`}
                  className="w-full h-64 md:h-80 object-cover"
                />
                {galleryImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setGalleryIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setGalleryIndex((i) => (i + 1) % galleryImages.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/50 text-white text-xs">
                      {galleryIndex + 1} / {galleryImages.length}
                    </span>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {galleryImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {galleryImages.map((img: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => setGalleryIndex(i)}
                      className={cn(
                        "shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                        galleryIndex === i
                          ? "border-teal-500 shadow-md"
                          : "border-transparent opacity-60 hover:opacity-100"
                      )}
                    >
                      <img src={img} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Budget / Expenses */}
          {project.expenses?.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Orcamento Detalhado</h2>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-left">
                      <th className="px-4 py-3 font-medium text-slate-500">Item</th>
                      <th className="px-4 py-3 font-medium text-slate-500 text-center">Qtd</th>
                      <th className="px-4 py-3 font-medium text-slate-500 text-right">Valor</th>
                      <th className="px-4 py-3 font-medium text-slate-500 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {project.expenses.map((exp: any, i: number) => {
                      const cost = typeof exp.cost === 'number' ? exp.cost : parseFloat(String(exp.cost).replace(/\./g, '').replace(',', '.')) || 0;
                      const qty = exp.quantity || 1;
                      return (
                        <tr key={i}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900 dark:text-white">{exp.description}</p>
                            <p className="text-xs text-slate-400">{exp.type}</p>
                          </td>
                          <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">{qty}</td>
                          <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{formatCurrency(cost)}</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">{formatCurrency(cost * qty)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-teal-50 dark:bg-teal-900/20">
                      <td colSpan={3} className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Total</td>
                      <td className="px-4 py-3 text-right font-bold text-teal-600 dark:text-teal-400">
                        {formatCurrency(targetAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Donations */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Doadores ({payments.length})
              </h2>
              <span className="text-sm font-medium text-teal-600">
                {formatCurrency(payments.reduce((s: number, p: any) => s + (p.amount || 0), 0))} arrecadado
              </span>
            </div>
            {payments.length === 0 ? (
              <div className="text-center py-8">
                <Heart className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Ainda nao ha doacoes. Seja o primeiro a contribuir!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {payments.map((payment: any) => (
                  <div key={payment.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-400 text-sm">
                        {payment.anonymous ? '?' : payment.user_email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {payment.anonymous ? 'Doador Anonimo' : payment.user_email}
                      </p>
                      <p className="text-xs text-slate-400">
                        {format(new Date(payment.created_date), "dd 'de' MMM", { locale: ptBR })}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-teal-600 dark:text-teal-400">
                      {formatCurrency(payment.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Funding card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm sticky top-4 space-y-5">

            {/* Progress */}
            <div>
              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(currentAmount)}
                  </p>
                  <p className="text-xs text-slate-400">
                    arrecadado de {formatCurrency(targetAmount)}
                  </p>
                </div>
                <span className="text-sm font-bold text-teal-600">{percentage.toFixed(0)}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <p className="text-xl font-bold text-slate-900 dark:text-white">{payments.length}</p>
                <p className="text-[11px] text-slate-500">Apoiadores</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {daysLeft !== null ? daysLeft : '--'}
                </p>
                <p className="text-[11px] text-slate-500">Dias restantes</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <p className="text-xl font-bold text-slate-900 dark:text-white">{totalVotes}</p>
                <p className="text-[11px] text-slate-500">Votos</p>
              </div>
            </div>

            {/* Votes */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <ThumbsUp className="w-3.5 h-3.5" /> {upVotes}
                </span>
                <span className="font-medium text-slate-500">
                  {minVotes > 0 ? `${diff}/${minVotes} votos uteis` : `${diff} votos uteis`}
                </span>
                <span className="flex items-center gap-1 text-rose-500 font-medium">
                  {downVotes} <ThumbsDown className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${upPercent}%` }} />
                <div className="h-full bg-rose-500 transition-all" style={{ width: `${downPercent}%` }} />
              </div>
              {remainingVotes > 0 && canVote && (
                <p className="text-[11px] text-amber-500">
                  Faltam <span className="font-semibold">{remainingVotes}</span> votos positivos para liberar doacoes.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2.5">
              {canDonate && (
                <Button
                  className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-base font-semibold"
                  onClick={handleDonate}
                >
                  <Heart className="w-5 h-5 mr-2" />
                  Fazer Doacao
                </Button>
              )}

              {canVote && (
                <>
                  {isOwner ? (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-center text-sm text-slate-500">
                      Voce nao pode votar no seu proprio projeto
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          className={cn(
                            "h-11 font-medium",
                            myVoteType === 'up'
                              ? "bg-emerald-600 hover:bg-emerald-700"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-800"
                          )}
                          disabled={hasVoted || voteMutation.isPending}
                          onClick={() => handleVote('up')}
                        >
                          <ThumbsUp className="w-4 h-4 mr-1.5" />
                          Apoiar
                        </Button>
                        <Button
                          className={cn(
                            "h-11 font-medium",
                            myVoteType === 'down'
                              ? "bg-rose-600 hover:bg-rose-700"
                              : "bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-200 dark:border-rose-800"
                          )}
                          disabled={hasVoted || voteMutation.isPending}
                          onClick={() => handleVote('down')}
                        >
                          <ThumbsDown className="w-4 h-4 mr-1.5" />
                          Rejeitar
                        </Button>
                      </div>
                      {hasVoted && (
                        <Button
                          variant="ghost"
                          className="w-full h-9 text-xs text-slate-500"
                          disabled={undoVoteMutation.isPending}
                          onClick={() => undoVoteMutation.mutate()}
                        >
                          <Undo2 className="w-3.5 h-3.5 mr-1" />
                          Desfazer meu voto
                        </Button>
                      )}
                    </>
                  )}
                </>
              )}

              <Button variant="outline" className="w-full" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </Button>
            </div>

            {/* Deadlines */}
            {(project.voting_deadline || project.funding_deadline) && (
              <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                {project.voting_deadline && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Votacao ate: {format(new Date(project.voting_deadline), 'dd/MM/yyyy')}</span>
                  </div>
                )}
                {project.funding_deadline && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Target className="w-3.5 h-3.5" />
                    <span>Meta ate: {format(new Date(project.funding_deadline), 'dd/MM/yyyy')}</span>
                  </div>
                )}
              </div>
            )}

            {/* Budget PDF */}
            {project.budget_pdf_url && (
              <a href={project.budget_pdf_url} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" className="w-full text-sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Ver Orcamento PDF
                  <Download className="w-4 h-4 ml-auto" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>

      <DonationModal
        open={donationModalOpen}
        onClose={() => setDonationModalOpen(false)}
        project={project}
        user={user}
      />
    </div>
  );
}
