import { useState, useEffect, useCallback } from 'react';
import {
  warframeService,
  WarframeTelemetryState,
} from '../services/warframe';

export interface UseWarframeResult {
  telemetry: WarframeTelemetryState | null;
  isLoading: boolean;
  error: string | null;
  now: Date;
  refreshTelemetry: () => Promise<void>;
}

export function useWarframe(): UseWarframeResult {
  const [telemetry, setTelemetry] = useState<WarframeTelemetryState | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  const loadTelemetry = useCallback(async (force = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await warframeService.getTelemetry(force);
      setTelemetry(data);
    } catch (err) {
      console.error('Warframe telemetry error:', err);
      setError('ORIGIN SYSTEM RELAY UNREACHABLE');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshTelemetry = useCallback(async () => {
    await loadTelemetry(true);
  }, [loadTelemetry]);

  useEffect(() => {
    loadTelemetry(false);
  }, [loadTelemetry]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return {
    telemetry,
    isLoading,
    error,
    now,
    refreshTelemetry,
  };
}
