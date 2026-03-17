import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { polysApi } from '@/api/polysClient';
import { useQuery } from '@tanstack/react-query';
import { useSelectedZone } from '@/contexts/SelectedZoneContext';
import { filterByProximity } from '@/hooks/useProximityFilter';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Map, Plus, Filter, Layers, Building2, Camera, ShoppingBag,
  Vote, Heart, Bell, Wallet, Search, MapPin, Users,
  TrendingUp, Calendar, ChevronRight, Eye, Navigation, Home, AlertCircle,
  Check, X as XIcon
} from 'lucide-react';
import LocationSetupModal from '../components/map/LocationSetupModal';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import FullScreenLoading from '../components/shared/FullScreenLoading';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icon com prévia de imagem
const createImageIcon = (imageUrl, color) => new L.DivIcon({
  className: '',
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.35))">
      <div style="
        width:44px;height:44px;border-radius:50%;
        border:3px solid white;outline:2.5px solid ${color};
        overflow:hidden;background:${color};
        box-shadow:0 2px 8px rgba(0,0,0,0.25);
      ">
        ${imageUrl
          ? `<img src="${imageUrl}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentNode.style.background='${color}';this.remove()" />`
          : `<div style="width:100%;height:100%;background:${color};opacity:0.7;"></div>`
        }
      </div>
      <div style="
        width:0;height:0;
        border-left:7px solid transparent;
        border-right:7px solid transparent;
        border-top:10px solid ${color};
        margin-top:-1px;
      "></div>
    </div>
  `,
  iconSize: [50, 60],
  iconAnchor: [25, 60],
  popupAnchor: [0, -62],
});

const homeIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="background:#ef4444;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

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
  selectedZone,
  onZoneClick,
  proximityRadius = 5000, // metros
}) {
  const containerRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const zonesLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const radiusCircleRef = useRef<any>(null);

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
    
    // Aguardar um pouco para garantir que o mapa está totalmente renderizado
    setTimeout(() => {
      // Se já tiver userLocation, adicionar o marcador
      if (userLocation && userLocation.length === 2) {
        const [lat, lng] = userLocation;
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          if (!userMarkerRef.current) {
            userMarkerRef.current = L.marker([lat, lng], { icon: userLocationIcon }).addTo(map);
          }
        }
      }
    }, 200);
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
    if (!mapRef.current) {
      // Se o mapa ainda não estiver pronto, aguardar um pouco
      const timer = setTimeout(() => {
        if (mapRef.current && userLocation) {
          // Tentar novamente após o mapa estar pronto
          const [lat, lng] = userLocation;
          if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            if (!userMarkerRef.current) {
              userMarkerRef.current = L.marker([lat, lng], { icon: userLocationIcon }).addTo(mapRef.current);
            }
          }
        }
      }, 500);
      return () => clearTimeout(timer);
    }

    if (!userLocation || !Array.isArray(userLocation) || userLocation.length !== 2) {
      if (userMarkerRef.current) {
        mapRef.current.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      return;
    }

    // Validar coordenadas
    const [lat, lng] = userLocation;
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.error('Coordenadas inválidas para marcador:', lat, lng);
      if (userMarkerRef.current) {
        mapRef.current.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      return;
    }

    // Garantir que o formato está correto [lat, lng]
    const coords = [lat, lng];

    if (!userMarkerRef.current) {
      try {
        userMarkerRef.current = L.marker(coords, { icon: userLocationIcon }).addTo(
          mapRef.current,
        );
      } catch (error) {
        console.error('Erro ao adicionar marcador:', error);
      }
    } else {
      try {
        userMarkerRef.current.setLatLng(coords);
      } catch (error) {
        console.error('Erro ao atualizar marcador:', error);
        try {
          mapRef.current.removeLayer(userMarkerRef.current);
          userMarkerRef.current = L.marker(coords, { icon: userLocationIcon }).addTo(mapRef.current);
        } catch (retryError) {
          console.error('Erro ao recriar marcador:', retryError);
        }
      }
    }

    // Raio de alcance ao redor do usuário
    try {
      if (!radiusCircleRef.current) {
        radiusCircleRef.current = L.circle(coords, {
          radius: proximityRadius,
          color: '#3b82f6',
          weight: 1.5,
          opacity: 0.6,
          fillColor: '#3b82f6',
          fillOpacity: 0.04,
          dashArray: '10, 8',
          interactive: false,
        }).addTo(mapRef.current);
      } else {
        radiusCircleRef.current.setLatLng(coords);
        radiusCircleRef.current.setRadius(proximityRadius);
      }
    } catch (error) {
      console.error('Erro ao desenhar raio:', error);
    }
  }, [userLocation, proximityRadius]);

  // Atualiza apenas o raio quando o slider muda (sem depender de userLocation)
  useEffect(() => {
    if (!radiusCircleRef.current) return;
    try {
      radiusCircleRef.current.setRadius(proximityRadius);
    } catch (error) {
      console.error('Erro ao atualizar raio:', error);
    }
  }, [proximityRadius]);

  // Polígonos das zonas - agora com clique para selecionar
  useEffect(() => {
    if (!zonesLayerRef.current) return;
    zonesLayerRef.current.clearLayers();

    zones.forEach((zone) => {
      const poly = getZonePolygon(zone);
      if (!poly) return;

      const isSelected = selectedZone?.id === zone.id;
      const isUserZone = userZone?.id === zone.id;

      const polygon = L.polygon(poly, {
        color: isSelected ? '#14b8a6' : isUserZone ? '#14b8a6' : '#94a3b8',
        weight: isSelected ? 3 : isUserZone ? 2.5 : 1.5,
        opacity: isSelected ? 1 : isUserZone ? 0.9 : 0.5,
        fillColor: isSelected ? '#14b8a6' : isUserZone ? '#14b8a6' : '#94a3b8',
        fillOpacity: isSelected ? 0.18 : isUserZone ? 0.1 : 0.04,
        dashArray: isSelected ? null : isUserZone ? '8, 5' : '5, 8',
        interactive: true,
      });

      // Popup de seleção ao clicar na zona
      polygon.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        
        const popupContent = document.createElement('div');
        popupContent.className = 'zone-select-popup';
        popupContent.innerHTML = `
          <div style="padding: 8px; min-width: 180px;">
            <p style="font-weight: 600; margin-bottom: 8px; font-size: 14px;">${zone.name}</p>
            <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">
              ${isSelected ? 'Área selecionada atualmente' : 'Clique para filtrar por esta área'}
            </p>
            <button 
              id="select-zone-btn-${zone.id}" 
              style="
                width: 100%;
                padding: 8px 16px;
                background: ${isSelected ? '#ef4444' : '#14b8a6'};
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
              "
            >
              ${isSelected ? 'Remover Filtro' : 'Selecionar Área'}
            </button>
          </div>
        `;

        const popup = L.popup({
          closeButton: true,
          className: 'zone-popup',
        })
          .setLatLng(e.latlng)
          .setContent(popupContent)
          .openOn(mapRef.current);

        // Adiciona evento ao botão depois que o popup for adicionado ao DOM
        setTimeout(() => {
          const btn = document.getElementById(`select-zone-btn-${zone.id}`);
          if (btn) {
            btn.onclick = () => {
              onZoneClick(isSelected ? null : zone);
              mapRef.current.closePopup();
            };
          }
        }, 0);
      });

      // Hover effect
      polygon.on('mouseover', () => {
        if (!isSelected) {
          polygon.setStyle({ fillOpacity: 0.2 });
        }
      });
      polygon.on('mouseout', () => {
        if (!isSelected) {
          polygon.setStyle({ fillOpacity: 0.05 });
        }
      });

      polygon.addTo(zonesLayerRef.current);
    });
  }, [zones, userZone, selectedZone, getZonePolygon, onZoneClick]);

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
  const [user, setUser] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<any[]>([-15.7942, -47.8822]); // Centro do Brasil como fallback inicial
  const [mapZoom, setMapZoom] = useState<number>(4); // Zoom inicial baixo para mostrar o Brasil
  const [mapStyle, setMapStyle] = useState<string>('dark'); // Padrão: Escuro
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Zone selection context (apenas para condomínios privados)
  const { selectedZone, setSelectedZone, zones: contextZones } = useSelectedZone();

  // Location states
  const [userLocation, setUserLocation] = useState<any>(null);
  const [locationError, setLocationError] = useState<any>(null);
  const [loadingLocation, setLoadingLocation] = useState<boolean>(true);
  const [showLocationSetup, setShowLocationSetup] = useState<boolean>(false);
  const [userResidence, setUserResidence] = useState<any>(null);
  const [userZone, setUserZone] = useState<any>(null);
  const [initialLocationSet, setInitialLocationSet] = useState<boolean>(false);

  // Map interaction — radius persiste no localStorage
  const [proximityRadius, setProximityRadius] = useState<number>(
    () => parseInt(localStorage.getItem('map_proximity_radius') || '5000', 10)
  );
  const [markerPreview, setMarkerPreview] = useState<any>(null);
  const [modalItem, setModalItem] = useState<any>(null); // item mantido ao abrir o modal completo
  const [showItemModal, setShowItemModal] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('map_proximity_radius', String(proximityRadius));
  }, [proximityRadius]);

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
        
        // Check if user has residence configured - usa como centro inicial do mapa
        if (userData.residence_lat && userData.residence_lng) {
          setUserResidence({
            lat: userData.residence_lat,
            lng: userData.residence_lng
          });
          // Define a residência como centro inicial
          if (!initialLocationSet) {
            setMapCenter([userData.residence_lat, userData.residence_lng]);
            setMapZoom(15);
            setInitialLocationSet(true);
          }
        }
      } catch (e) {
        polysApi.auth.redirectToLogin();
      }
    };
    loadUser();
  }, [initialLocationSet]);

  // Detectar localização inicial por IP (rápido) antes do GPS
  useEffect(() => {
    const detectInitialLocation = async () => {
      if (initialLocationSet) return;
      const loc = await import('@/utils/geolocation').then((m) => m.getLocationByIP());
      if (loc && loc.latitude && loc.longitude) {
        setMapCenter([loc.latitude, loc.longitude]);
        setMapZoom(12);
        setInitialLocationSet(true);
      }
    };
    detectInitialLocation();
  }, [initialLocationSet]);

  // Request geolocation on mount (GPS preciso, mas mais lento)
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
        
        // Validar coordenadas
        if (isNaN(latitude) || isNaN(longitude) || 
            latitude < -90 || latitude > 90 || 
            longitude < -180 || longitude > 180) {
          console.error('Coordenadas GPS inválidas:', latitude, longitude);
          setLocationError('Coordenadas inválidas obtidas do GPS.');
          setLoadingLocation(false);
          return;
        }
        
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

  // Fetch data - otimizado com staleTime maior para dados que não mudam frequentemente
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => polysApi.entities.Project.list('-created_date', 50),
    staleTime: 2 * 60 * 1000, // 2 minutos - projetos não mudam tão frequentemente
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => polysApi.entities.Product.filter({ active: true }, '-created_date', 50),
    staleTime: 2 * 60 * 1000, // 2 minutos
  });

  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ['services'],
    queryFn: () => polysApi.entities.Service.filter({ active: true }, '-created_date', 50),
    staleTime: 2 * 60 * 1000, // 2 minutos
  });

  const { data: notifications = [], isLoading: loadingNotifications } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => polysApi.entities.Notification.filter({ read: false }, '-created_date', 10),
    enabled: !!user,
    staleTime: 30 * 1000, // 30 segundos - notificações podem mudar mais frequentemente
  });

  const { data: myPayments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['myPayments', user?.email],
    queryFn: () => polysApi.entities.ProjectPayment.filter({ user_email: user.email, status: 'confirmed' }, '-created_date', 50),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000, // 5 minutos - pagamentos não mudam após confirmados
  });

  // Combined loading state - apenas para carregamento inicial (quando não há dados ainda)
  const isInitialLoading = loadingLocation && !userLocation && !projects.length && !products.length && !services.length;

  // Calculate stats
  const activeProjects = projects.filter(p => ['voting', 'funding'].includes(p.status));
  const totalDonated = myPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const votingProjects = projects.filter(p => p.status === 'voting');

  // Map styles - usando o padrão do StandardMap
  const mapTiles = {
    street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
  };

  // Converte userLocation para formato {lat, lng}
  const userLocationObj = userLocation ? {
    lat: Array.isArray(userLocation) ? userLocation[0] : userLocation.lat,
    lng: Array.isArray(userLocation) ? userLocation[1] : userLocation.lng
  } : null;

  // Filter markers by category and proximity
  const radiusKm = proximityRadius / 1000;

  const getFilteredMarkers = () => {
    let markers = [];

    if (selectedCategory === 'all' || selectedCategory === 'projects') {
      const filteredProjects = filterByProximity(
        projects, userLocationObj, radiusKm, 'zone_id', 'lat', 'lng', selectedZone
      );
      markers = [...markers, ...filteredProjects.filter(p => p.lat && p.lng).map(p => ({
        ...p, type: 'project',
        icon: createImageIcon(p.image_url || p.evidences?.[0] || null, '#14b8a6'),
      }))];
    }

    if (selectedCategory === 'all' || selectedCategory === 'products') {
      const filteredProducts = filterByProximity(
        products, userLocationObj, radiusKm, 'zone_id', 'lat', 'lng', selectedZone
      );
      markers = [...markers, ...filteredProducts.filter(p => p.lat && p.lng).map(p => ({
        ...p, type: 'product',
        icon: createImageIcon(p.images?.[0] || null, '#8b5cf6'),
      }))];
    }

    if (selectedCategory === 'all' || selectedCategory === 'services') {
      const filteredServices = filterByProximity(
        services, userLocationObj, radiusKm, 'zone_id', 'lat', 'lng', selectedZone
      );
      markers = [...markers, ...filteredServices.filter(s => s.lat && s.lng).map(s => ({
        ...s, type: 'service',
        icon: createImageIcon(s.images?.[0] || null, '#f59e0b'),
      }))];
    }

    return markers;
  };

  // Helpers para o preview de marcadores
  const getItemImage = (item) => {
    if (!item) return null;
    if (item.type === 'project') return item.image_url || item.evidences?.[0] || null;
    return item.images?.[0] || null;
  };

  const getItemTitle = (item) => item?.title || item?.name || 'Sem título';

  const getItemSubtitle = (item) => {
    if (!item) return '';
    if (item.type === 'project') return item.short_description || item.description?.slice(0, 80) || '';
    if (item.type === 'product') {
      const price = item.price != null
        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)
        : null;
      return price || item.description?.slice(0, 60) || '';
    }
    return item.description?.slice(0, 80) || '';
  };

  const getItemUrl = (item) => {
    if (!item) return '#';
    if (item.type === 'project') return createPageUrl(`ProjectDetail?id=${item.id}`);
    if (item.type === 'product') return createPageUrl(`ProductDetail?id=${item.id}`);
    if (item.type === 'service') return createPageUrl(`ServiceDetail?id=${item.id}`);
    return '#';
  };

  const TYPE_META = {
    project:  { label: 'Projeto',  color: 'bg-teal-500' },
    product:  { label: 'Produto',  color: 'bg-purple-500' },
    service:  { label: 'Serviço',  color: 'bg-amber-500' },
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Map className="w-5 h-5 text-teal-600" />
                  <CardTitle className="text-lg">Mapa da Comunidade</CardTitle>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Raio de alcance */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="text-xs text-slate-500 whitespace-nowrap">Raio:</span>
                    <Slider
                      min={1000}
                      max={20000}
                      step={1000}
                      value={[proximityRadius]}
                      onValueChange={([v]) => setProximityRadius(v)}
                      className="w-24"
                    />
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 w-8 text-right">
                      {radiusKm}km
                    </span>
                  </div>

                  {/* Category Filter */}
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-36 h-9">
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
                    <SelectTrigger className="w-32 h-9">
                      <Layers className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">Escuro</SelectItem>
                      <SelectItem value="street">Ruas</SelectItem>
                      <SelectItem value="satellite">Satélite</SelectItem>
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
                onMarkerClick={(item) => { setMarkerPreview(item); setShowItemModal(false); }}
                selectedZone={selectedZone}
                onZoneClick={setSelectedZone}
                proximityRadius={proximityRadius}
              />

              {/* Legend */}
              <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-xl shadow-lg p-3 z-[1000]">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Legenda</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow" />
                    <span>Você</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <div className="w-4 h-px border border-dashed border-blue-400" style={{ borderWidth: '1.5px' }} />
                    <span>Raio de alcance (5km)</span>
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-700 pt-1.5 mt-0.5 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <div className="w-3 h-3 rounded-full bg-teal-500" />
                      <span>Projetos</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      <span>Produtos</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <span>Serviços</span>
                    </div>
                  </div>
                  {userZone && (
                    <div className="border-t border-slate-100 dark:border-slate-700 pt-1.5 mt-0.5 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <div className="w-4 h-px border border-dashed border-teal-500" style={{ borderWidth: '2px' }} />
                        <span className="font-medium text-teal-600 dark:text-teal-400">Sua zona</span>
                      </div>
                      <p className="text-[10px] text-teal-500 pl-6">{userZone.name}</p>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                  Clique em uma zona para filtrar
                </p>
              </div>

              {/* Selected Zone Indicator */}
              {selectedZone && (
                <div className="absolute top-4 left-4 bg-teal-600 text-white rounded-lg shadow-lg px-3 py-2 z-[1000] flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-medium">{selectedZone.name}</span>
                  <button 
                    onClick={() => setSelectedZone(null)}
                    className="ml-1 hover:bg-teal-700 rounded p-0.5"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Center on user button */}
              {userLocation && !markerPreview && (
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

              {/* Floating item preview card */}
              {markerPreview && (
                <div className="absolute top-4 right-4 z-[1001] w-60 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {/* Thumbnail */}
                  <div className="relative h-28 bg-slate-100 dark:bg-slate-700">
                    {getItemImage(markerPreview) ? (
                      <img
                        src={getItemImage(markerPreview)}
                        alt={getItemTitle(markerPreview)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Building2 className="w-8 h-8" />
                      </div>
                    )}
                    {/* Type badge */}
                    <span className={`absolute top-2 left-2 text-[10px] font-semibold text-white px-1.5 py-0.5 rounded-full ${TYPE_META[markerPreview.type]?.color || 'bg-slate-500'}`}>
                      {TYPE_META[markerPreview.type]?.label}
                    </span>
                    {/* Close */}
                    <button
                      onClick={() => setMarkerPreview(null)}
                      className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-3 space-y-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">
                      {getItemTitle(markerPreview)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {getItemSubtitle(markerPreview) || 'Sem descrição'}
                    </p>
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs bg-teal-600 hover:bg-teal-700"
                      onClick={() => { setModalItem(markerPreview); setMarkerPreview(null); setShowItemModal(true); }}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      Ver prévia
                    </Button>
                  </div>
                </div>
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
              {(user?.user_role === 'administrador' || user?.user_role === 'gestor') && (
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

      {/* Item Detail Modal */}
      {modalItem && (
        <Dialog open={showItemModal} onOpenChange={(open) => { setShowItemModal(open); if (!open) setModalItem(null); }}>
          <DialogContent className="max-w-md p-0 overflow-hidden">
            {/* Image */}
            <div className="relative h-52 bg-slate-100 dark:bg-slate-800">
              {getItemImage(modalItem) ? (
                <img
                  src={getItemImage(modalItem)}
                  alt={getItemTitle(modalItem)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                  <Building2 className="w-14 h-14" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className={`absolute bottom-3 left-4 text-xs font-semibold text-white px-2 py-0.5 rounded-full ${TYPE_META[modalItem.type]?.color || 'bg-slate-500'}`}>
                {TYPE_META[modalItem.type]?.label}
              </span>
            </div>

            {/* Content */}
            <div className="p-5 space-y-3">
              <DialogHeader>
                <DialogTitle className="text-lg leading-snug">
                  {getItemTitle(modalItem)}
                </DialogTitle>
                {getItemSubtitle(modalItem) && (
                  <DialogDescription className="text-sm leading-relaxed">
                    {getItemSubtitle(modalItem)}
                  </DialogDescription>
                )}
              </DialogHeader>

              {/* Extra info per type */}
              {modalItem.type === 'project' && modalItem.target_amount > 0 && (
                <div className="flex items-center gap-4 p-3 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800">
                  <div className="text-center">
                    <p className="text-[10px] text-teal-500 uppercase font-semibold">Meta</p>
                    <p className="text-sm font-bold text-teal-700 dark:text-teal-300">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(modalItem.target_amount)}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-teal-200 dark:bg-teal-700" />
                  <div className="text-center">
                    <p className="text-[10px] text-teal-500 uppercase font-semibold">Votos</p>
                    <p className="text-sm font-bold text-teal-700 dark:text-teal-300">
                      {modalItem.votes_count || 0}/{modalItem.min_votes || 10}
                    </p>
                  </div>
                </div>
              )}

              {modalItem.type === 'product' && modalItem.price != null && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
                  <ShoppingBag className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(modalItem.price)}
                  </span>
                  {modalItem.quantity_available != null && (
                    <span className="text-xs text-purple-500 ml-auto">{modalItem.quantity_available} disponíveis</span>
                  )}
                </div>
              )}

              {modalItem.location_address && (
                <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                  <span className="line-clamp-2">{modalItem.location_address}</span>
                </div>
              )}

              <Link to={getItemUrl(modalItem)} onClick={() => { setShowItemModal(false); setModalItem(null); }}>
                <Button className="w-full bg-teal-600 hover:bg-teal-700 mt-1">
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Ver mais detalhes
                </Button>
              </Link>
            </div>
          </DialogContent>
        </Dialog>
      )}

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

      {/* Full Screen Loading - apenas no carregamento inicial */}
      <FullScreenLoading isLoading={isInitialLoading} message="Carregando dados..." />
    </div>
  );
}