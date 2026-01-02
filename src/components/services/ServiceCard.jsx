import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Clock, Calendar, User } from 'lucide-react';
import { cn } from "@/lib/utils";

const serviceTypeLabels = {
  limpeza: "Limpeza",
  manutencao: "Manutenção",
  jardinagem: "Jardinagem",
  eletrica: "Elétrica",
  encanamento: "Encanamento",
  pintura: "Pintura",
  aulas: "Aulas",
  cuidados: "Cuidados",
  transporte: "Transporte",
  outros: "Outros"
};

const priceTypeLabels = {
  hora: "/hora",
  diaria: "/dia",
  servico: "",
  orcamento: "sob orçamento"
};

export default function ServiceCard({ service, onBook }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  return (
    <Card className="overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 group bg-white dark:bg-slate-900">
      <div className="relative h-48 overflow-hidden">
        <img 
          src={service.images?.[0] || "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop"}
          alt={service.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        
        {/* Service Type Badge */}
        <div className="absolute top-4 left-4">
          <Badge variant="secondary" className="bg-white/90 text-slate-700">
            {serviceTypeLabels[service.service_type] || service.service_type}
          </Badge>
        </div>

        {/* Rating */}
        {service.rating && (
          <div className="absolute top-4 right-4 flex items-center gap-1 bg-white/90 px-2 py-1 rounded-full">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="text-sm font-medium text-slate-700">{service.rating.toFixed(1)}</span>
          </div>
        )}

        {/* Provider name */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-white text-sm">
            <User className="w-4 h-4" />
            <span>{service.provider_name || 'Prestador'}</span>
          </div>
        </div>
      </div>

      <CardContent className="p-5">
        <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-2 mb-2">
          {service.title}
        </h3>

        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
          {service.description}
        </p>

        {/* Availability Summary */}
        {service.availability_schedule && (
          <div className="mb-4 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <Calendar className="w-4 h-4" />
            <span>
              {(() => {
                const schedule = service.availability_schedule;
                const availableDays = Object.entries(schedule || {})
                  .filter(([_, day]) => day?.available && day?.timeSlots?.length > 0)
                  .map(([dayKey]) => {
                    const dayMap = {
                      monday: 'Seg',
                      tuesday: 'Ter',
                      wednesday: 'Qua',
                      thursday: 'Qui',
                      friday: 'Sex',
                      saturday: 'Sáb',
                      sunday: 'Dom'
                    };
                    return dayMap[dayKey] || dayKey;
                  });
                if (availableDays.length === 0) return 'Disponibilidade não configurada';
                if (availableDays.length === 7) return 'Disponível todos os dias';
                return `Disponível: ${availableDays.join(', ')}`;
              })()}
            </span>
          </div>
        )}

        {/* Preços Disponíveis */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2 items-center">
            {service.price_per_hour && (
              <Badge variant="outline" className="bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800">
                <Clock className="w-3 h-3 mr-1" />
                {formatCurrency(service.price_per_hour)}/hora
              </Badge>
            )}
            {service.price_per_day && (
              <Badge variant="outline" className="bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800">
                <Calendar className="w-3 h-3 mr-1" />
                {formatCurrency(service.price_per_day)}/dia
              </Badge>
            )}
            {service.price_per_service && (
              <Badge variant="outline" className="bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800">
                {formatCurrency(service.price_per_service)} serviço completo
              </Badge>
            )}
            {!service.price_per_hour && !service.price_per_day && !service.price_per_service && (
              <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Sob orçamento
              </Badge>
            )}
          </div>
        </div>

        {service.reviews_count > 0 && (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {service.reviews_count} avaliações
          </div>
        )}
      </CardContent>

      <CardFooter className="p-5 pt-0 flex gap-2">
        <Link
          to={`${createPageUrl('ServiceDetail')}?id=${service.id}`}
          className="flex-1"
        >
          <Button variant="outline" className="w-full" size="sm">
            Ver Perfil
          </Button>
        </Link>
        
        <Button
          size="sm"
          className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
          onClick={() => onBook && onBook(service)}
        >
          <Calendar className="w-4 h-4 mr-1.5" />
          Agendar
        </Button>
      </CardFooter>
    </Card>
  );
}