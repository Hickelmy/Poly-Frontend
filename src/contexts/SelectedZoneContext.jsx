import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { polysApi } from '@/api/polysClient';

const SelectedZoneContext = createContext(null);

const STORAGE_KEY = 'polys-selected-zone';

export function SelectedZoneProvider({ children }) {
  const [selectedZone, setSelectedZoneState] = useState(null);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carrega zonas disponíveis
  const loadZones = useCallback(async () => {
    try {
      const zonesData = await polysApi.entities.Zone.list('name');
      setZones(zonesData);
      return zonesData;
    } catch (error) {
      console.error('Erro ao carregar zonas:', error);
      return [];
    }
  }, []);

  // Carrega zona salva do localStorage
  useEffect(() => {
    const initializeZone = async () => {
      setLoading(true);
      const zonesData = await loadZones();
      
      const savedZoneId = localStorage.getItem(STORAGE_KEY);
      if (savedZoneId && zonesData.length > 0) {
        const savedZone = zonesData.find(z => z.id === savedZoneId);
        if (savedZone) {
          setSelectedZoneState(savedZone);
        }
      }
      setLoading(false);
    };

    initializeZone();
  }, [loadZones]);

  // Função para selecionar zona (salva no localStorage)
  const setSelectedZone = useCallback((zone) => {
    if (zone) {
      localStorage.setItem(STORAGE_KEY, zone.id);
      setSelectedZoneState(zone);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setSelectedZoneState(null);
    }
  }, []);

  // Função para selecionar zona por ID
  const selectZoneById = useCallback((zoneId) => {
    if (!zoneId) {
      setSelectedZone(null);
      return;
    }
    const zone = zones.find(z => z.id === zoneId);
    if (zone) {
      setSelectedZone(zone);
    }
  }, [zones, setSelectedZone]);

  // Função para limpar seleção
  const clearSelectedZone = useCallback(() => {
    setSelectedZone(null);
  }, [setSelectedZone]);

  // Recarregar zonas (útil após criar/editar zonas)
  const refreshZones = useCallback(async () => {
    const zonesData = await loadZones();
    // Verifica se a zona selecionada ainda existe
    if (selectedZone) {
      const stillExists = zonesData.find(z => z.id === selectedZone.id);
      if (!stillExists) {
        setSelectedZone(null);
      }
    }
  }, [loadZones, selectedZone, setSelectedZone]);

  const value = {
    selectedZone,
    setSelectedZone,
    selectZoneById,
    clearSelectedZone,
    zones,
    loading,
    refreshZones,
  };

  return (
    <SelectedZoneContext.Provider value={value}>
      {children}
    </SelectedZoneContext.Provider>
  );
}

export function useSelectedZone() {
  const context = useContext(SelectedZoneContext);
  if (!context) {
    throw new Error('useSelectedZone must be used within a SelectedZoneProvider');
  }
  return context;
}

// Hook para filtrar dados por zona selecionada
export function useZoneFilter() {
  const { selectedZone } = useSelectedZone();

  const filterByZone = useCallback((items, zoneField = 'zone_id') => {
    if (!selectedZone) return items;
    return items.filter(item => item[zoneField] === selectedZone.id);
  }, [selectedZone]);

  const getZoneFilterParam = useCallback((zoneField = 'zone_id') => {
    if (!selectedZone) return {};
    return { [zoneField]: selectedZone.id };
  }, [selectedZone]);

  return {
    selectedZone,
    filterByZone,
    getZoneFilterParam,
    hasZoneFilter: !!selectedZone,
  };
}

