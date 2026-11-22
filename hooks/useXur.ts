import { useState, useEffect, useCallback, useRef } from 'react';
import {
  apiService,
  XurData,
  DestinyVendorId,
  DESTINY_VENDORS,
  VendorMeta,
  isXurActiveUtc,
  getNextXurResetUtc,
  formatXurCountdownUtc,
} from '../services/api';

export { isXurActiveUtc, getNextXurResetUtc, formatXurCountdownUtc };

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
  const [xurData, setXurData] = useState<XurData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const activeVendor =
    DESTINY_VENDORS.find((v) => v.id === selectedVendorId) || DESTINY_VENDORS[0];

  const fetchVendorData = useCallback(
    async (vendorId: DestinyVendorId, force = false) => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await apiService.getVendorInventory(vendorId, force);
        if (latestVendorRef.current === vendorId) {
          setXurData(response.Response);
        }
      } catch (err) {
        console.error('Failed to fetch vendor data:', err);
        if (latestVendorRef.current === vendorId) {
          setError('TELEMETRY LINK INTERRUPTED');
        }
      } finally {
        if (latestVendorRef.current === vendorId) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  const selectVendor = useCallback(
    (id: DestinyVendorId) => {
      latestVendorRef.current = id;
      setSelectedVendorId(id);
      fetchVendorData(id, false);
    },
    [fetchVendorData]
  );

  const refreshXurData = useCallback(async () => {
    await fetchVendorData(selectedVendorId, true);
  }, [fetchVendorData, selectedVendorId]);

  useEffect(() => {
    fetchVendorData(selectedVendorId, false);
  }, [fetchVendorData, selectedVendorId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
