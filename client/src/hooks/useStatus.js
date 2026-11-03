/**
 * useStatus — fetches server status (providers, usage, docs).
 */
import { useState, useEffect, useCallback } from 'react';

export function useStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) setStatus(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [refresh]);

  return { status, loading, refresh };
}
