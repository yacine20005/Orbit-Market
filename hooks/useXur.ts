import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useIsFocused } from 'expo-router';
import {
  apiService,
  XurData,
  DestinyVendorId,
  DESTINY_VENDORS,
  VendorMeta,
  isXurActiveUtc,
  formatXurCountdownUtc,
} from '../services/api';

function useSafeIsFocused(): boolean {
  try {
    return useIsFocused();
  } catch {
    return true;
  }
}

export interface UseXurResult {
  xurData: XurData | null;
  activeVendor: VendorMeta;
  selectedVendorId: DestinyVendorId;
  selectVendor: (id: DestinyVendorId) => void;
  isLoading: boolean;
  error: string | null;
  isXurPresent: boolean;
  timeUntilXur: string;
  refreshXurData: () => Promise<void>;
}

export function useXur(initialVendor: DestinyVendorId = 'xur'): UseXurResult {
  const [selectedVendorId, setSelectedVendorId] =
    useState<DestinyVendorId>(initialVendor);
  const latestVendorRef = useRef<DestinyVendorId>(initialVendor);
  const mountedRef = useRef(true);
  const reqIdRef = useRef(0);
  const [xurData, setXurData] = useState<XurData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const isFocused = useSafeIsFocused();
  const [isAppActive, setIsAppActive] = useState(
    () => !AppState?.currentState || AppState.currentState === 'active'
  );

  const activeVendor =
    DESTINY_VENDORS.find((v) => v.id === selectedVendorId) || DESTINY_VENDORS[0];

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchVendorData = useCallback(
    async (vendorId: DestinyVendorId, force = false) => {
      const reqId = ++reqIdRef.current;
      if (mountedRef.current) {
        setIsLoading(true);
        setError(null);
      }
      try {
        const response = await apiService.getVendorInventory(vendorId, force);
        if (
          mountedRef.current &&
          reqId === reqIdRef.current &&
          latestVendorRef.current === vendorId
        ) {
          setXurData(response.Response);
        }
      } catch (err) {
        console.error('Failed to fetch vendor data:', err);
        if (
          mountedRef.current &&
          reqId === reqIdRef.current &&
          latestVendorRef.current === vendorId
        ) {
          setError('TELEMETRY LINK INTERRUPTED');
        }
      } finally {
        if (
          mountedRef.current &&
          reqId === reqIdRef.current &&
          latestVendorRef.current === vendorId
        ) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  const selectVendor = useCallback((id: DestinyVendorId) => {
    latestVendorRef.current = id;
    setSelectedVendorId(id);
  }, []);

  const refreshXurData = useCallback(async () => {
    await fetchVendorData(latestVendorRef.current, true);
  }, [fetchVendorData]);

  useEffect(() => {
    latestVendorRef.current = selectedVendorId;
    fetchVendorData(selectedVendorId, false);
  }, [fetchVendorData, selectedVendorId]);

  useEffect(() => {
    return apiService.subscribeCacheInvalidation(() => {
      fetchVendorData(latestVendorRef.current, false);
    });
  }, [fetchVendorData]);

  useEffect(() => {
    if (typeof AppState?.addEventListener !== 'function') return;
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      setIsAppActive(state === 'active');
    });
    return () => {
      sub?.remove?.();
    };
  }, []);

  const isClockActive = isFocused && isAppActive;

  useEffect(() => {
    if (!isClockActive) return;
    setCurrentTime(new Date());
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [isClockActive]);

  return {
    xurData,
    activeVendor,
    selectedVendorId,
    selectVendor,
    isLoading,
    error,
    isXurPresent: isXurActiveUtc(currentTime),
    timeUntilXur: formatXurCountdownUtc(currentTime),
    refreshXurData,
  };
}
