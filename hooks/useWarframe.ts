import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useIsFocused } from 'expo-router';
import {
  warframeService,
  WarframeTelemetryState,
} from '../services/warframe';

function useSafeIsFocused(): boolean {
  try {
    return useIsFocused();
  } catch {
    return true;
  }
}

export interface UseWarframeResult {
  telemetry: WarframeTelemetryState | null;
  isLoading: boolean;
  error: string | null;
  now: Date;
  refreshTelemetry: () => Promise<void>;
}

export function useWarframe(): UseWarframeResult {
  const mountedRef = useRef(true);
  const reqIdRef = useRef(0);
  const [telemetry, setTelemetry] = useState<WarframeTelemetryState | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const isFocused = useSafeIsFocused();
  const [isAppActive, setIsAppActive] = useState(
    () => !AppState?.currentState || AppState.currentState === 'active'
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadTelemetry = useCallback(async (force = false) => {
    const reqId = ++reqIdRef.current;
    if (mountedRef.current) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const data = await warframeService.getTelemetry(force);
      if (mountedRef.current && reqId === reqIdRef.current) {
        setTelemetry(data);
      }
    } catch (err) {
      console.error('Warframe telemetry error:', err);
      if (mountedRef.current && reqId === reqIdRef.current) {
        setError('ORIGIN SYSTEM RELAY UNREACHABLE');
      }
    } finally {
      if (mountedRef.current && reqId === reqIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const refreshTelemetry = useCallback(async () => {
    await loadTelemetry(true);
  }, [loadTelemetry]);

  useEffect(() => {
    loadTelemetry(false);
  }, [loadTelemetry]);

  useEffect(() => {
    return warframeService.subscribeCacheInvalidation(() => {
      loadTelemetry(false);
    });
  }, [loadTelemetry]);

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
    setNow(new Date());
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [isClockActive]);

  return {
    telemetry,
    isLoading,
    error,
    now,
    refreshTelemetry,
  };
}
