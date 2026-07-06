"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Rafraîchit périodiquement `fetcher` (polling léger, pas de WebSocket).
 * La requête en cours n'est jamais recouverte par une nouvelle tant qu'elle n'est pas résolue.
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  deps: React.DependencyList = []
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const result = await fetcher();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    // `load` is async — its setState calls run in a resolved-promise callback, not
    // synchronously in the effect body. This is the polling/subscription pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const id = setInterval(load, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);

  return { data, error, loading, refetch: load, setData };
}
