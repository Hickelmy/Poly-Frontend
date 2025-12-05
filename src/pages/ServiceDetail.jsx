import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { polysApi } from '@/api/polysClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Clock, Star, User } from 'lucide-react';

const serviceTypeLabels = {
  limpeza: 'Limpeza',
  manutencao: 'Manutenção',
  jardinagem: 'Jardinagem',
  eletrica: 'Elétrica',
  encanamento: 'Encanamento',
  pintura: 'Pintura',
  aulas: 'Aulas',
  cuidados: 'Cuidados',
  transporte: 'Transporte',
  outros: 'Outros',
};

const priceTypeLabels = {
  hora: '/hora',
  diaria: '/dia',
  servico: '',
  orcamento: 'sob orçamento',
};

export default function ServiceDetail() {
  const [user, setUser] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);
  const serviceId = urlParams.get('id');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const isAuth = await polysApi.auth.isAuthenticated();
        if (!isAuth) return;
        const userData = await polysApi.auth.me();
        setUser(userData);
      } catch {
        // ignore
      }
    };
    loadUser();
  }, []);

  const {
    data: service,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['service', serviceId],
    queryFn: async () => {
      const items = await polysApi.entities.Service.filter({ id: serviceId });
      return items[0];
    },
    enabled: !!serviceId,
  });

  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);

  const handleBook = () => {
    if (!user) {
      toast.error('Faça login para agendar');
      polysApi.auth.redirectToLogin(window.location.pathname + window.location.search);
      return;
    }
    if (!service || !service.active) {
      toast.error('Serviço indisponível');
      return;
    }
    toast.success('Fluxo de agendamento será implementado em breve.');
  };

  if (!serviceId) {
    return (
      <div className="space-y-4">
        <p className="text-slate-600 dark:text-slate-300">
          ID do serviço não informado.
        </p>
        <Link to={createPageUrl('Services')}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para serviços
          </Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-72 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full" />
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
      </div>
    );
  }

  if (isError || !service) {
    return (
      <div className="space-y-4">
        <p className="text-slate-600 dark:text-slate-300">
          Erro ao carregar o serviço: {error?.message || 'Serviço não encontrado.'}
        </p>
        <Link to={createPageUrl('Services')}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para serviços
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl('Services')}>
            <Button variant="ghost" size="sm" className="px-0 text-slate-500">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {service.title}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Imagem principal */}
        <Card className="lg:col-span-2 border-0 shadow-sm overflow-hidden">
          <div className="relative h-80 lg:h-96">
            <img
              src={
                service.images?.[0] ||
                'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=600&fit=crop'
              }
              alt={service.title}
              className="w-full h-full object-cover"
            />
          </div>
        </Card>

        {/* Painel lateral */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">
                {service.price_type === 'orcamento'
                  ? 'Sob orçamento'
                  : formatCurrency(service.price)}
              </p>
              {service.price_type !== 'orcamento' && (
                <span className="text-xs text-slate-400">
                  {priceTypeLabels[service.price_type]}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {service.service_type && (
                <Badge variant="secondary">
                  {serviceTypeLabels[service.service_type] || service.service_type}
                </Badge>
              )}
            </div>

            {typeof service.rating === 'number' && service.rating > 0 && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <Star className="w-4 h-4 text-amber-400" />
                <span>
                  {service.rating.toFixed(1)} ({service.reviews_count} avaliações)
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <User className="w-4 h-4" />
              <span>Prestado por {service.provider_name || 'Prestador'}</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Clock className="w-4 h-4" />
              <span>Atendimento sob agendamento</span>
            </div>

            <Button
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              size="lg"
              onClick={handleBook}
              disabled={!service.active}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Agendar serviço
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Sobre o serviço
          </h2>
          <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line">
            {service.description || 'Sem descrição informada.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


