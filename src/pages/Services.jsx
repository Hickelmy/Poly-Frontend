import React, { useState, useEffect } from 'react';
import { polysApi } from '@/api/polysClient';
import { useQuery } from '@tanstack/react-query';
import { useSelectedZone } from '@/contexts/SelectedZoneContext';
import { useProximityFilter } from '@/hooks/useProximityFilter';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, Grid3X3, List, Wrench, Star,
  Calendar, Plus, MapPin
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import ServiceCard from '../components/services/ServiceCard';
import BookingModal from '../components/modals/BookingModal';
import CreateServiceModal from '../components/modals/CreateServiceModal';
import FullScreenLoading from '../components/shared/FullScreenLoading';
import { ProductCardSkeleton } from '../components/shared/SkeletonLoader';

export default function Services() {
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  const [viewMode, setViewMode] = useState('grid');
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [createServiceModalOpen, setCreateServiceModalOpen] = useState(false);

  // Zone context (para condomínios privados)
  const { selectedZone } = useSelectedZone();

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

  // Fetch services - otimizado com staleTime
  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => polysApi.entities.Service.filter({ active: true }, '-created_date', 100),
    staleTime: 2 * 60 * 1000, // 2 minutos
  });

  // Filter by proximity (ou zona para condomínios privados)
  const proximityFiltered = useProximityFilter(
    services,
    userLocation,
    5, // 5km de raio
    'zone_id',
    'lat',
    'lng'
  );

  // Filter and sort services
  const filteredServices = proximityFiltered
    .filter(service => {
      const matchesSearch = service.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           service.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           service.provider_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || service.service_type === typeFilter;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating': return (b.rating || 0) - (a.rating || 0);
        case 'price_asc': return (a.price || 0) - (b.price || 0);
        case 'price_desc': return (b.price || 0) - (a.price || 0);
        case 'recent': 
        default: return new Date(b.created_date) - new Date(a.created_date);
      }
    });

  const serviceTypes = [
    { value: 'all', label: 'Todos os Tipos' },
    { value: 'limpeza', label: '🧹 Limpeza' },
    { value: 'manutencao', label: '🔧 Manutenção' },
    { value: 'jardinagem', label: '🌱 Jardinagem' },
    { value: 'eletrica', label: '⚡ Elétrica' },
    { value: 'encanamento', label: '🚿 Encanamento' },
    { value: 'pintura', label: '🎨 Pintura' },
    { value: 'aulas', label: '📚 Aulas' },
    { value: 'cuidados', label: '💊 Cuidados' },
    { value: 'transporte', label: '🚗 Transporte' },
    { value: 'outros', label: '📌 Outros' },
  ];

  const handleBook = (service) => {
    if (!user) {
      toast.error('Faça login para agendar');
      return;
    }
    setSelectedService(service);
    setBookingModalOpen(true);
  };

  const ratedServices = services.filter((s) => typeof s.rating === 'number' && s.rating > 0);
  const avgRating = ratedServices.length > 0
    ? (ratedServices.reduce((sum, s) => sum + (s.rating || 0), 0) / ratedServices.length).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Serviços Locais
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Encontre profissionais na sua comunidade
          </p>
        </div>
        
        <Button 
          className="bg-teal-600 hover:bg-teal-700"
          onClick={() => {
            if (!user) {
              toast.error('Faça login para oferecer serviços');
              return;
            }
            setCreateServiceModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Oferecer Serviço
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-teal-100 dark:bg-teal-900/30">
              <Wrench className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{services.length}</p>
              <p className="text-sm text-slate-500">Serviços Disponíveis</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <Star className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{avgRating}</p>
              <p className="text-sm text-slate-500">Avaliação Média</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Buscar serviços ou profissionais..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Melhor Avaliação</SelectItem>
                  <SelectItem value="price_asc">Menor Preço</SelectItem>
                  <SelectItem value="price_desc">Maior Preço</SelectItem>
                  <SelectItem value="recent">Mais Recentes</SelectItem>
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

          {/* Active Filters */}
          {(selectedZone || userLocation) && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
              {selectedZone && (
                <Badge className="gap-1 bg-teal-600">
                  <MapPin className="w-3 h-3" />
                  Condomínio: {selectedZone.name}
                </Badge>
              )}
              {userLocation && !selectedZone && (
                <Badge className="gap-1 bg-blue-600">
                  <MapPin className="w-3 h-3" />
                  Próximos de você (5km)
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Services Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Nenhum serviço encontrado
            </h3>
            <p className="text-slate-500 mb-4">
              Tente buscar por outros termos ou categorias
            </p>
            <Button
              onClick={() => {
                if (!user) {
                  toast.error('Faça login para oferecer serviços');
                  return;
                }
                setCreateServiceModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Oferecer seu serviço
            </Button>
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
            {filteredServices.map((service) => (
              <motion.div
                key={service.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <ServiceCard
                  service={service}
                  onBook={handleBook}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Booking Modal */}
      <BookingModal
        open={bookingModalOpen}
        onClose={() => {
          setBookingModalOpen(false);
          setSelectedService(null);
        }}
        service={selectedService}
        user={user}
      />

      {/* Create Service Modal */}
      <CreateServiceModal
        open={createServiceModalOpen}
        onClose={() => setCreateServiceModalOpen(false)}
        user={user}
        onSuccess={() => {
          // Query invalidation is handled inside the modal
        }}
      />

      {/* Full Screen Loading - apenas no carregamento inicial */}
      <FullScreenLoading isLoading={false} />
    </div>
  );
}