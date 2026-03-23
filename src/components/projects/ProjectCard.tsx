import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Vote, Heart, Users, Calendar, ArrowRight, ChevronLeft, ChevronRight, UserCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ProgressBar from '../shared/ProgressBar';
import StatusBadge from '../shared/StatusBadge';
import { cn } from "@/lib/utils";

const categoryIcons: Record<string, string> = {
  seguranca: "🛡️",
  infraestrutura: "🏗️",
  cultura: "🎭",
  saude: "🏥",
  educacao: "📚",
  lazer: "🎮",
  outro: "📌"
};

interface ProjectCardProps {
  project: any;
  onVote?: (project: any) => void;
  onDonate?: (project: any) => void;
  userVoted?: boolean;
  currentUser?: any;
}

export default function ProjectCard({ project, onVote, onDonate, userVoted, currentUser }: ProjectCardProps) {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const canVote = ['proposed', 'voting'].includes(project.status);
  const canDonate = ['funding', 'funded', 'in_progress', 'completed'].includes(
    project.status,
  );

  const isOwner = currentUser && (
    project.owner_email === currentUser.email ||
    project.owner_id === currentUser.id
  );

  const cannotVote = isOwner || userVoted;
  const upVotes = project.up_votes_count ?? project.votes_count ?? 0;
  const downVotes = project.down_votes_count ?? 0;
  const totalVotes = upVotes + downVotes;
  const bias =
    totalVotes > 0 ? Math.max(-1, Math.min(1, (upVotes - downVotes) / totalVotes)) : 0;
  const upPercent = 50 + bias * 50;
  const downPercent = 100 - upPercent;

  const minVotes = project.min_votes || 0;
  const diff = upVotes - downVotes;
  const remainingVotes = Math.max(0, minVotes - Math.max(diff, 0));

  const images: string[] = project.image_url
    ? [project.image_url, ...(project.evidences || [])]
    : (project.evidences && project.evidences.length > 0)
      ? project.evidences
      : [];

  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const hasMultipleImages = images.length > 1;

  const goPrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <Card className="overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 group bg-white dark:bg-slate-900">
      <div className="relative h-48 overflow-hidden">
        {images.length > 0 ? (
          <img
            src={images[currentImageIndex]}
            alt={project.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-teal-600 to-emerald-700" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        <div className="absolute top-4 left-4">
          <StatusBadge status={project.status} />
        </div>

        <div className="absolute top-4 right-4">
          <Badge variant="secondary" className="bg-white/90 text-slate-700">
            {categoryIcons[project.category]} {project.category}
          </Badge>
        </div>

        {hasMultipleImages && (
          <>
            <button
              type="button"
              onClick={goPrevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 transition pointer-events-auto text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={goNextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 transition pointer-events-auto text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/40 text-white text-xs pointer-events-none">
              {currentImageIndex + 1} / {images.length}
            </span>
          </>
        )}

        <div className="absolute bottom-8 left-4 right-4 pointer-events-none">
          <h3 className="text-lg font-bold text-white line-clamp-2">
            {project.title}
          </h3>
        </div>
      </div>

      <CardContent className="p-5">
        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
          {project.short_description || project.description}
        </p>

        <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 mb-3 gap-2">
          {(project.owner_name || project.owner_email) && (
            <div className="flex items-center gap-1 min-w-0">
              <UserCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{project.owner_name || project.owner_email?.split('@')[0]}</span>
            </div>
          )}
          {project.created_date && (
            <div className="flex items-center gap-1 shrink-0">
              <Calendar className="w-3.5 h-3.5" />
              <span>{format(new Date(project.created_date), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}</span>
            </div>
          )}
        </div>

        <div className="space-y-2 mb-4 text-sm">
          <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Vote className="w-4 h-4" />
              <span>{minVotes > 0 ? `${diff}/${minVotes} votos úteis` : `${diff} votos úteis`}</span>
          </div>
          {project.funding_deadline && (
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(project.funding_deadline), 'dd MMM', { locale: ptBR })}</span>
            </div>
          )}
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
            {remainingVotes > 0 && ['proposed', 'voting'].includes(project.status) && (
              <p className="text-[11px] text-amber-500 mt-0.5">
                Faltam <span className="font-semibold">{remainingVotes}</span> votos
                positivos para liberar doações.
              </p>
            )}
          </div>
        </div>

        <ProgressBar
          current={project.current_amount || 0}
          target={project.target_amount || 1}
          size="sm"
          showPercentage={false}
        />
      </CardContent>

      <CardFooter className="p-5 pt-0 flex gap-2">
        {canVote && (
          <Button
            variant={cannotVote ? "secondary" : "outline"}
            size="sm"
            className={cn(
              "flex-1",
              cannotVote && "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            )}
            onClick={() => onVote && onVote(project)}
            disabled={cannotVote}
            title={isOwner ? "Você não pode votar no seu próprio projeto" : userVoted ? "Você já votou neste projeto" : "Votar no projeto"}
          >
            <Vote className="w-4 h-4 mr-1.5" />
            {isOwner ? 'Seu projeto' : userVoted ? 'Votado' : 'Votar'}
          </Button>
        )}

        {canDonate && (
          <Button
            size="sm"
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => onDonate && onDonate(project)}
          >
            <Heart className="w-4 h-4 mr-1.5" />
            Doar
          </Button>
        )}

        <Link to={createPageUrl(`ProjectDetail?id=${project.id}`)}>
          <Button variant="ghost" size="sm">
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
