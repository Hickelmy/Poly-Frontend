import React, { useState, useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Layers } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Estilos de mapa padronizados
export const MAP_STYLES = {
  street: {
    name: 'Ruas',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  },
  dark: {
    name: 'Escuro',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  },
};

/**
 * Componente de mapa padronizado com seleção de estilo
 * @param {Object} props
 * @param {Array} props.center - [lat, lng] - Centro do mapa
 * @param {Number} props.zoom - Zoom inicial
 * @param {Function} props.onMapReady - Callback quando o mapa está pronto (recebe mapRef)
 * @param {Array} props.markers - Array de marcadores { lat, lng, icon?, popup? }
 * @param {Array} props.polygons - Array de polígonos { points: [[lat, lng]], color?, weight? }
 * @param {Function} props.onClick - Callback ao clicar no mapa (recebe { lat, lng })
 * @param {String} props.className - Classes CSS adicionais
 * @param {Boolean} props.showStyleSelector - Mostrar seletor de estilo (padrão: true)
 */
export default function StandardMap({
  center = [-15.7942, -47.8822],
  zoom = 13,
  onMapReady,
  markers = [],
  polygons = [],
  onClick,
  className = '',
  showStyleSelector = true,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const polygonsLayerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const [mapStyle, setMapStyle] = useState('dark'); // Padrão: Escuro

  // Inicializa o mapa
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView(center, zoom);
    mapRef.current = map;

    // Cria layers para marcadores e polígonos
    markersLayerRef.current = L.layerGroup().addTo(map);
    polygonsLayerRef.current = L.layerGroup().addTo(map);

    // Adiciona tile layer inicial (escuro por padrão)
    tileLayerRef.current = L.tileLayer(MAP_STYLES.dark.url, {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Callback quando mapa está pronto
    if (onMapReady) {
      onMapReady(map);
    }

    // Handler de clique no mapa
    if (onClick) {
      map.on('click', (e) => {
        onClick({
          lat: e.latlng.lat,
          lng: e.latlng.lng,
        });
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Atualiza estilo do mapa
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;

    // Remove tile layer atual
    mapRef.current.removeLayer(tileLayerRef.current);

    // Adiciona novo tile layer
    tileLayerRef.current = L.tileLayer(MAP_STYLES[mapStyle].url, {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(mapRef.current);
  }, [mapStyle]);

  // Atualiza centro/zoom
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(center, zoom);
  }, [center, zoom]);

  // Atualiza marcadores
  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    markers.forEach((marker) => {
      if (!marker.lat || !marker.lng) return;
      
      const m = L.marker([marker.lat, marker.lng], {
        icon: marker.icon || L.icon({
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        }),
      }).addTo(markersLayerRef.current);

      if (marker.popup) {
        m.bindPopup(marker.popup);
      }
    });
  }, [markers]);

  // Atualiza polígonos
  useEffect(() => {
    if (!polygonsLayerRef.current) return;
    polygonsLayerRef.current.clearLayers();

    polygons.forEach((polygon) => {
      if (!polygon.points || polygon.points.length < 3) return;

      L.polygon(polygon.points, {
        color: polygon.color || '#14b8a6',
        weight: polygon.weight || 2,
        fillColor: polygon.fillColor || polygon.color || '#14b8a6',
        fillOpacity: polygon.fillOpacity || 0.2,
      }).addTo(polygonsLayerRef.current);
    });
  }, [polygons]);

  return (
    <div className={`relative ${className}`}>
      {/* Seletor de estilo */}
      {showStyleSelector && (
        <div className="absolute top-2 right-2 z-[1000] bg-white dark:bg-slate-800 rounded-lg shadow-lg p-1">
          <Select value={mapStyle} onValueChange={setMapStyle}>
            <SelectTrigger className="w-32 h-8 text-xs border-0 shadow-none">
              <Layers className="w-3 h-3 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">Escuro</SelectItem>
              <SelectItem value="street">Ruas</SelectItem>
              <SelectItem value="satellite">Satellite</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Container do mapa */}
      <div
        ref={containerRef}
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
}

