import React, { useState, useEffect, useRef } from 'react';
import { polysApi } from '@/api/polysClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Polygon, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  Map, Plus, Pencil, Trash2, Check, X, Loader2, Save,
  Users, MoreVertical
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

// Drawing controller
function DrawingController({ isDrawing, points, setPoints }) {
  useMapEvents({
    click(e) {
      if (isDrawing) {
        setPoints([...points, [e.latlng.lat, e.latlng.lng]]);
      }
    }
  });
  return null;
}

function MapCenterController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 14);
    }
  }, [center, map]);
  return null;
}

// Separate component for map inside dialog to avoid context issues
function DialogMap({ 
  mapCenter, 
  isDrawing, 
  drawnPoints, 
  setDrawnPoints, 
  zones, 
  editingZone 
}) {
  const mapRef = useRef(null);

  const getZonePolygon = (zone) => {
    if (!zone?.polygon_geojson?.coordinates) return null;
    return zone.polygon_geojson.coordinates[0].map(c => [c[1], c[0]]);
  };

  useEffect(() => {
    if (mapRef.current) {
      // Invalidate size after a short delay to ensure Dialog is fully rendered
      const timer = setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <MapContainer
      key={`dialog-map-${editingZone?.id || 'new'}`}
      center={mapCenter}
      zoom={14}
      className="h-full w-full"
      style={{ height: '100%', width: '100%' }}
      whenCreated={(mapInstance) => {
        mapRef.current = mapInstance;
        // Force map to invalidate size after dialog opens
        setTimeout(() => {
          mapInstance.invalidateSize();
        }, 150);
      }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap'
      />
      <MapCenterController center={mapCenter} />
      <DrawingController
        isDrawing={isDrawing}
        points={drawnPoints}
        setPoints={setDrawnPoints}
      />

      {drawnPoints.length >= 3 && (
        <Polygon
          positions={drawnPoints}
          pathOptions={{
            color: '#1e3a5f',
            weight: 3,
            fillOpacity: 0
          }}
        />
      )}

      {/* Show other zones */}
      {zones.filter(z => z.id !== editingZone?.id).map(zone => {
        const poly = getZonePolygon(zone);
        if (!poly) return null;
        return (
          <Polygon
            key={zone.id}
            positions={poly}
            pathOptions={{
              color: '#94a3b8',
              weight: 1,
              fillOpacity: 0.05,
              dashArray: '4, 4'
            }}
          />
        );
      })}
    </MapContainer>
  );
}

export default function ZoneManagement() {
  const [user, setUser] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnPoints, setDrawnPoints] = useState([]);
  const [mapCenter, setMapCenter] = useState([-23.5505, -46.6333]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    admin_email: ''
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await polysApi.auth.me();
        if (userData.user_role !== 'gestor') {
          toast.error('Acesso negado');
          window.history.back();
          return;
        }
        setUser(userData);
      } catch (e) {
        window.location.href = '/';
      }
    };
    loadUser();
  }, []);

  // Get user location for map center
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMapCenter([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      );
    }
  }, []);

  // Fetch zones
  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['zones'],
    queryFn: () => polysApi.entities.Zone.list('-created_date'),
  });

  // Fetch admins for assignment
  const { data: admins = [] } = useQuery({
    queryKey: ['admins'],
    queryFn: async () => {
      const users = await polysApi.entities.User.filter({ user_role: 'administrador' });
      return users;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formData.name || drawnPoints.length < 3) {
        throw new Error('Preencha o nome e desenhe a área');
      }

      // Convert to GeoJSON
      const geoJsonCoords = drawnPoints.map(p => [p[1], p[0]]);
      geoJsonCoords.push(geoJsonCoords[0]); // Close polygon

      // Calculate center
      const centerLat = drawnPoints.reduce((s, p) => s + p[0], 0) / drawnPoints.length;
      const centerLng = drawnPoints.reduce((s, p) => s + p[1], 0) / drawnPoints.length;

      const zoneData = {
        name: formData.name,
        description: formData.description,
        polygon_geojson: { type: 'Polygon', coordinates: [geoJsonCoords] },
        center_lat: centerLat,
        center_lng: centerLng,
        admin_email: formData.admin_email || null,
        active: true
      };

      if (editingZone) {
        await polysApi.entities.Zone.update(editingZone.id, zoneData);
      } else {
        await polysApi.entities.Zone.create(zoneData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['zones']);
      toast.success(editingZone ? 'Área atualizada!' : 'Área criada!');
      resetForm();
    },
    onError: (e) => {
      toast.error(e.message || 'Erro ao salvar');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => polysApi.entities.Zone.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['zones']);
      toast.success('Área excluída');
    }
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', admin_email: '' });
    setDrawnPoints([]);
    setIsDrawing(false);
    setEditingZone(null);
    setCreateModalOpen(false);
  };

  const openEdit = (zone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name || '',
      description: zone.description || '',
      admin_email: zone.admin_email || ''
    });
    if (zone.polygon_geojson?.coordinates?.[0]) {
      const coords = zone.polygon_geojson.coordinates[0].slice(0, -1);
      setDrawnPoints(coords.map(c => [c[1], c[0]]));
    }
    setCreateModalOpen(true);
  };

  const getZonePolygon = (zone) => {
    if (!zone?.polygon_geojson?.coordinates) return null;
    return zone.polygon_geojson.coordinates[0].map(c => [c[1], c[0]]);
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Gestão de Áreas
          </h1>
          <p className="text-slate-500">Cadastre e gerencie as áreas da plataforma</p>
        </div>
        <Button 
          className="bg-teal-600 hover:bg-teal-700"
          onClick={() => {
            resetForm();
            setCreateModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Área
        </Button>
      </div>

      {/* Zones List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <Card key={i} className="h-48 animate-pulse bg-slate-100" />
          ))
        ) : zones.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <Map className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nenhuma área cadastrada</p>
            </CardContent>
          </Card>
        ) : (
          zones.map(zone => (
            <Card key={zone.id} className="overflow-hidden">
              <div className="h-32 bg-slate-100 relative">
                {zone.polygon_geojson && !createModalOpen && (
                  <MapContainer
                    key={`zone-card-${zone.id}`}
                    center={[zone.center_lat || -23.55, zone.center_lng || -46.63]}
                    zoom={14}
                    className="h-full w-full"
                    zoomControl={false}
                    dragging={false}
                    scrollWheelZoom={false}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Polygon
                      positions={getZonePolygon(zone)}
                      pathOptions={{ color: '#1e3a5f', weight: 2, fillOpacity: 0.1 }}
                    />
                  </MapContainer>
                )}
                {createModalOpen && (
                  <div className="h-full w-full flex items-center justify-center bg-slate-200">
                    <Map className="w-8 h-8 text-slate-400" />
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{zone.name}</h3>
                    <p className="text-sm text-slate-500 truncate">{zone.description}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(zone)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => deleteMutation.mutate(zone.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant={zone.active ? 'default' : 'secondary'}>
                    {zone.active ? 'Ativa' : 'Inativa'}
                  </Badge>
                  {zone.admin_email && (
                    <Badge variant="outline" className="text-xs">
                      <Users className="w-3 h-3 mr-1" />
                      {zone.admin_email}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Modal - Custom without Portal to avoid react-leaflet issues */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/80 animate-in fade-in-0"
            onClick={resetForm}
          />
          {/* Content */}
          <div className="relative z-50 w-full max-w-3xl max-h-[90vh] mx-4 bg-background rounded-lg border shadow-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">
                {editingZone ? 'Editar Área' : 'Nova Área'}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={resetForm}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="overflow-y-auto p-6">
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome da Área *</Label>
                    <Input
                      placeholder="Ex: Jardim das Flores"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Administrador Responsável</Label>
                    <Select 
                      value={formData.admin_email} 
                      onValueChange={(v) => setFormData({ ...formData, admin_email: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Nenhum</SelectItem>
                        {admins.map(admin => (
                          <SelectItem key={admin.id} value={admin.email}>
                            {admin.full_name || admin.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    placeholder="Descrição da área..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Desenhar Área no Mapa *</Label>
                    <div className="flex gap-2">
                      {!isDrawing ? (
                        <Button size="sm" variant="outline" onClick={() => setIsDrawing(true)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Desenhar
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setIsDrawing(false)}>
                          <Check className="w-4 h-4 mr-2" />
                          Finalizar ({drawnPoints.length} pontos)
                        </Button>
                      )}
                      {drawnPoints.length > 0 && (
                        <Button size="sm" variant="ghost" onClick={() => setDrawnPoints([])}>
                          <X className="w-4 h-4 mr-2" />
                          Limpar
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="h-[350px] rounded-xl overflow-hidden border">
                    <DialogMap
                      mapCenter={mapCenter}
                      isDrawing={isDrawing}
                      drawnPoints={drawnPoints}
                      setDrawnPoints={setDrawnPoints}
                      zones={zones}
                      editingZone={editingZone}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    {isDrawing 
                      ? 'Clique no mapa para adicionar pontos ao polígono'
                      : 'Clique em "Desenhar" e depois nos pontos do mapa para definir a área'
                    }
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button 
                    className="bg-teal-600 hover:bg-teal-700"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {editingZone ? 'Salvar' : 'Criar Área'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}