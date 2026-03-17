import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { polysApi } from '@/api/polysClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft, Vote, Heart, Users, Calendar, Target,
  FileText, MapPin, Share2, User, Download
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import ProgressBar from '../components/shared/ProgressBar';
import StatusBadge from '../components/shared/StatusBadge';
import DonationModal from '../components/modals/DonationModal';

const categoryIcons: Record<string, string> = {
  seguranca: "🛡️",
  infraestrutura: "🏗️",
  cultura: "🎭",
  saude: "🏥",
  educacao: "📚",
  lazer: "🎮",
  outro: "📌"
};

export default function ProjectDetail() {
  const [user, setUser] = useState<any>(null);
  const [donationModalOpen, setDonationModalOpen] = useState<boolean>(false);
  const [hasVoted, setHasVoted] = useState<boolean>(false);

  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await polysApi.auth.me();
        setUser(userData);
      } catch (e) {
        // Not logged in
      }
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

  const [myVoteType, setMyVoteType] = useState<string | null>(null);

  useEffect(() => {
    if (!project || !user) return;
  }, [project, user]);

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
      toast.success('Voto registrado com sucesso!');
    },
    onError: (error: any) => {
      const msg = error?.message || error?.response?.data?.message || '';
      if (msg.includes('já votou')) {
        toast.info('Você já votou neste projeto.');
      } else if (msg.includes('próprio projeto')) {
        toast.info('Você não pode votar no seu próprio projeto.');
      } else {
        toast.error('Erro ao registrar voto', {
          description: msg || 'Tente novamente.',
        });
      }
    },
  });

  const handleVote = (type: string) => {
    if (!user) {
      toast.error('Faça login para votar');
      return;
    }

    if (project.owner_email === user.email || project.owner_id === user.id) {
      toast.info('Você não pode votar no seu próprio projeto');
      return;
    }

    if (hasVoted) {
      toast.info('Você já votou neste projeto');
      return;
    }
    voteMutation.mutate(type);
  };

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
      toast.success('Seu voto foi desfeito.');
    },
    onError: () => {
      toast.error('Não foi possível desfazer o voto');
    },
  });

  const handleDonate = () => {
    if (!user) {
      toast.error('Faça login para doar');
      return;
    }
    setDonationModalOpen(true);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const canVote: boolean = project && ['proposed', 'voting'].includes(project.status);
  const canDonate: boolean = project && ['funding', 'funded', 'in_progress', 'completed'].includes(
    project.status,
  );

  const isOwner: boolean = user && project && (
    project.owner_email === user.email ||
    project.owner_id === user.id
  );

  const upVotes: number = project?.up_votes_count ?? project?.votes_count ?? 0;
  const downVotes: number = project?.down_votes_count ?? 0;
  const totalVotes: number = upVotes + downVotes;
  const bias: number =
    totalVotes > 0 ? Math.max(-1, Math.min(1, (upVotes - downVotes) / totalVotes)) : 0;
  const upPercent: number = 50 + bias * 50;
  const downPercent: number = 100 - upPercent;
  const minVotes: number = project?.min_votes || 0;
  const diff: number = upVotes - downVotes;
  const remainingVotes: number = Math.max(0, minVotes - Math.max(diff, 0));

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-64 bg-slate-200 rounded-2xl" />
        <div className="h-8 bg-slate-200 rounded w-1/2" />
        <div className="h-4 bg-slate-200 rounded w-full" />
        <div className="h-4 bg-slate-200 rounded w-3/4" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Projeto não encontrado</p>
        <Link to={createPageUrl('Projects')}>
          <Button className="mt-4">Voltar para Projetos</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link to={createPageUrl('Projects')}>
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
      </Link>

      <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden">
        <img
          src={project.image_url || "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200&h=600&fit=crop"}
          alt={project.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        <div className="absolute top-4 left-4 flex gap-2">
          <StatusBadge status={project.status} />
          {project.category && (
            <Badge className="bg-white/90 text-slate-700">
              {categoryIcons[project.category]} {project.category}
            </Badge>
          )}
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">
            {project.title}
          </h1>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Sobre o Projeto</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                {project.description}
              </p>
            </CardContent>
          </Card>

          {(project.evidences && project.evidences.length > 0) && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Galeria de Evidências</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {project.evidences.map((img: string, i: number) => (
                    <img
                      key={i}
                      src={img}
                      alt={`Evidência ${i + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Doações ({payments.length})</span>
                <span className="text-sm font-normal text-slate-500">
                  Total: {formatCurrency(payments.reduce((s: number, p: any) => s + (p.amount || 0), 0))}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-center text-slate-500 py-4">
                  Ainda não há doações para este projeto
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {payments.map((payment: any) => (
                    <div key={payment.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-teal-100 text-teal-700">
                          {payment.anonymous ? '?' : payment.user_email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">
                          {payment.anonymous ? 'Doador Anônimo' : payment.user_email}
                        </p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(payment.created_date), "dd 'de' MMM", { locale: ptBR })}
                        </p>
                      </div>
                      <p className="font-semibold text-teal-600">
                        {formatCurrency(payment.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-0 shadow-lg sticky top-4">
            <CardContent className="p-6 space-y-6">
              <div>
                <ProgressBar
                  current={project.current_amount || 0}
                  target={project.target_amount || 1}
                  size="lg"
                  label="Meta de Financiamento"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500">Votos</span>
                  <span className="font-semibold">
                    {minVotes > 0 ? `${diff}/${minVotes} votos úteis` : `${diff} votos úteis`}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span className="text-emerald-500 flex items-center gap-1">
                      👍 {upVotes}
                    </span>
                    <span className="text-rose-500 flex items-center gap-1">
                      👎 {downVotes}
                    </span>
                  </div>
                  <div className="flex h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${upPercent}%` }}
                    />
                    <div
                      className="h-full bg-rose-500"
                      style={{ width: `${downPercent}%` }}
                    />
                  </div>
                  {remainingVotes > 0 && canVote && (
                    <p className="text-[11px] text-amber-500 mt-0.5">
                      Faltam <span className="font-semibold">{remainingVotes}</span> votos
                      positivos para liberar doações.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-y">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{payments.length}</p>
                  <p className="text-sm text-slate-500">Apoiadores</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {project.funding_deadline
                      ? Math.max(0, Math.ceil((new Date(project.funding_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
                      : '∞'
                    }
                  </p>
                  <p className="text-sm text-slate-500">Dias restantes</p>
                </div>
              </div>

              <div className="space-y-3">
                {canDonate && (
                  <Button
                    className="w-full h-12 bg-teal-600 hover:bg-teal-700"
                    onClick={handleDonate}
                  >
                    <Heart className="w-5 h-5 mr-2" />
                    Fazer Doação
                  </Button>
                )}

                {canVote && (
                  <div className="space-y-2">
                    {isOwner ? (
                      <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-center text-sm text-slate-600 dark:text-slate-400">
                        Você não pode votar no seu próprio projeto
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            className="w-full h-11 bg-emerald-600 hover:bg-emerald-700"
                            disabled={hasVoted || voteMutation.isPending}
                            onClick={() => handleVote('up')}
                          >
                            👍 Gostei
                          </Button>
                          <Button
                            className="w-full h-11 bg-rose-600 hover:bg-rose-700"
                            disabled={hasVoted || voteMutation.isPending}
                            onClick={() => handleVote('down')}
                          >
                            👎 Não gostei
                          </Button>
                        </div>
                        {hasVoted && (
                          <Button
                            variant="outline"
                            className="w-full h-9 text-xs"
                            disabled={undoVoteMutation.isPending}
                            onClick={() => undoVoteMutation.mutate()}
                          >
                            Desfazer meu voto
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                )}

                <Button variant="outline" className="w-full">
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartilhar
                </Button>
              </div>

              {(project.voting_deadline || project.funding_deadline) && (
                <div className="space-y-2 pt-4 border-t text-sm">
                  {project.voting_deadline && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="w-4 h-4" />
                      <span>Votação até: {format(new Date(project.voting_deadline), 'dd/MM/yyyy')}</span>
                    </div>
                  )}
                  {project.funding_deadline && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Target className="w-4 h-4" />
                      <span>Meta até: {format(new Date(project.funding_deadline), 'dd/MM/yyyy')}</span>
                    </div>
                  )}
                </div>
              )}

              {project.budget_pdf_url && (
                <a href={project.budget_pdf_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" className="w-full">
                    <FileText className="w-4 h-4 mr-2" />
                    Ver Orçamento Detalhado
                    <Download className="w-4 h-4 ml-auto" />
                  </Button>
                </a>
              )}
            </CardContent>
          </Card>
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
