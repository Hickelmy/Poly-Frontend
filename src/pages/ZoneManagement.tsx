import React, { useState, useEffect, useRef, Component, useCallback } from 'react';
import { polysApi } from '@/api/polysClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet marker icons (same as Dashboard)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});
import { 
  Map, Plus, Pencil, Trash2, Check, X, Loader2, Save,
  Users, MoreVertical, AlertCircle
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

// Error Boundary Component para isolar erros do mapa
class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.group('🔴 MAP ERROR BOUNDARY - Erro capturado');
    console.error('Erro:', error);
    console.error('Mensagem do erro:', error?.message);
    console.error('Stack do erro:', error?.stack);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('Error Info completo:', errorInfo);
    console.error('Props do ErrorBoundary:', this.props);
    console.groupEnd();
    
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Versão simplificada para cards (sem botão de retry)
      if (this.props.simple) {
        return (
          <div className="h-full w-full flex items-center justify-center bg-slate-200 dark:bg-slate-700">
            <Map className="w-8 h-8 text-slate-400" />
          </div>
        );
      }

      // Versão completa para o modal
      return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 p-4">
          <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Erro ao carregar o mapa
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-4">
            O mapa não pôde ser carregado. Você ainda pode preencher os outros campos do formulário.
          </p>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              // Força remontagem do componente filho
              if (this.props.onRetry) {
                this.props.onRetry();
              }
            }}
          >
            Tentar novamente
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}


// ============================================
// FUNÇÕES AUXILIARES PARA GEOMETRIA DE POLÍGONOS
// ============================================

// Verifica se um ponto está dentro de um polígono (Ray Casting)
function isPointInPolygon(point, polygon) {
  const [lat, lng] = point;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    
    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

// Verifica se dois segmentos de linha se intersectam
function doSegmentsIntersect(p1, p2, p3, p4) {
  const [x1, y1] = [p1[1], p1[0]];
  const [x2, y2] = [p2[1], p2[0]];
  const [x3, y3] = [p3[1], p3[0]];
  const [x4, y4] = [p4[1], p4[0]];
  
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (Math.abs(denom) < 1e-10) return false; // Linhas paralelas
  
  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
  
  // Os segmentos se intersectam se ua e ub estão entre 0 e 1
  return ua > 0.001 && ua < 0.999 && ub > 0.001 && ub < 0.999;
}

// Encontra o ponto de interseção entre dois segmentos
function getIntersectionPoint(p1, p2, p3, p4) {
  const [x1, y1] = [p1[1], p1[0]];
  const [x2, y2] = [p2[1], p2[0]];
  const [x3, y3] = [p3[1], p3[0]];
  const [x4, y4] = [p4[1], p4[0]];
  
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (Math.abs(denom) < 1e-10) return null;
  
  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  
  const x = x1 + ua * (x2 - x1);
  const y = y1 + ua * (y2 - y1);
  
  return [y, x]; // [lat, lng]
}

// Verifica se dois polígonos têm alguma sobreposição
function doPolygonsOverlap(polygon1, polygon2) {
  // 1. Verifica se algum ponto de polygon1 está dentro de polygon2
  for (const point of polygon1) {
    if (isPointInPolygon(point, polygon2)) {
      return { overlaps: true, type: 'point_inside', point };
    }
  }
  
  // 2. Verifica se algum ponto de polygon2 está dentro de polygon1
  for (const point of polygon2) {
    if (isPointInPolygon(point, polygon1)) {
      return { overlaps: true, type: 'point_inside', point };
    }
  }
  
  // 3. Verifica se alguma aresta se intersecta
  for (let i = 0; i < polygon1.length; i++) {
    const p1 = polygon1[i];
    const p2 = polygon1[(i + 1) % polygon1.length];
    
    for (let j = 0; j < polygon2.length; j++) {
      const p3 = polygon2[j];
      const p4 = polygon2[(j + 1) % polygon2.length];
      
      if (doSegmentsIntersect(p1, p2, p3, p4)) {
        const intersection = getIntersectionPoint(p1, p2, p3, p4);
        return { overlaps: true, type: 'edge_intersection', point: intersection, edge1: [i, (i+1) % polygon1.length], edge2: [j, (j+1) % polygon2.length] };
      }
    }
  }
  
  return { overlaps: false };
}

// Verifica se o novo polígono sobrepõe alguma zona existente
function checkPolygonOverlap(newPolygon, existingZones) {
  if (newPolygon.length < 3) return { valid: true };
  
  for (const zone of existingZones) {
    const result = doPolygonsOverlap(newPolygon, zone.polygon);
    if (result.overlaps) {
      return {
        valid: false,
        zone: zone,
        ...result
      };
    }
  }
  
  return { valid: true };
}

// Encontra o ponto mais próximo na borda do polígono
function findNearestPointOnPolygonEdge(point, polygon) {
  const [lat, lng] = point;
  let nearestPoint = null;
  let minDistance = Infinity;
  
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const [y1, x1] = polygon[i];
    const [y2, x2] = polygon[j];
    
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    
    if (lenSq === 0) continue;
    
    const t = Math.max(0, Math.min(1, ((lng - x1) * dx + (lat - y1) * dy) / lenSq));
    
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;
    
    const distance = Math.sqrt((lat - closestY) ** 2 + (lng - closestX) ** 2);
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestPoint = [closestY, closestX];
    }
  }
  
  // Move o ponto para fora da borda
  if (nearestPoint) {
    const [nearLat, nearLng] = nearestPoint;
    const dirLat = lat - nearLat;
    const dirLng = lng - nearLng;
    const magnitude = Math.sqrt(dirLat ** 2 + dirLng ** 2);
    
    if (magnitude > 0) {
      const offset = 0.0003; // ~33 metros para fora
      nearestPoint = [
        nearLat - (dirLat / magnitude) * offset,
        nearLng - (dirLng / magnitude) * offset
      ];
    }
  }
  
  return nearestPoint;
}

// Ajusta um ponto que causa interseção movendo-o para fora da zona
function adjustPointToAvoidOverlap(pointIndex, drawnPoints, existingZones) {
  const point = drawnPoints[pointIndex];
  
  for (const zone of existingZones) {
    // Se o ponto está dentro da zona, move para fora
    if (isPointInPolygon(point, zone.polygon)) {
      return {
        adjusted: true,
        newPoint: findNearestPointOnPolygonEdge(point, zone.polygon),
        zone: zone
      };
    }
  }
  
  return { adjusted: false };
}

// Encontra pontos de interseção entre um segmento e um polígono
function findEdgeIntersections(p1, p2, polygon) {
  const intersections = [];
  
  for (let j = 0; j < polygon.length; j++) {
    const p3 = polygon[j];
    const p4 = polygon[(j + 1) % polygon.length];
    
    if (doSegmentsIntersect(p1, p2, p3, p4)) {
      const intersection = getIntersectionPoint(p1, p2, p3, p4);
      if (intersection) {
        intersections.push({
          point: intersection,
          edgeIndex: j
        });
      }
    }
  }
  
  return intersections;
}

// Ajusta automaticamente o polígono para contornar zonas existentes
function autoAdjustPolygonToAvoidOverlap(drawnPoints, existingZones) {
  if (drawnPoints.length < 3) return { adjusted: false, points: drawnPoints };
  
  let newPoints = [...drawnPoints];
  let wasAdjusted = false;
  let adjustedZone = null;
  
  for (const zone of existingZones) {
    // 1. Primeiro, ajusta pontos que estão dentro da zona
    for (let i = 0; i < newPoints.length; i++) {
      if (isPointInPolygon(newPoints[i], zone.polygon)) {
        const nearestOnEdge = findNearestPointOnPolygonEdge(newPoints[i], zone.polygon);
        if (nearestOnEdge) {
          newPoints[i] = nearestOnEdge;
          wasAdjusted = true;
          adjustedZone = zone;
        }
      }
    }
    
    // 2. Verifica e ajusta arestas que cruzam a zona
    let hasIntersection = true;
    let iterations = 0;
    const maxIterations = 20; // Evita loop infinito
    
    while (hasIntersection && iterations < maxIterations) {
      hasIntersection = false;
      iterations++;
      
      for (let i = 0; i < newPoints.length; i++) {
        const p1 = newPoints[i];
        const p2 = newPoints[(i + 1) % newPoints.length];
        
        const intersections = findEdgeIntersections(p1, p2, zone.polygon);
        
        if (intersections.length >= 2) {
          // A aresta cruza a zona duas vezes - precisa adicionar pontos de contorno
          hasIntersection = true;
          wasAdjusted = true;
          adjustedZone = zone;
          
          // Ordena interseções pela distância de p1
          intersections.sort((a, b) => {
            const distA = Math.sqrt((a.point[0] - p1[0]) ** 2 + (a.point[1] - p1[1]) ** 2);
            const distB = Math.sqrt((b.point[0] - p1[0]) ** 2 + (b.point[1] - p1[1]) ** 2);
            return distA - distB;
          });
          
          // Encontra os pontos de contorno entre as duas interseções
          const contourPoints = getContourPointsBetween(
            intersections[0].point,
            intersections[1].point,
            intersections[0].edgeIndex,
            intersections[1].edgeIndex,
            zone.polygon
          );
          
          // Move os pontos ligeiramente para fora da borda
          const adjustedContour = contourPoints.map(pt => {
            const zoneCenterLat = zone.polygon.reduce((s, p) => s + p[0], 0) / zone.polygon.length;
            const zoneCenterLng = zone.polygon.reduce((s, p) => s + p[1], 0) / zone.polygon.length;
            
            const dirLat = pt[0] - zoneCenterLat;
            const dirLng = pt[1] - zoneCenterLng;
            const mag = Math.sqrt(dirLat ** 2 + dirLng ** 2);
            
            if (mag > 0) {
              const offset = 0.0002; // ~22 metros
              return [pt[0] + (dirLat / mag) * offset, pt[1] + (dirLng / mag) * offset];
            }
            return pt;
          });
          
          // Insere os pontos de contorno
          const insertIndex = (i + 1) % newPoints.length;
          newPoints = [
            ...newPoints.slice(0, insertIndex),
            ...adjustedContour,
            ...newPoints.slice(insertIndex)
          ];
          
          break; // Recomeça a verificação com os novos pontos
        } else if (intersections.length === 1) {
          // A aresta cruza apenas uma vez - ajusta o ponto mais próximo
          const intersection = intersections[0];
          const distToP1 = Math.sqrt((intersection.point[0] - p1[0]) ** 2 + (intersection.point[1] - p1[1]) ** 2);
          const distToP2 = Math.sqrt((intersection.point[0] - p2[0]) ** 2 + (intersection.point[1] - p2[1]) ** 2);
          
          // Move o ponto que está dentro da zona para fora
          if (isPointInPolygon(p1, zone.polygon)) {
            const nearest = findNearestPointOnPolygonEdge(p1, zone.polygon);
            if (nearest) {
              newPoints[i] = nearest;
              hasIntersection = true;
              wasAdjusted = true;
              adjustedZone = zone;
            }
          } else if (isPointInPolygon(p2, zone.polygon)) {
            const nextIndex = (i + 1) % newPoints.length;
            const nearest = findNearestPointOnPolygonEdge(p2, zone.polygon);
            if (nearest) {
              newPoints[nextIndex] = nearest;
              hasIntersection = true;
              wasAdjusted = true;
              adjustedZone = zone;
            }
          }
        }
      }
    }
  }
  
  return { adjusted: wasAdjusted, points: newPoints, zone: adjustedZone };
}

// Obtém pontos de contorno entre duas interseções seguindo a borda do polígono
function getContourPointsBetween(point1, point2, edgeIndex1, edgeIndex2, polygon) {
  const contour = [];
  
  // Determina a direção (sentido horário ou anti-horário)
  const n = polygon.length;
  
  // Calcula distância em cada direção
  let cwDist = 0;
  let ccwDist = 0;
  
  // Sentido horário (incrementando índice)
  let idx = edgeIndex1;
  while (idx !== edgeIndex2) {
    idx = (idx + 1) % n;
    cwDist++;
  }
  
  // Sentido anti-horário (decrementando índice)
  idx = edgeIndex1;
  while (idx !== edgeIndex2) {
    idx = (idx - 1 + n) % n;
    ccwDist++;
  }
  
  // Escolhe a direção mais curta
  const clockwise = cwDist <= ccwDist;
  
  // Coleta os vértices do contorno
  idx = edgeIndex1;
  const targetIdx = edgeIndex2;
  
  if (clockwise) {
    idx = (idx + 1) % n;
    while (idx !== (targetIdx + 1) % n) {
      contour.push([...polygon[idx]]);
      idx = (idx + 1) % n;
    }
  } else {
    while (idx !== targetIdx) {
      contour.push([...polygon[idx]]);
      idx = (idx - 1 + n) % n;
    }
    contour.push([...polygon[targetIdx]]);
  }
  
  return contour;
}

function getExistingZonesPolygons(zones, editingZoneId) {
  
  const result = zones
    .filter(z => z.id !== editingZoneId && z.polygon_geojson?.coordinates)
    .map(z => ({
      id: z.id,
      name: z.name,
      polygon: z.polygon_geojson.coordinates[0].map(c => [c[1], c[0]])
    }));
    
  return result;
}

function validatePointAgainstZones(point, existingZones) {
  for (const zone of existingZones) {
    if (isPointInPolygon(point, zone.polygon)) {
      return {
        isInside: true,
        zone: zone,
        nearestPoint: findNearestPointOnPolygonEdge(point, zone.polygon)
      };
    }
  }
  return { isInside: false };
}

// Separate component for map inside dialog using Leaflet directly (like Dashboard)
function DialogMap({
  mapCenter,
  isDrawing,
  drawnPoints,
  setDrawnPoints,
  zones,
  editingZone,
  mapReady,
  mapKey,
  hasOverlap = false // Indica se há sobreposição
}: any) {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<any>(null);
  const drawnPolygonRef = useRef<any>(null);
  const zonesLayerRef = useRef<any>(null);
  const existingZonesLayerRef = useRef<any>(null); // Layer separada para zonas existentes
  const markersRef = useRef<any[]>([]); // Array de marcadores dos pontos
  const drawnPointsRef = useRef<any>(drawnPoints); // Ref para acessar valor atual de drawnPoints
  const existingZonesRef = useRef<any[]>([]); // Cache das zonas existentes para validação

  // Atualiza ref quando drawnPoints mudar
  useEffect(() => {
    drawnPointsRef.current = drawnPoints;
  }, [drawnPoints]);

  // Atualiza cache de zonas existentes
  useEffect(() => {
    existingZonesRef.current = getExistingZonesPolygons(zones, editingZone?.id);
  }, [zones, editingZone?.id]);

  // Função para validar e ajustar ponto
  const validateAndAdjustPoint = useCallback((point) => {
    const result = validatePointAgainstZones(point, existingZonesRef.current);
    if (result.isInside) {
      toast.warning(`Ponto movido para fora da área "${result.zone.name}"`);
      return result.nearestPoint || point;
    }
    return point;
  }, []);

  // Inicializa o mapa quando estiver pronto
  useEffect(() => {
    if (!mapReady || !containerRef.current || mapRef.current) return;

    
    try {
      // Usa coordenadas padrão se mapCenter ainda não estiver definido
      const center = mapCenter || [-15.7942, -47.8822]; // Centro do Brasil como fallback
      const map = L.map(containerRef.current).setView(center, mapCenter ? 14 : 4);
      
      // Padrão: Escuro (mesmo padrão de todos os mapas)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      mapRef.current = map;
      existingZonesLayerRef.current = L.layerGroup().addTo(map); // Layer para zonas existentes (abaixo)
      zonesLayerRef.current = L.layerGroup().addTo(map); // Layer para o polígono sendo desenhado (acima)


      // Desenha as zonas existentes imediatamente
      const existingZones = getExistingZonesPolygons(zones, editingZone?.id);
      
      existingZones.forEach(zone => {
        L.polygon(zone.polygon, {
          color: '#ef4444', // Vermelho para indicar área bloqueada
          weight: 2,
          fillColor: '#ef4444',
          fillOpacity: 0.15,
          dashArray: '5, 5'
        }).bindTooltip(`⛔ ${zone.name}`, { permanent: false, direction: 'center' })
          .addTo(existingZonesLayerRef.current);
      });

      // Usa a ref para pegar o valor atual de drawnPoints
      const currentPoints = drawnPointsRef.current;

      // Se houver pontos desenhados, cria o polígono e marcadores imediatamente
      if (currentPoints.length >= 3) {
        // Cria o polígono
        drawnPolygonRef.current = L.polygon(currentPoints, {
          color: '#3b82f6',
          weight: 3,
          fillColor: '#3b82f6',
          fillOpacity: 0.3
        }).addTo(zonesLayerRef.current);

        // Cria os marcadores
        currentPoints.forEach((point, index) => {
          const marker = L.marker([point[0], point[1]], {
            draggable: true,
            icon: L.divIcon({
              className: 'custom-marker',
              html: `<div style="
                width: 16px;
                height: 16px;
                background: #3b82f6;
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                cursor: move;
              "></div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            })
          }).addTo(zonesLayerRef.current);

          marker.on('dragend', (e) => {
            const newLat = e.target.getLatLng().lat;
            const newLng = e.target.getLatLng().lng;
            let finalPoint = [newLat, newLng];
            
            // Valida se o ponto está dentro de uma zona existente
            const validation = validatePointAgainstZones(finalPoint, existingZonesRef.current);
            
            if (validation.isInside) {
              if (validation.nearestPoint) {
                toast.warning(`Ponto movido para fora da área "${validation.zone.name}"`);
                finalPoint = validation.nearestPoint;
                e.target.setLatLng(L.latLng(finalPoint[0], finalPoint[1]));
              } else {
                const current = drawnPointsRef.current;
                toast.error(`Não é possível mover para dentro da área "${validation.zone.name}"`);
                e.target.setLatLng(L.latLng(current[index][0], current[index][1]));
                return;
              }
            }
            
            const current = drawnPointsRef.current;
            const newPoints = [...current];
            newPoints[index] = finalPoint;
            setDrawnPoints(newPoints);
          });

          marker.on('contextmenu', (e) => {
            e.originalEvent.preventDefault();
            const current = drawnPointsRef.current;
            if (current.length > 3) {
              const newPoints = current.filter((_, i) => i !== index);
              setDrawnPoints(newPoints);
            } else {
              toast.error('Uma área precisa ter pelo menos 3 pontos');
            }
          });

          markersRef.current.push(marker);
        });

        // Ajusta o zoom para mostrar toda a área
        setTimeout(() => {
          if (mapRef.current) {
            const bounds = L.latLngBounds(currentPoints);
            mapRef.current.fitBounds(bounds, { padding: [20, 20] });
          }
        }, 100);
      }

      // Invalidar tamanho após um delay
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 300);

      return () => {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
        zonesLayerRef.current = null;
        drawnPolygonRef.current = null;
      };
    } catch (error) {
      console.error('❌ DialogMap: Erro ao inicializar mapa:', error);
      throw error;
    }
    // Não adicionar drawnPoints nas dependências para evitar loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, mapCenter]);

  // NÃO ajustar zoom automaticamente ao adicionar pontos
  // O zoom só deve mudar quando o mapa é inicializado ou quando o usuário interage

  // Atualizar eventos de clique quando isDrawing mudar
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove listeners anteriores
    mapRef.current.off('click');
    
    // Adiciona novo listener se isDrawing for true
      if (isDrawing) {
      mapRef.current.on('click', (e) => {
        // Verifica se o clique foi em um marcador (evita adicionar ponto ao clicar no marcador)
        const clickedMarker = markersRef.current.find(marker => {
          if (!marker) return false;
          const markerLatLng = marker.getLatLng();
          const distance = e.latlng.distanceTo(markerLatLng);
          return distance < 20; // 20 metros de tolerância
        });

        if (!clickedMarker) {
          let clickedPoint = [e.latlng.lat, e.latlng.lng];
          
          // Valida se o ponto está dentro de uma zona existente
          const validation = validatePointAgainstZones(clickedPoint, existingZonesRef.current);
          
          if (validation.isInside && validation.nearestPoint) {
            // Move o ponto automaticamente para a borda da zona
            clickedPoint = validation.nearestPoint;
            toast.info(`Ponto ajustado para a borda de "${validation.zone.name}"`, { duration: 2000 });
          }
          
          // Adiciona o ponto (ajustado ou não)
          setDrawnPoints(prev => [...prev, clickedPoint]);
        }
      });
    }
    
    return () => {
      if (mapRef.current) {
        mapRef.current.off('click');
      }
    };
  }, [isDrawing, setDrawnPoints]);

  // Atualizar polígono desenhado e marcadores
  useEffect(() => {
    if (!mapReady || !mapRef.current || !zonesLayerRef.current) {
      return;
    }


    // Remove marcadores anteriores
    markersRef.current.forEach(marker => {
      if (marker && zonesLayerRef.current) {
        zonesLayerRef.current.removeLayer(marker);
      }
    });
    markersRef.current = [];

    // Remove polígono anterior
    if (drawnPolygonRef.current) {
      zonesLayerRef.current.removeLayer(drawnPolygonRef.current);
      drawnPolygonRef.current = null;
    }

    // Adiciona novo polígono se tiver 3+ pontos
    if (drawnPoints.length >= 3) {
      // Cor vermelha se há sobreposição, azul se não
      const polygonColor = hasOverlap ? '#ef4444' : '#3b82f6';
      drawnPolygonRef.current = L.polygon(drawnPoints, {
        color: polygonColor,
        weight: 3,
        fillColor: polygonColor,
        fillOpacity: hasOverlap ? 0.4 : 0.3
      }).addTo(zonesLayerRef.current);
    }

    // Adiciona marcadores arrastáveis para cada ponto
    drawnPoints.forEach((point, index) => {
      const marker = L.marker([point[0], point[1]], {
        draggable: true,
        icon: L.divIcon({
          className: 'custom-marker',
          html: `<div style="
            width: 16px;
            height: 16px;
            background: #3b82f6;
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            cursor: move;
          "></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        })
      }).addTo(zonesLayerRef.current);

      // Evento de arrastar - atualiza a posição do ponto com validação
      marker.on('dragend', (e) => {
        const newLat = e.target.getLatLng().lat;
        const newLng = e.target.getLatLng().lng;
        let finalPoint = [newLat, newLng];
        
        // Valida se o ponto está dentro de uma zona existente
        const validation = validatePointAgainstZones(finalPoint, existingZonesRef.current);
        
        if (validation.isInside) {
          if (validation.nearestPoint) {
            toast.warning(`Ponto movido para fora da área "${validation.zone.name}"`);
            finalPoint = validation.nearestPoint;
            // Atualiza a posição visual do marcador
            e.target.setLatLng(L.latLng(finalPoint[0], finalPoint[1]));
          } else {
            // Se não conseguir encontrar ponto fora, reverte para posição original
            toast.error(`Não é possível mover para dentro da área "${validation.zone.name}"`);
            e.target.setLatLng(L.latLng(drawnPoints[index][0], drawnPoints[index][1]));
            return;
          }
        }
        
        const newPoints = [...drawnPoints];
        newPoints[index] = finalPoint;
        setDrawnPoints(newPoints);
      });

      // Evento de clique direito - remove o ponto
      marker.on('contextmenu', (e) => {
        e.originalEvent.preventDefault();
        if (drawnPoints.length > 3) { // Mantém mínimo de 3 pontos
          const newPoints = drawnPoints.filter((_, i) => i !== index);
          setDrawnPoints(newPoints);
        } else {
          toast.error('Uma área precisa ter pelo menos 3 pontos');
        }
      });

      markersRef.current.push(marker);
    });

    return () => {
      // Cleanup dos marcadores
      markersRef.current.forEach(marker => {
        if (marker && zonesLayerRef.current) {
          zonesLayerRef.current.removeLayer(marker);
        }
      });
      markersRef.current = [];
    };
  }, [drawnPoints, setDrawnPoints, mapReady, hasOverlap]);

  // Mostrar outras zonas existentes (áreas bloqueadas)
  useEffect(() => {
    
    if (!existingZonesLayerRef.current) {
      return;
    }

    // Limpa layer de zonas existentes
    existingZonesLayerRef.current.clearLayers();

    // Atualiza cache de zonas existentes
    const existingZones = getExistingZonesPolygons(zones, editingZone?.id);
    existingZonesRef.current = existingZones;
    

    // Adiciona outras zonas com estilo de "área bloqueada"
    existingZones.forEach(zone => {
      L.polygon(zone.polygon, {
        color: '#ef4444', // Vermelho para indicar área bloqueada
        weight: 2,
        fillColor: '#ef4444',
        fillOpacity: 0.15,
        dashArray: '5, 5',
        interactive: true
      }).bindTooltip(`⛔ ${zone.name} (área já cadastrada)`, { 
        permanent: false, 
        direction: 'center',
        className: 'zone-blocked-tooltip'
      }).addTo(existingZonesLayerRef.current);
    });
  }, [zones, editingZone?.id]);

  // Invalidar tamanho quando o container mudar de tamanho
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [mapReady, mapKey]);

  if (!mapReady) {
    return (
      <div ref={containerRef} className="h-full w-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="h-full w-full" 
      key={`map-container-${mapKey}`}
      style={{ background: '#f1f5f9' }}
    />
  );
}

// Componente para exibir mapa nos cards das zonas (usando Leaflet direto)
function ZoneCardMap({ zone, getZonePolygon }: any) {
  const containerRef = useRef<any>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    // Se não há container ou dados de polígono, não faz nada
    if (!containerRef.current || !zone?.polygon_geojson?.coordinates) {
      return;
    }
    
    // Se já existe um mapa, limpa primeiro
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const center = [zone.center_lat || -23.55, zone.center_lng || -46.63];
    
    try {
      
      const map = L.map(containerRef.current, {
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        touchZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        attributionControl: false
      }).setView(center, 14);

      // Padrão: Escuro (mesmo padrão de todos os mapas)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '',
      }).addTo(map);

      mapRef.current = map;

      // Adiciona polígono
      const poly = getZonePolygon(zone);
      
      if (poly && poly.length > 0) {
        const polygon = L.polygon(poly, {
          color: zone.color || '#14b8a6',
          weight: 2,
          fillColor: zone.color || '#14b8a6',
          fillOpacity: 0.2
        }).addTo(map);
        
        // Ajusta o zoom para mostrar todo o polígono
        map.fitBounds(polygon.getBounds(), { padding: [10, 10] });
      }

      // Invalidar tamanho após um delay
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 200);

    } catch (error) {
      console.error('❌ ZoneCardMap: Erro ao criar mapa:', error);
    }

    // Cleanup quando o componente desmontar
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [zone?.id, zone?.polygon_geojson, getZonePolygon]); // Depende do id e polygon

  if (!zone?.polygon_geojson?.coordinates) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-200 dark:bg-slate-700">
        <Map className="w-8 h-8 text-slate-400" />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="h-full w-full" 
      style={{ minHeight: '128px', background: '#e2e8f0' }}
    />
  );
}

export default function ZoneManagement() {
  const [user, setUser] = useState<any>(null);
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [mapReady, setMapReady] = useState<boolean>(false);
  const [mapKey, setMapKey] = useState<number>(Date.now());
  const [editingZone, setEditingZone] = useState<any>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawnPoints, setDrawnPoints] = useState<any[]>([]);
  const [mapCenter, setMapCenter] = useState<any>(null); // Inicia como null até obter localização
  const [locationLoading, setLocationLoading] = useState<boolean>(true);
  const [overlapWarning, setOverlapWarning] = useState<any>(null); // Aviso de sobreposição
  
  const [formData, setFormData] = useState<{ name: string; description: string; admin_email: string }>({
    name: '',
    description: '',
    admin_email: ''
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await polysApi.auth.me();
        const canAccess = userData.user_role === 'gestor' || userData.user_role === 'administrador'
          || userData.account_type === 'ZONE_ADMIN';
        if (!canAccess) {
          toast.error('Acesso negado');
          window.history.back();
          return;
        }
        setUser(userData);
        
        // Se o usuário tem residência cadastrada, usa como centro inicial
        if (userData.residence_lat && userData.residence_lng) {
          setMapCenter([userData.residence_lat, userData.residence_lng]);
          setLocationLoading(false);
        }
      } catch (e) {
        window.location.href = '/';
      }
    };
    loadUser();
  }, []);

  // Get user location for map center - múltiplas estratégias
  useEffect(() => {
    const detectLocation = async () => {
      // 1. Tenta geolocalização do navegador (mais preciso)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
          (pos) => {
            setMapCenter([pos.coords.latitude, pos.coords.longitude]);
            setLocationLoading(false);
          },
          async () => {
            const loc = await import('@/utils/geolocation').then((m) => m.getLocationByIP());
            if (loc?.latitude != null && loc?.longitude != null) {
              setMapCenter([loc.latitude, loc.longitude]);
            }
            setLocationLoading(false);
          },
          { timeout: 5000, enableHighAccuracy: false }
        );
      } else {
        const loc = await import('@/utils/geolocation').then((m) => m.getLocationByIP());
        if (loc?.latitude != null && loc?.longitude != null) {
          setMapCenter([loc.latitude, loc.longitude]);
        }
        setLocationLoading(false);
      }
    };

    // Só detecta se ainda não tem localização
    if (!mapCenter) {
      detectLocation();
    }
  }, [mapCenter]);

  // Fetch zones
  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['zones'],
    queryFn: async () => {
      const result = await polysApi.entities.Zone.list('-created_date');
      return result;
    },
  });

  // Verificar e ajustar automaticamente sobreposição quando os pontos mudam
  const isAdjustingRef = useRef<boolean>(false);
  
  useEffect(() => {
    // Evita loop infinito durante o ajuste
    if (isAdjustingRef.current) return;
    
    if (drawnPoints.length >= 3) {
      const existingZones = getExistingZonesPolygons(zones, editingZone?.id);
      const overlapCheck = checkPolygonOverlap(drawnPoints, existingZones);
      
      if (!overlapCheck.valid) {
        // Tenta ajustar automaticamente
        isAdjustingRef.current = true;
        const adjustment = autoAdjustPolygonToAvoidOverlap(drawnPoints, existingZones);
        
        if (adjustment.adjusted) {
          // Aplica o ajuste
          setDrawnPoints(adjustment.points);
          toast.info(`Pontos ajustados automaticamente para contornar "${adjustment.zone.name}"`);
          setOverlapWarning(null);
        } else {
          // Se não conseguiu ajustar automaticamente, mostra aviso
          setOverlapWarning({
            zone: overlapCheck.zone,
            type: overlapCheck.type,
            message: `⚠️ A área sobrepõe "${overlapCheck.zone.name}". Remova pontos conflitantes.`
          });
        }
        
        // Libera o flag após um pequeno delay
        setTimeout(() => {
          isAdjustingRef.current = false;
        }, 100);
      } else {
        setOverlapWarning(null);
      }
    } else {
      setOverlapWarning(null);
    }
  }, [drawnPoints, zones, editingZone?.id, setDrawnPoints]);

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

      // Verificar sobreposição com zonas existentes ANTES de salvar
      const existingZones = getExistingZonesPolygons(zones, editingZone?.id);
      const overlapCheck = checkPolygonOverlap(drawnPoints, existingZones);
      
      if (!overlapCheck.valid) {
        throw new Error(`A área desenhada sobrepõe a zona "${overlapCheck.zone.name}". Ajuste os pontos para não invadir áreas existentes.`);
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

  // Controla quando o mapa deve ser renderizado (após o modal estar aberto)
  useEffect(() => {
    console.group('🔄 ZoneManagement: useEffect [createModalOpen]');
    
    if (createModalOpen) {
      // Reset primeiro
      setMapReady(false);
      // Gera uma nova key para forçar remontagem do mapa
      const newKey = Date.now();
      setMapKey(newKey);
      
      // Delay maior para garantir que o modal está totalmente renderizado no DOM
      const timer = setTimeout(() => {
        setMapReady(true);
      }, 400);
      
      return () => {
        clearTimeout(timer);
        setMapReady(false);
      };
    } else {
      // Reset quando o modal fecha
      setMapReady(false);
    }
    console.groupEnd();
  }, [createModalOpen, editingZone]);

  const resetForm = () => {
    setFormData({ name: '', description: '', admin_email: '' });
    setDrawnPoints([]);
    setIsDrawing(false);
    setEditingZone(null);
    setCreateModalOpen(false);
    setMapReady(false);
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
      const points = coords.map(c => [c[1], c[0]]);
      setDrawnPoints(points);
      
      // Ajusta o centro do mapa para mostrar a área
      if (points.length > 0) {
        const centerLat = points.reduce((sum, p) => sum + p[0], 0) / points.length;
        const centerLng = points.reduce((sum, p) => sum + p[1], 0) / points.length;
        setMapCenter([centerLat, centerLng]);
      } else if (zone.center_lat && zone.center_lng) {
        setMapCenter([zone.center_lat, zone.center_lng]);
      }
    } else if (zone.center_lat && zone.center_lng) {
      setMapCenter([zone.center_lat, zone.center_lng]);
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
                  <MapErrorBoundary simple>
                    <ZoneCardMap zone={zone} getZonePolygon={getZonePolygon} />
                  </MapErrorBoundary>
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
                    <MapErrorBoundary
                      onRetry={() => {
                        // Força remontagem do mapa
                        setMapReady(false);
                        setMapKey(Date.now());
                        setTimeout(() => {
                          setMapReady(true);
                        }, 100);
                      }}
                    >
                      <DialogMap
                        mapCenter={mapCenter}
                    isDrawing={isDrawing}
                        drawnPoints={drawnPoints}
                        setDrawnPoints={setDrawnPoints}
                        zones={zones}
                        editingZone={editingZone}
                        mapReady={mapReady}
                        mapKey={mapKey}
                        hasOverlap={!!overlapWarning}
                    />
                    </MapErrorBoundary>
                  </div>
                  {overlapWarning && (
                    <div className="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{overlapWarning.message}</p>
                        <p className="text-xs opacity-80">Mova ou remova pontos para eliminar a sobreposição</p>
              </div>
                    </div>
                  )}
                  
              <p className="text-xs text-slate-500">
                {isDrawing 
                      ? 'Clique no mapa para adicionar pontos • Clique direito no ponto para remover • Arraste pontos para ajustar'
                  : 'Clique em "Desenhar" e depois nos pontos do mapa para definir a área'
                }
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button 
                    className={overlapWarning ? "bg-slate-400 cursor-not-allowed" : "bg-teal-600 hover:bg-teal-700"}
                onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending || !!overlapWarning}
                    title={overlapWarning ? "Resolva a sobreposição antes de salvar" : ""}
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