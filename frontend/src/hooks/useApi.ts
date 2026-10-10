import { useState, useEffect, useCallback, useRef } from 'react';

interface UseApiOptions {
  autoPollMs?: number;
  enabled?: boolean;
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
  refetch: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

export function useApi<T>(
  fetcher: () => Promise<{ data: T; meta?: any } | T>,
  deps: unknown[] = [],
  options: UseApiOptions = {}
): UseApiResult<T> {
  const { autoPollMs, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [meta, setMeta] = useState<UseApiResult<T>['meta']>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const execute = useCallback(async (isPolling = false) => {
    if (!enabled) return;
    if (!isPolling) setLoading(true);
    setError(null);
    try {
      const res = await fetcherRef.current();
      if (res && typeof res === 'object' && 'data' in res) {
        setData((res as { data: T; meta?: any }).data);
        if ((res as { meta?: any }).meta) {
          setMeta((res as { meta?: any }).meta);
        }
      } else {
        setData(res as T);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch data');
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [enabled]);

  // Initial fetch on deps change
  useEffect(() => {
    execute(false);
  }, [execute, ...deps]);

  // Polling effect
  useEffect(() => {
    if (!autoPollMs || !enabled) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        execute(true);
      }
    }, autoPollMs);

    return () => clearInterval(interval);
  }, [autoPollMs, enabled, execute]);

  return { data, loading, error, meta, refetch: () => execute(false), setData };
}
