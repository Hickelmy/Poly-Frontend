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

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export const MAP_STYLES: Record<string, { name: string; url: string }> = {
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

interface MapMarker {
  lat: number;
  lng: number;
  icon?: L.Icon | L.DivIcon;
  popup?: string;
}

interface MapPolygon {
  points: [number, number][];
  color?: string;
  weight?: number;
  fillColor?: string;
  fillOpacity?: number;
}

interface StandardMapProps {
  center?: [number, number];
  zoom?: number;
  onMapReady?: (map: L.Map) => void;
  markers?: MapMarker[];
  polygons?: MapPolygon[];
  onClick?: (coords: { lat: number; lng: number }) => void;
  className?: string;
  showStyleSelector?: boolean;
}

export default function StandardMap({
  center = [-15.7942, -47.8822],
  zoom = 13,
  onMapReady,
  markers = [],
  polygons = [],
  onClick,
  className = '',
  showStyleSelector = true,
}: StandardMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polygonsLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [mapStyle, setMapStyle] = useState<string>('dark');

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView(center, zoom);
    mapRef.current = map;

    markersLayerRef.current = L.layerGroup().addTo(map);
    polygonsLayerRef.current = L.layerGroup().addTo(map);

    tileLayerRef.current = L.tileLayer(MAP_STYLES.dark.url, {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    if (onMapReady) {
      onMapReady(map);
    }

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

  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;

    mapRef.current.removeLayer(tileLayerRef.current);

    tileLayerRef.current = L.tileLayer(MAP_STYLES[mapStyle].url, {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(mapRef.current);
  }, [mapStyle]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(center, zoom);
  }, [center, zoom]);

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
      }).addTo(markersLayerRef.current!);

      if (marker.popup) {
        m.bindPopup(marker.popup);
      }
    });
  }, [markers]);

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
      }).addTo(polygonsLayerRef.current!);
    });
  }, [polygons]);

  return (
    <div className={`relative ${className}`}>
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

      <div
        ref={containerRef}
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
}
