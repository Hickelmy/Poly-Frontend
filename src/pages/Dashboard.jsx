import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { polysApi } from '@/api/polysClient';
import { useQuery } from '@tanstack/react-query';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Map, Plus, Filter, Layers, Building2, Camera, ShoppingBag,
  Vote, Heart, Bell, Wallet, Search, MapPin, Users,
  TrendingUp, Calendar, ChevronRight, Eye, Navigation, Home, AlertCircle
} from 'lucide-react';
import LocationSetupModal from '../components/map/LocationSetupModal';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { toast } from "sonner";
import KPICard from '../components/shared/KPICard';
import ProgressBar from '../components/shared/ProgressBar';
import StatusBadge from '../components/shared/StatusBadge';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createIcon = (color) => new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="background: ${color}; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

const projectIcon = createIcon('#14b8a6');
const productIcon = createIcon('#8b5cf6');
const serviceIcon = createIcon('#f59e0b');
const homeIcon = createIcon('#ef4444');

// User location marker (blue pulsing dot)
const userLocationIcon = new L.DivIcon({
  className: 'user-location-marker',
  html: `<div style="
    background: #3b82f6; 
    width: 20px; 
    height: 20px; 
    border-radius: 50%; 
    border: 4px solid white; 
    box-shadow: 0 0 0 2px #3b82f6, 0 2px 10px rgba(59,130,246,0.5);
    animation: pulse 2s infinite;
  "></div>
  <style>
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(59,130,246,0.4); }
      70% { box-shadow: 0 0 0 15px rgba(59,130,246,0); }
      100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
    }
  </style>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function MapView({
  mapCenter,
  mapZoom,
  mapStyle,
  mapTiles,
  userLocation,
  userZone,
  zones,
  getZonePolygon,
  markers,
  onMarkerClick,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const zonesLayerRef = useRef(null);
  const userMarkerRef = useRef(null);

  // Inicializa o mapa apenas uma vez
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView(mapCenter, mapZoom);
    L.tileLayer(mapTiles[mapStyle], {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);
    zonesLayerRef.current = L.layerGroup().addTo(map);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Atualiza o estilo do mapa
  useEffect(() => {
    if (!mapRef.current) return;
    // Remove camadas de tiles existentes
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        mapRef.current.removeLayer(layer);
      }
    });
    L.tileLayer(mapTiles[mapStyle], {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(mapRef.current);
  }, [mapStyle, mapTiles]);

  // Atualiza centro/zoom
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(mapCenter, mapZoom);
  }, [mapCenter, mapZoom]);

  // Marcador da localização do usuário
  useEffect(() => {
    if (!mapRef.current) return;

    if (!userLocation) {
      if (userMarkerRef.current) {
        mapRef.current.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      return;
    }

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker(userLocation, { icon: userLocationIcon }).addTo(
        mapRef.current,
      );
    } else {
      userMarkerRef.current.setLatLng(userLocation);
    }
  }, [userLocation]);

  // Polígonos das zonas
  useEffect(() => {
    if (!zonesLayerRef.current) return;
    zonesLayerRef.current.clearLayers();

    if (userZone) {
      const poly = getZonePolygon(userZone);
      if (poly) {
        L.polygon(poly, {
          color: '#1e3a5f',
          weight: 3,
          fillOpacity: 0,
        }).addTo(zonesLayerRef.current);
      }
    }

    zones
      .filter((z) => !userZone || z.id !== userZone.id)
      .forEach((zone) => {
        const poly = getZonePolygon(zone);
        if (!poly) return;
        L.polygon(poly, {
          color: '#94a3b8',
          weight: 2,
          fillOpacity: 0,
          dashArray: '5, 5',
        }).addTo(zonesLayerRef.current);
      });
  }, [zones, userZone, getZonePolygon]);

  // Marcadores de projetos/produtos/serviços
  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    markers.forEach((marker) => {
      if (!marker.lat || !marker.lng) return;
      const m = L.marker([marker.lat, marker.lng], { icon: marker.icon }).addTo(
        markersLayerRef.current,
      );
      m.on('click', () => onMarkerClick(marker));
    });
  }, [markers, onMarkerClick]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full z-0"
      style={{ background: '#f1f5f9' }}
    />
  );
}

export default function Dashboard() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [mapCenter, setMapCenter] = useState([-23.5505, -46.6333]); // São Paulo default
  const [mapZoom, setMapZoom] = useState(14);
  const [mapStyle, setMapStyle] = useState('dark');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMarker, setSelectedMarker] = useState(null);
  
  // Location states
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [showLocationSetup, setShowLocationSetup] = useState(false);
  const [userResidence, setUserResidence] = useState(null);
  const [userZone, setUserZone] = useState(null);

  // Welcome message after registration
  useEffect(() => {
    if (location.state && location.state.fromRegister) {
      toast.success('Bem-vindo ao POLYS!', {
        description: 'Sua conta foi criada com sucesso. Configure sua localização para personalizar o conteúdo.',
      });
      // limpa o state para não repetir ao navegar de volta
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Load user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await polysApi.auth.me();
        setUser(userData);
        
        // Check if user has residence configured
        if (userData.residence_lat && userData.residence_lng) {
          setUserResidence({
            lat: userData.residence_lat,
            lng: userData.residence_lng
          });
        }
      } catch (e) {
        polysApi.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  // Request geolocation on mount
  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = () => {
    setLoadingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Seu navegador não suporta geolocalização.');
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        setMapCenter([latitude, longitude]);
        setMapZoom(16);
        setLoadingLocation(false);
      },
      (error) => {
        setLoadingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Permissão de localização negada. Habilite o serviço de localização nas configurações do navegador.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Localização indisponível. Verifique se o GPS está ativado.');
            break;
          case error.TIMEOUT:
            setLocationError('Tempo esgotado ao obter localização.');
            break;
          default:
            setLocationError('Erro ao obter localização.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Fetch user's zone if they have one
  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: () => polysApi.entities.Zone.filter({ active: true }),
  });

  // Detect user's zone based on current location
  useEffect(() => {
    if (userLocation && zones.length > 0) {
      // Check which zone contains user's current location
      for (const zone of zones) {
        if (zone.polygon_geojson?.coordinates) {
          const polygon = zone.polygon_geojson.coordinates[0];
          if (isPointInPolygon([userLocation[1], userLocation[0]], polygon)) {
            setUserZone(zone);
            // Update user's current zone
            if (user && user.current_zone_id !== zone.id) {
              polysApi.auth.updateMe({ current_zone_id: zone.id });
            }
            return;
          }
        }
      }
      setUserZone(null);
    }
  }, [userLocation, zones, user]);

  // Point-in-polygon check
  const isPointInPolygon = (point, polygon) => {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  };

  // Fetch data
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => polysApi.entities.Project.list('-created_date', 50),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => polysApi.entities.Product.filter({ active: true }, '-created_date', 50),
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => polysApi.entities.Service.filter({ active: true }, '-created_date', 50),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => polysApi.entities.Notification.filter({ read: false }, '-created_date', 10),
    enabled: !!user,
  });

  const { data: myPayments = [] } = useQuery({
    queryKey: ['myPayments', user?.email],
    queryFn: () => polysApi.entities.ProjectPayment.filter({ user_email: user.email, status: 'confirmed' }, '-created_date', 50),
    enabled: !!user?.email,
  });

  // Calculate stats
  const activeProjects = projects.filter(p => ['voting', 'funding'].includes(p.status));
  const totalDonated = myPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const votingProjects = projects.filter(p => p.status === 'voting');

  // Map styles
  const mapTiles = {
    street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
  };

  // Filter markers by category
  const getFilteredMarkers = () => {
    let markers = [];
    
    if (selectedCategory === 'all' || selectedCategory === 'projects') {
      markers = [...markers, ...projects.filter(p => p.lat && p.lng).map(p => ({
        ...p,
        type: 'project',
        icon: projectIcon
      }))];
    }
    
    if (selectedCategory === 'all' || selectedCategory === 'products') {
      markers = [...markers, ...products.filter(p => p.lat && p.lng).map(p => ({
        ...p,
        type: 'product',
        icon: productIcon
      }))];
    }
    
    if (selectedCategory === 'all' || selectedCategory === 'services') {
      markers = [...markers, ...services.filter(s => s.lat && s.lng).map(s => ({
        ...s,
        type: 'service',
        icon: serviceIcon
      }))];
    }
    
    return markers;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  // Convert GeoJSON polygon to Leaflet format
  const getZonePolygon = (zone) => {
    if (!zone?.polygon_geojson?.coordinates) return null;
    return zone.polygon_geojson.coordinates[0].map(coord => [coord[1], coord[0]]);
  };

  return (
    <div className="space-y-6">
      {/* Location Alert */}
      {locationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Localização Desativada</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{locationError}</span>
            <Button size="sm" variant="outline" onClick={requestLocation} className="ml-4">
              <Navigation className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Residence Setup Prompt */}
      {user && !user.residence_lat && !locationError && userLocation && (
        <Alert className="bg-teal-50 border-teal-200">
          <Home className="h-4 w-4 text-teal-600" />
          <AlertTitle className="text-teal-800">Configure sua localização</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span className="text-teal-700">Cadastre seu endereço para ver conteúdo relevante da sua comunidade.</span>
            <Button 
              size="sm" 
              onClick={() => setShowLocationSetup(true)}
              className="ml-4 bg-teal-600 hover:bg-teal-700"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Cadastrar Endereço
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Minhas Doações"
          value={formatCurrency(totalDonated)}
          icon={Wallet}
          color="teal"
        />
        <KPICard
          title="Projetos Ativos"
          value={activeProjects.length}
          subtitle="na comunidade"
          icon={Building2}
          color="blue"
        />
        <KPICard
          title="Em Votação"
          value={votingProjects.length}
          subtitle="aguardando votos"
          icon={Vote}
          color="purple"
        />
        <KPICard
          title="Notificações"
          value={notifications.length}
          subtitle="não lidas"
          icon={Bell}
          color="orange"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Map Section */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden border-0 shadow-lg">
            <CardHeader className="p-4 border-b bg-white dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Map className="w-5 h-5 text-teal-600" />
                  <CardTitle className="text-lg">Mapa da Comunidade</CardTitle>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Category Filter */}
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-36">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filtrar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="projects">Projetos</SelectItem>
                      <SelectItem value="products">Produtos</SelectItem>
                      <SelectItem value="services">Serviços</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Map Style */}
                  <Select value={mapStyle} onValueChange={setMapStyle}>
                    <SelectTrigger className="w-32">
                      <Layers className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="street">Ruas</SelectItem>
                      <SelectItem value="satellite">Satélite</SelectItem>
                      <SelectItem value="dark">Escuro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <div className="h-[500px] relative">
              <MapView
                mapCenter={mapCenter}
                mapZoom={mapZoom}
                mapStyle={mapStyle}
                mapTiles={mapTiles}
                userLocation={userLocation}
                userZone={userZone}
                zones={zones}
                getZonePolygon={getZonePolygon}
                markers={getFilteredMarkers()}
                onMarkerClick={setSelectedMarker}
              />

              {/* Legend */}
              <div className="absolute bottom-4 left-4 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-3 z-[1000]">
                <p className="text-xs font-medium text-slate-500 mb-2">Legenda</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow" />
                    <span>Você</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-teal-500" />
                    <span>Projetos</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <span>Produtos</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span>Serviços</span>
                  </div>
                  {userZone && (
                    <div className="flex items-center gap-2 text-xs pt-1 border-t mt-1">
                      <div className="w-4 h-0.5 bg-[#1e3a5f]" />
                      <span>Sua área</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Center on user button */}
              {userLocation && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-4 right-4 z-[1000] shadow-lg"
                  onClick={() => {
                    setMapCenter(userLocation);
                    setMapZoom(16);
                  }}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Minha Localização
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar Panel */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Link to={createPageUrl('Projects')}>
                <Button variant="outline" className="w-full h-20 flex-col gap-1">
                  <Heart className="w-5 h-5 text-teal-600" />
                  <span className="text-xs">Nova Doação</span>
                </Button>
              </Link>
              <Link to={createPageUrl('SellerDashboard')}>
                <Button variant="outline" className="w-full h-20 flex-col gap-1">
                  <ShoppingBag className="w-5 h-5 text-purple-600" />
                  <span className="text-xs">Criar Produto</span>
                </Button>
              </Link>
              <Link to={createPageUrl('Support')}>
                <Button variant="outline" className="w-full h-20 flex-col gap-1">
                  <Bell className="w-5 h-5 text-amber-600" />
                  <span className="text-xs">Abrir Chamado</span>
                </Button>
              </Link>
              {user?.user_role === 'administrador' && (
                <Link to={createPageUrl('CreateProject')}>
                  <Button className="w-full h-20 flex-col gap-1 bg-teal-600 hover:bg-teal-700">
                    <Plus className="w-5 h-5" />
                    <span className="text-xs">Criar Projeto</span>
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Voting Projects */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Em Votação</CardTitle>
                <Link to={createPageUrl('Projects')}>
                  <Button variant="ghost" size="sm">
                    Ver todos <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {votingProjects.slice(0, 3).map((project) => (
                <Link 
                  key={project.id} 
                  to={createPageUrl(`ProjectDetail?id=${project.id}`)}
                  className="block"
                >
                  <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <img 
                      src={project.image_url || "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=100&h=100&fit=crop"}
                      alt={project.title}
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                        {project.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <Vote className="w-3 h-3" />
                        <span>{project.votes_count || 0}/{project.min_votes || 10} votos</span>
                      </div>
                      <div className="mt-2">
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full">
                          <div 
                            className="h-full bg-teal-500 rounded-full"
                            style={{ width: `${Math.min(((project.votes_count || 0) / (project.min_votes || 10)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              {votingProjects.length === 0 && (
                <p className="text-center text-slate-500 py-4 text-sm">
                  Nenhum projeto em votação
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent Notifications */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Notificações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.slice(0, 4).map((notif) => (
                <div 
                  key={notif.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800"
                >
                  <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {notif.title || 'Nova notificação'}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {notif.message}
                    </p>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <p className="text-center text-slate-500 py-4 text-sm">
                  Nenhuma notificação
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Location Setup Modal */}
      <LocationSetupModal
        open={showLocationSetup}
        onClose={() => setShowLocationSetup(false)}
        user={user}
        onSuccess={() => {
          // Reload user data
          polysApi.auth.me().then(userData => {
            setUser(userData);
            if (userData.residence_lat && userData.residence_lng) {
              setUserResidence({
                lat: userData.residence_lat,
                lng: userData.residence_lng
              });
            }
          });
        }}
      />
    </div>
  );
}