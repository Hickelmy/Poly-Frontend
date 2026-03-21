import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { polysApi } from '@/api/polysClient';

interface Zone {
  id: string;
  name: string;
  [key: string]: any;
}

interface SelectedZoneContextType {
  selectedZone: Zone | null;
  setSelectedZone: (zone: Zone | null) => void;
  selectZoneById: (zoneId: string | null) => void;
  clearSelectedZone: () => void;
  zones: Zone[];
  loading: boolean;
  refreshZones: () => Promise<void>;
}

const SelectedZoneContext = createContext<SelectedZoneContextType | null>(null);

const STORAGE_KEY = 'polys-selected-zone';

export function SelectedZoneProvider({ children }: { children: React.ReactNode }) {
  const [selectedZone, setSelectedZoneState] = useState<Zone | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadZones = useCallback(async (): Promise<Zone[]> => {
    try {
      // Only load zones the user is a member of (not all zones)
      const zonesData = await polysApi.myZones.list();
      setZones(zonesData);
      return zonesData;
    } catch (error) {
      // If not logged in or endpoint fails, return empty
      setZones([]);
      return [];
    }
  }, []);

  useEffect(() => {
    const initializeZone = async (): Promise<void> => {
      setLoading(true);
      const zonesData = await loadZones();

      const savedZoneId = localStorage.getItem(STORAGE_KEY);
      if (savedZoneId && zonesData.length > 0) {
        const savedZone = zonesData.find((z: Zone) => z.id === savedZoneId);
        if (savedZone) {
          setSelectedZoneState(savedZone);
        }
      }
      setLoading(false);
    };

    initializeZone();
  }, [loadZones]);

  const setSelectedZone = useCallback((zone: Zone | null): void => {
    if (zone) {
      localStorage.setItem(STORAGE_KEY, zone.id);
      setSelectedZoneState(zone);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setSelectedZoneState(null);
    }
  }, []);

  const selectZoneById = useCallback((zoneId: string | null): void => {
    if (!zoneId) {
      setSelectedZone(null);
      return;
    }
    const zone = zones.find((z: Zone) => z.id === zoneId);
    if (zone) {
      setSelectedZone(zone);
    }
  }, [zones, setSelectedZone]);

  const clearSelectedZone = useCallback((): void => {
    setSelectedZone(null);
  }, [setSelectedZone]);

  const refreshZones = useCallback(async (): Promise<void> => {
    const zonesData = await loadZones();
    if (selectedZone) {
      const stillExists = zonesData.find((z: Zone) => z.id === selectedZone.id);
      if (!stillExists) {
        setSelectedZone(null);
      }
    }
  }, [loadZones, selectedZone, setSelectedZone]);

  const value: SelectedZoneContextType = {
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

export function useSelectedZone(): SelectedZoneContextType {
  const context = useContext(SelectedZoneContext);
  if (!context) {
    throw new Error('useSelectedZone must be used within a SelectedZoneProvider');
  }
  return context;
}

export function useZoneFilter() {
  const { selectedZone } = useSelectedZone();

  const filterByZone = useCallback(<T extends Record<string, any>>(items: T[], zoneField: string = 'zone_id'): T[] => {
    if (!selectedZone) return items;
    return items.filter(item => item[zoneField] === selectedZone.id);
  }, [selectedZone]);

  const getZoneFilterParam = useCallback((zoneField: string = 'zone_id'): Record<string, string> => {
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
