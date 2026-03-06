import { useState, useEffect, useCallback, createContext, useContext } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const FeatureFlagsContext = createContext({
  flags: {},
  isLoading: true,
  isEnabled: () => true,
  refresh: () => {},
});

export function FeatureFlagsProvider({ children, context = {} }) {
  const [flags, setFlags] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchFlags = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (context.zoneId) params.set('zoneId', context.zoneId);
      if (context.city) params.set('city', context.city);
      if (context.state) params.set('state', context.state);
      if (context.userId) params.set('userId', context.userId);
      if (context.userRole) params.set('userRole', context.userRole);

      const res = await fetch(
        `${API_BASE_URL}/feature-flags/evaluate?${params.toString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setFlags(data);
      }
    } catch {
      // fail-open: all features enabled
    } finally {
      setIsLoading(false);
    }
  }, [context.zoneId, context.city, context.state, context.userId, context.userRole]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const isEnabled = useCallback(
    (key) => {
      if (isLoading) return true; // fail-open during loading
      return flags[key] !== false;
    },
    [flags, isLoading]
  );

  return (
    <FeatureFlagsContext.Provider value={{ flags, isLoading, isEnabled, refresh: fetchFlags }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext);
}

export function useFeatureFlag(key) {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(key);
}
