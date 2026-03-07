import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { polysApi } from '@/api/polysClient';
import { 
  MapPin, Pencil, Trash2, Check, X, Loader2, AlertCircle, 
  Navigation, Home
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { toast } from "sonner";

// User location marker
const userLocationIcon = new L.DivIcon({
  className: 'user-location-marker',
  html: `<div style="
    background: #3b82f6; 
    width: 20px; 
    height: 20px; 
    border-radius: 50%; 
    border: 4px solid white; 
    box-shadow: 0 0 0 2px #3b82f6, 0 2px 10px rgba(59,130,246,0.5);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Drawing controller component
function DrawingController({ isDrawing, points, setPoints, onComplete }) {
  const map = useMapEvents({
    click(e) {
      if (isDrawing) {
        setPoints([...points, [e.latlng.lat, e.latlng.lng]]);
      }
    }
  });

  return null;
}

// Map center controller
function MapCenterController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 16);
    }
  }, [center, zoom, map]);
  return null;
}

export default function LocationSetupModal({ open, onClose, user, onSuccess }) {
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnPoints, setDrawnPoints] = useState([]);
  const [existingZone, setExistingZone] = useState(null);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState('location'); // 'location' | 'draw' | 'confirm'

  // Request user location on mount
  useEffect(() => {
    if (open) {
      requestLocation();
    }
  }, [open]);

  const requestLocation = () => {
    setLoadingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Seu navegador não suporta geolocalização.');
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        setLoadingLocation(false);
        
        // Try to find existing zone that contains this location
        await checkExistingZone(latitude, longitude);
      },
      (error) => {
        setLoadingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Permissão de localização negada. Por favor, habilite o serviço de localização nas configurações do seu navegador para continuar.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Informação de localização indisponível. Verifique se o GPS está ativado.');
            break;
          case error.TIMEOUT:
            setLocationError('Tempo esgotado ao obter localização. Tente novamente.');
            break;
          default:
            setLocationError('Erro desconhecido ao obter localização.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const checkExistingZone = async (lat, lng) => {
    try {
      const zones = await polysApi.entities.Zone.filter({ active: true });
      
      // Check if user's location is inside any zone polygon
      for (const zone of zones) {
        if (zone.polygon_geojson?.coordinates) {
          const polygon = zone.polygon_geojson.coordinates[0];
          if (isPointInPolygon([lng, lat], polygon)) {
            setExistingZone(zone);
            // Convert GeoJSON coordinates to Leaflet format [lat, lng]
            const leafletCoords = polygon.map(coord => [coord[1], coord[0]]);
            setDrawnPoints(leafletCoords);
            setStep('confirm');
            return;
          }
        }
      }
      
      // No zone found, user needs to draw
      setStep('draw');
    } catch (e) {
      setStep('draw');
    }
  };

  // Simple point-in-polygon check
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

  const startDrawing = () => {
    setIsDrawing(true);
    setDrawnPoints([]);
    toast.info('Clique no mapa para desenhar os limites da sua área');
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (drawnPoints.length >= 3) {
      setStep('confirm');
    }
  };

  const clearDrawing = () => {
    setDrawnPoints([]);
    setIsDrawing(false);
    setExistingZone(null);
    setStep('draw');
  };

  const handleSave = async () => {
    if (!userLocation || drawnPoints.length < 3) {
      toast.error('Por favor, desenhe uma área válida no mapa');
      return;
    }

    setSaving(true);
    try {
      // Convert drawn points to GeoJSON format [lng, lat]
      const geoJsonCoords = drawnPoints.map(point => [point[1], point[0]]);
      // Close the polygon
      if (geoJsonCoords.length > 0) {
        geoJsonCoords.push(geoJsonCoords[0]);
      }

      // Create or get zone
      let zoneId = existingZone?.id;
      
      if (!zoneId) {
        // Create a new zone for the user's area
        const newZone = await polysApi.entities.Zone.create({
          name: `Área de ${user.full_name || 'Usuário'}`,
          polygon_geojson: {
            type: 'Polygon',
            coordinates: [geoJsonCoords]
          },
          center_lat: userLocation[0],
          center_lng: userLocation[1],
          active: true
        });
        zoneId = newZone.id;
      }

      // Create residence record
      await polysApi.entities.Residence.create({
        user_id: user.id,
        zone_id: zoneId,
        lat: userLocation[0],
        lng: userLocation[1],
        verified: true
      });

      // Update user with residence info
      await polysApi.auth.updateMe({
        residence_zone_id: zoneId,
        residence_lat: userLocation[0],
        residence_lng: userLocation[1],
        onboarding_completed: true
      });

      toast.success('Localização cadastrada com sucesso!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error('Erro ao salvar localização');
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="w-5 h-5 text-teal-600" />
            Cadastrar Sua Localização
          </DialogTitle>
          <DialogDescription>
            {step === 'location' && 'Obtendo sua localização atual...'}
            {step === 'draw' && 'Desenhe no mapa a área onde você mora (condomínio, bairro ou loteamento)'}
            {step === 'confirm' && 'Confirme sua localização e área de moradia'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Location Error Alert */}
          {locationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro de Localização</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{locationError}</p>
                <Button size="sm" variant="outline" onClick={requestLocation}>
                  <Navigation className="w-4 h-4 mr-2" />
                  Tentar Novamente
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {loadingLocation && !locationError && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-teal-600 mb-4" />
              <p className="text-slate-500">Obtendo sua localização...</p>
              <p className="text-xs text-slate-400 mt-2">Por favor, permita o acesso à localização</p>
            </div>
          )}

          {/* Map */}
          {userLocation && !loadingLocation && (
            <>
              {/* Drawing Instructions */}
              {step === 'draw' && (
                <Alert className="bg-blue-50 border-blue-200">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800">Como delimitar sua área</AlertTitle>
                  <AlertDescription className="text-blue-700">
                    {isDrawing 
                      ? 'Clique nos pontos do mapa para desenhar o perímetro da sua área. Clique em pelo menos 3 pontos para formar uma área.'
                      : 'Clique em "Desenhar Área" e depois clique no mapa para marcar os limites da sua região de moradia.'
                    }
                  </AlertDescription>
                </Alert>
              )}

              {/* Map Container */}
              <div className="h-[400px] rounded-xl overflow-hidden border-2 border-slate-200">
                <MapContainer
                  center={userLocation}
                  zoom={16}
                  className="h-full w-full"
                  style={{ background: '#f1f5f9' }}
                >
                  {/* Padrão: Escuro (mesmo padrão de todos os mapas) */}
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <MapCenterController center={userLocation} zoom={16} />
                  
                  {/* Drawing controller */}
                  <DrawingController 
                    isDrawing={isDrawing}
                    points={drawnPoints}
                    setPoints={setDrawnPoints}
                  />

                  {/* User location marker */}
                  <Marker position={userLocation} icon={userLocationIcon} />

                  {/* Drawn polygon - Navy blue outline, no fill */}
                  {drawnPoints.length >= 3 && (
                    <Polygon
                      positions={drawnPoints}
                      pathOptions={{
                        color: '#1e3a5f', // Navy blue
                        weight: 3,
                        fillOpacity: 0, // No fill
                        dashArray: existingZone ? '' : '5, 10'
                      }}
                    />
                  )}

                  {/* Drawing points markers */}
                  {isDrawing && drawnPoints.map((point, index) => (
                    <Marker
                      key={index}
                      position={point}
                      icon={new L.DivIcon({
                        className: 'drawing-point',
                        html: `<div style="
                          background: #1e3a5f; 
                          width: 12px; 
                          height: 12px; 
                          border-radius: 50%; 
                          border: 2px solid white;
                          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
                        "></div>`,
                        iconSize: [12, 12],
                        iconAnchor: [6, 6],
                      })}
                    />
                  ))}
                </MapContainer>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 justify-between">
                <div className="flex gap-2">
                  {step === 'draw' && !isDrawing && (
                    <Button onClick={startDrawing} variant="outline">
                      <Pencil className="w-4 h-4 mr-2" />
                      Desenhar Área
                    </Button>
                  )}
                  
                  {isDrawing && (
                    <Button 
                      onClick={stopDrawing} 
                      variant="outline"
                      disabled={drawnPoints.length < 3}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Finalizar Desenho ({drawnPoints.length} pontos)
                    </Button>
                  )}

                  {drawnPoints.length > 0 && (
                    <Button onClick={clearDrawing} variant="ghost" className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Limpar
                    </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose}>
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  
                  {step === 'confirm' && (
                    <Button 
                      onClick={handleSave} 
                      className="bg-teal-600 hover:bg-teal-700"
                      disabled={saving || drawnPoints.length < 3}
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Confirmar Localização
                    </Button>
                  )}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-6 text-xs text-slate-500 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow" />
                  <span>Sua localização</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 bg-[#1e3a5f]" />
                  <span>Área delimitada</span>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}