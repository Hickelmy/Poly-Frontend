import React, { useState, useEffect } from 'react';
import { createPageUrl } from '../utils';
import { polysApi } from '@/api/polysClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelectedZone } from '@/contexts/SelectedZoneContext';
import { useProximityFilter } from '@/hooks/useProximityFilter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Plus, Grid3X3, List, ChevronDown,
  Vote, Heart, TrendingUp, Building2, MapPin, ArrowUpDown
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import ProjectCard from '../components/projects/ProjectCard';
import DonationModal from '../components/modals/DonationModal';
import CreateProjectModal from '../components/modals/CreateProjectModal';
import FullScreenLoading from '../components/shared/FullScreenLoading';
import { ProjectCardSkeleton } from '../components/shared/SkeletonLoader';

export default function Projects() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [donationModalOpen, setDonationModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [userVotes, setUserVotes] = useState([]);
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' ou 'voting'
  const [radiusKm, setRadiusKm] = useState(5);
  const [sortBy, setSortBy] = useState('newest');

  // Zone context (para condomínios privados)
  const { selectedZone } = useSelectedZone();

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await polysApi.auth.me();
        setUser(userData);
        
        // Se o usuário tem residence_lat/lng, usa essas coordenadas
        if (userData.residence_lat && userData.residence_lng) {
          setUserLocation({
            lat: userData.residence_lat,
            lng: userData.residence_lng
          });
        }
      } catch (e) {
        // Not logged in
      }
    };
    loadUser();
  }, []);

  // Obter localização atual do usuário (se não tiver residence configurado)
  useEffect(() => {
    if (userLocation) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Não foi possível obter localização:', error);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    }
  }, [userLocation]);

  // Fetch projects - otimizado com staleTime
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => polysApi.entities.Project.list('-created_date', 100),
    staleTime: 2 * 60 * 1000, // 2 minutos
  });

  // Fetch user votes
  const { data: votes = [] } = useQuery({
    queryKey: ['projectVotes', user?.email],
    queryFn: () => polysApi.entities.ProjectVote.filter({ user_email: user.email }),
    enabled: !!user?.email,
    onSuccess: (data) => {
      setUserVotes(data.map(v => v.project_id));
    }
  });

  useEffect(() => {
    if (votes.length > 0) {
      setUserVotes(votes.map(v => v.project_id));
    }
  }, [votes]);

  // Vote mutation (up / down)
  const voteMutation = useMutation({
    mutationFn: async ({ project, type }) => {
      return polysApi.entities.ProjectVote.create({
        project_id: project.id,
        user_id: user.id,
        user_email: user.email,
        type,
      });
    },
    onSuccess: (_, { project }) => {
      queryClient.invalidateQueries(['projects']);
      queryClient.invalidateQueries(['projectVotes']);
      setUserVotes(prev => [...prev, project.id]);
      toast.success('Voto registrado com sucesso!');
    },
    onError: (error) => {
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

  const [voteModalOpen, setVoteModalOpen] = useState(false);
  const [votingProject, setVotingProject] = useState(null);

  const handleOpenVoteModal = (project) => {
    if (!user) {
      toast.error('Faça login para votar');
      return;
    }
    
    // Verificar se é o criador do projeto
    if (project.owner_email === user.email || project.owner_id === user.id) {
      toast.info('Você não pode votar no seu próprio projeto');
      return;
    }
    
    if (userVotes.includes(project.id)) {
      toast.info('Você já votou neste projeto');
      return;
    }
    setVotingProject(project);
    setVoteModalOpen(true);
  };

  const handleDonate = (project) => {
    if (!user) {
      toast.error('Faça login para doar');
      return;
    }
    setSelectedProject(project);
    setDonationModalOpen(true);
  };

  // Filter by proximity (ou zona para condomínios privados)
  // Projects usa latitude/longitude (não lat/lng)
  const proximityFiltered = useProximityFilter(
    projects,
    userLocation,
    radiusKm,
    'zone_id',
    'latitude',
    'longitude'
  );

  // Separar projetos em ativos e em votação
  // Projetos ativos: status funding ou superior (funding, funded, in_progress, completed)
  const activeProjects = proximityFiltered.filter(project => {
    return ['funding', 'funded', 'in_progress', 'completed'].includes(project.status);
  });
  
  // Projetos em votação: status proposed ou voting
  const votingProjects = proximityFiltered.filter(project => {
    return ['proposed', 'voting'].includes(project.status);
  });

  // Selecionar lista baseada na tab ativa
  const projectsList = activeTab === 'active' ? activeProjects : votingProjects;

  // Filter projects (aplicado na lista selecionada)
  const filteredProjects = projectsList.filter(project => {
    const matchesSearch = project.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || project.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const sortOptions = [
    { value: 'newest', label: 'Mais recentes' },
    { value: 'oldest', label: 'Mais antigos' },
    { value: 'most_votes', label: 'Mais votados' },
    { value: 'most_funded', label: 'Mais arrecadado' },
  ];

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return new Date(a.created_date) - new Date(b.created_date);
      case 'most_votes':
        return ((b.up_votes_count ?? b.votes_count ?? 0) - (b.down_votes_count ?? 0)) -
               ((a.up_votes_count ?? a.votes_count ?? 0) - (a.down_votes_count ?? 0));
      case 'most_funded':
        return (b.current_amount || 0) - (a.current_amount || 0);
      case 'newest':
      default:
        return new Date(b.created_date) - new Date(a.created_date);
    }
  });

  const categories = [
    { value: 'all', label: 'Todas Categorias' },
    { value: 'seguranca', label: '🛡️ Segurança' },
    { value: 'infraestrutura', label: '🏗️ Infraestrutura' },
    { value: 'cultura', label: '🎭 Cultura' },
    { value: 'saude', label: '🏥 Saúde' },
    { value: 'educacao', label: '📚 Educação' },
    { value: 'lazer', label: '🎮 Lazer' },
    { value: 'outro', label: '📌 Outro' },
  ];

  const statuses = [
    { value: 'all', label: 'Todos Status' },
    { value: 'proposed', label: 'Proposto' },
    { value: 'voting', label: 'Em Votação' },
    { value: 'funding', label: 'Financiando' },
    { value: 'funded', label: 'Financiado' },
    { value: 'in_progress', label: 'Em Execução' },
    { value: 'completed', label: 'Concluído' },
  ];

  // Stats
  const totalRaised = projects.reduce((sum, p) => sum + (p.current_amount || 0), 0);
  const votingCount = projects.filter(p => p.status === 'voting').length;
  const fundingCount = projects.filter(p => p.status === 'funding').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Projetos Comunitários
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Vote e contribua com melhorias para sua comunidade
          </p>
        </div>
        
        {user && (
          <Button 
            className="bg-teal-600 hover:bg-teal-700"
            onClick={() => setCreateProjectModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar Projeto
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-teal-100 dark:bg-teal-900/30">
              <Building2 className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{projects.length}</p>
              <p className="text-sm text-slate-500">Total de Projetos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <Vote className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{votingCount}</p>
              <p className="text-sm text-slate-500">Em Votação</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <Heart className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{fundingCount}</p>
              <p className="text-sm text-slate-500">Arrecadando</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(totalRaised)}
              </p>
              <p className="text-sm text-slate-500">Arrecadado</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="active">
            Projetos Ativos ({activeProjects.length})
          </TabsTrigger>
          <TabsTrigger value="voting">
            Projetos em Votação ({votingProjects.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6 space-y-6">
          {/* Filters */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Buscar projetos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={String(radiusKm)} onValueChange={(v) => setRadiusKm(Number(v))}>
                    <SelectTrigger className="w-36">
                      <MapPin className="w-4 h-4 mr-1 text-teal-500" />
                      <SelectValue placeholder="Raio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 km</SelectItem>
                      <SelectItem value="2">2 km</SelectItem>
                      <SelectItem value="5">5 km</SelectItem>
                      <SelectItem value="10">10 km</SelectItem>
                      <SelectItem value="20">20 km</SelectItem>
                      <SelectItem value="50">50 km</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-44">
                      <ArrowUpDown className="w-4 h-4 mr-1 text-slate-400" />
                      <SelectValue placeholder="Ordenar" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex rounded-lg border">
                    <Button
                      variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                      size="icon"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size="icon"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Projects Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      ) : sortedProjects.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Nenhum projeto encontrado
            </h3>
            <p className="text-slate-500 mb-4">
              Tente ajustar os filtros ou buscar por outros termos
            </p>
          </CardContent>
        </Card>
      ) : (
        <motion.div 
          className={viewMode === 'grid' 
            ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
          }
          layout
        >
          <AnimatePresence mode="popLayout">
            {sortedProjects.map((project) => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <ProjectCard
                  project={project}
                  onVote={handleOpenVoteModal}
                  onDonate={handleDonate}
                  userVoted={userVotes.includes(project.id)}
                  currentUser={user}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
        </TabsContent>

        <TabsContent value="voting" className="mt-6 space-y-6">
          {/* Filters */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Buscar projetos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={String(radiusKm)} onValueChange={(v) => setRadiusKm(Number(v))}>
                    <SelectTrigger className="w-36">
                      <MapPin className="w-4 h-4 mr-1 text-teal-500" />
                      <SelectValue placeholder="Raio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 km</SelectItem>
                      <SelectItem value="2">2 km</SelectItem>
                      <SelectItem value="5">5 km</SelectItem>
                      <SelectItem value="10">10 km</SelectItem>
                      <SelectItem value="20">20 km</SelectItem>
                      <SelectItem value="50">50 km</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-44">
                      <ArrowUpDown className="w-4 h-4 mr-1 text-slate-400" />
                      <SelectValue placeholder="Ordenar" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex rounded-lg border">
                    <Button
                      variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                      size="icon"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size="icon"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Projects Grid */}
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <ProjectCardSkeleton key={i} />
              ))}
            </div>
          ) : sortedProjects.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Nenhum projeto em votação encontrado
                </h3>
                <p className="text-slate-500 mb-4">
                  Tente ajustar os filtros ou buscar por outros termos
                </p>
              </CardContent>
            </Card>
          ) : (
            <motion.div 
              className={viewMode === 'grid' 
                ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
              }
              layout
            >
              <AnimatePresence mode="popLayout">
                {sortedProjects.map((project) => (
                  <motion.div
                    key={project.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ProjectCard
                      project={project}
                      onVote={handleOpenVoteModal}
                      onDonate={handleDonate}
                      userVoted={userVotes.includes(project.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </TabsContent>
      </Tabs>

      {/* Vote Modal */}
      {votingProject && (
        <Dialog open={voteModalOpen} onOpenChange={(open) => {
          setVoteModalOpen(open);
          if (!open) setVotingProject(null);
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Votar no projeto</span>
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {votingProject.title}
                </span>
              </DialogTitle>
              <DialogDescription>
                Aprove ou desaprove este projeto para que ele possa avançar para a etapa de financiamento.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {votingProject.short_description || votingProject.description}
              </p>

              {/* Tug of war summary */}
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium">
                  Situação atual da votação
                </p>
                <ProjectCard
                  project={votingProject}
                  onVote={() => {}}
                  onDonate={null}
                  userVoted={userVotes.includes(votingProject.id)}
                  currentUser={user}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={voteMutation.isPending || userVotes.includes(votingProject.id)}
                  onClick={() => {
                    voteMutation.mutate({ project: votingProject, type: 'up' });
                    setVoteModalOpen(false);
                  }}
                >
                  👍 Apoiar projeto
                </Button>
                <Button
                  className="bg-rose-600 hover:bg-rose-700"
                  disabled={voteMutation.isPending || userVotes.includes(votingProject.id)}
                  onClick={() => {
                    voteMutation.mutate({ project: votingProject, type: 'down' });
                    setVoteModalOpen(false);
                  }}
                >
                  👎 Não apoiar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Donation Modal */}
      <DonationModal
        open={donationModalOpen}
        onClose={() => {
          setDonationModalOpen(false);
          setSelectedProject(null);
        }}
        project={selectedProject}
        user={user}
      />

      {/* Create Project Modal */}
      <CreateProjectModal
        open={createProjectModalOpen}
        onClose={() => setCreateProjectModalOpen(false)}
        user={user}
      />

      {/* Full Screen Loading - apenas no carregamento inicial */}
      <FullScreenLoading isLoading={false} />
    </div>
  );
}