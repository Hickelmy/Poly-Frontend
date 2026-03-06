import { useMemo } from 'react';
import { useSelectedZone } from '@/contexts/SelectedZoneContext';

/**
 * Calcula a distância entre dois pontos usando a fórmula de Haversine
 * @param {number} lat1 - Latitude do primeiro ponto
 * @param {number} lng1 - Longitude do primeiro ponto
 * @param {number} lat2 - Latitude do segundo ponto
 * @param {number} lng2 - Longitude do segundo ponto
 * @returns {number} Distância em quilômetros
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return Infinity;
  
  const R = 6371; // Raio da Terra em quilômetros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Hook para filtrar itens por proximidade geográfica
 * Se um item tiver zone_id, assume-se que é de condomínio privado e usa filtro de zona
 * Caso contrário, filtra por proximidade usando lat/lng
 * 
 * @param {Array} items - Array de itens para filtrar
 * @param {Object} userLocation - Objeto com {lat, lng} da localização do usuário
 * @param {number} maxDistanceKm - Distância máxima em quilômetros (padrão: 5km)
 * @param {string} zoneField - Nome do campo que contém zone_id (padrão: 'zone_id')
 * @param {string} latField - Nome do campo que contém latitude (padrão: 'lat')
 * @param {string} lngField - Nome do campo que contém longitude (padrão: 'lng')
 * @returns {Array} Array filtrado de itens
 */
export function useProximityFilter(
  items = [],
  userLocation = null,
  maxDistanceKm = 5,
  zoneField = 'zone_id',
  latField = 'lat',
  lngField = 'lng'
) {
  const { selectedZone } = useSelectedZone();

  return useMemo(() => {
    if (!items || items.length === 0) return [];

    // Se não há localização do usuário, retorna todos os itens
    if (!userLocation || (!userLocation.lat && !userLocation.lng)) {
      return items;
    }

    return items.filter(item => {
      // Se o item tem zone_id/zoneId, é condomínio privado - usa filtro de zona
      const zoneId = item[zoneField] || item.zoneId || item.zone_id;
      if (zoneId) {
        // Se há uma zona selecionada, filtra por ela
        if (selectedZone) {
          return zoneId === selectedZone.id;
        }
        // Se não há zona selecionada, não mostra itens de condomínios privados
        return false;
      }

      // Se não tem zone_id, filtra por proximidade
      const itemLat = item[latField] || item.lat;
      const itemLng = item[lngField] || item.lng;
      
      // Se o item não tem coordenadas, mostra mesmo assim (produto geral sem localização)
      // Apenas filtra por proximidade se tiver coordenadas
      if (!itemLat || !itemLng) {
        return true; // Mostra produtos sem localização
      }

      // Calcula distância
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        itemLat,
        itemLng
      );

      return distance <= maxDistanceKm;
    });
  }, [items, userLocation, maxDistanceKm, zoneField, latField, lngField, selectedZone]);
}

/**
 * Função standalone para filtrar por proximidade (sem hook)
 */
export function filterByProximity(
  items = [],
  userLocation = null,
  maxDistanceKm = 5,
  zoneField = 'zone_id',
  latField = 'lat',
  lngField = 'lng',
  selectedZone = null
) {
  if (!items || items.length === 0) return [];
  if (!userLocation || (!userLocation.lat && !userLocation.lng)) return items;

  return items.filter(item => {
    // Se o item tem zone_id/zoneId, é condomínio privado - usa filtro de zona
    const zoneId = item[zoneField] || item.zoneId || item.zone_id;
    if (zoneId) {
      if (selectedZone) {
        return zoneId === selectedZone.id;
      }
      return false;
    }

    // Filtra por proximidade
    const itemLat = item[latField] || item.lat;
    const itemLng = item[lngField] || item.lng;
    
    // Se o item não tem coordenadas, mostra mesmo assim (produto geral sem localização)
    if (!itemLat || !itemLng) {
      return true; // Mostra produtos sem localização
    }

    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      itemLat,
      itemLng
    );

    return distance <= maxDistanceKm;
  });
}

