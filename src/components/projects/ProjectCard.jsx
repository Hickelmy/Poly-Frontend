import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Vote, Heart, Users, Calendar, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ProgressBar from '../shared/ProgressBar';
import StatusBadge from '../shared/StatusBadge';
import { cn } from "@/lib/utils";

const categoryIcons = {
  seguranca: "🛡️",
  infraestrutura: "🏗️",
  cultura: "🎭",
  saude: "🏥",
  educacao: "📚",
  lazer: "🎮",
  outro: "📌"
};

export default function ProjectCard({ project, onVote, onDonate, userVoted }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const canVote = ['proposed', 'voting'].includes(project.status);
  const canDonate = ['funding', 'funded', 'in_progress', 'completed'].includes(
    project.status,
  );
  const upVotes = project.up_votes_count ?? project.votes_count ?? 0;
  const downVotes = project.down_votes_count ?? 0;
  const totalVotes = upVotes + downVotes;
  // bias em [-1, 1]: -1 = só negativos, 0 = empate, 1 = só positivos
  const bias =
    totalVotes > 0 ? Math.max(-1, Math.min(1, (upVotes - downVotes) / totalVotes)) : 0;
  // barra sempre 100%: 50/50 no zero, puxa para o lado vencedor conforme bias
  const upPercent = 50 + bias * 50;
  const downPercent = 100 - upPercent;

  const minVotes = project.min_votes || 0;
  const diff = upVotes - downVotes;
  const remainingVotes = Math.max(0, minVotes - Math.max(diff, 0));

  const images = (project.evidences && project.evidences.length > 0)
    ? project.evidences
    : [project.image_url || "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400&h=300&fit=crop"];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const hasMultipleImages = images.length > 1;

  const goPrevImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goNextImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <Card className="overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 group bg-white dark:bg-slate-900">
      <div className="relative h-48 overflow-hidden">
        <img 
          src={images[currentImageIndex]}
          alt={project.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        
        {/* Status Badge */}
        <div className="absolute top-4 left-4">
          <StatusBadge status={project.status} />
        </div>

        {/* Category */}
        <div className="absolute top-4 right-4">
          <Badge variant="secondary" className="bg-white/90 text-slate-700">
            {categoryIcons[project.category]} {project.category}
          </Badge>
        </div>

        {/* Image slider controls */}
        {hasMultipleImages && (
          <div className="absolute inset-x-3 bottom-3 flex items-center justify-between text-white text-xs">
            <button
              type="button"
              onClick={goPrevImage}
              className="flex items-center justify-center w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 transition pointer-events-auto"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 py-0.5 rounded-full bg-black/40">
              {currentImageIndex + 1} / {images.length}
            </span>
            <button
              type="button"
              onClick={goNextImage}
              className="flex items-center justify-center w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 transition pointer-events-auto"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Title overlay */}
        <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
          <h3 className="text-lg font-bold text-white line-clamp-2">
            {project.title}
          </h3>
        </div>
      </div>

      <CardContent className="p-5">
        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
          {project.short_description || project.description}
        </p>

        {/* Stats */}
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

          {/* Tug of war bar */}
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

        {/* Progress */}
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
            variant={userVoted ? "secondary" : "outline"}
            size="sm"
            className={cn(
              "flex-1",
              userVoted && "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
            )}
            onClick={() => onVote && onVote(project)}
            disabled={userVoted}
          >
            <Vote className="w-4 h-4 mr-1.5" />
            {userVoted ? 'Votado' : 'Votar'}
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