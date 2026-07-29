import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

// ─── SUPABASE QUERY HOOK (replaces Convex useQuery) ─────────────────────────

export function useSupabaseQuery<T>(
  queryFn: () => Promise<T>,
  deps: unknown[] = [],
  options?: { enabled?: boolean; realtime?: boolean; channel?: string; filter?: string }
): { data: T | undefined; isLoading: boolean; error: Error | null; refetch: () => void } {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  const enabled = options?.enabled !== false;

  const fetch = useCallback(async () => {
    if (!enabled) {
      setData(undefined);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(data === undefined);
      const result = await queryFn();
      if (mountedRef.current) { setData(result); setIsLoading(false); setError(null); }
    } catch (err) {
      if (mountedRef.current) { setData(undefined); setIsLoading(false); setError(err as Error); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => { mountedRef.current = false; };
  }, [fetch]);

  // Realtime subscription
  useEffect(() => {
    if (!options?.realtime || !options?.channel) return;

    const channel = supabase
      .channel(options.channel)
      .on("postgres_changes", { event: "*", schema: "public", table: options.channel, filter: options.filter } as never, () => fetch() as never)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options?.realtime, options?.channel, options?.filter]);

  return { data, isLoading, error, refetch: fetch };
}

// ─── SUPABASE MUTATION HOOK (replaces Convex useMutation) ──────────────────

export function useSupabaseMutation<TArgs, TResult = void>(
  mutationFn: (args: TArgs) => Promise<TResult>
): [(args: TArgs) => Promise<TResult | undefined>, { isLoading: boolean; error: Error | null }] {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (args: TArgs): Promise<TResult | undefined> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await mutationFn(args);
      setIsLoading(false);
      return result;
    } catch (err) {
      setIsLoading(false);
      setError(err as Error);
      console.error("[KORTEX] Mutation error:", err);
      return undefined;
    }
  }, [mutationFn]);

  return [execute, { isLoading, error }];
}

// ─── SUPABASE ACTION HOOK (replaces Convex useAction) ──────────────────────

export function useSupabaseAction<TArgs, TResult>(
  actionFn: (args: TArgs) => Promise<TResult>
): [(args: TArgs) => Promise<TResult | undefined>, { isLoading: boolean; error: Error | null }] {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (args: TArgs): Promise<TResult | undefined> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await actionFn(args);
      setIsLoading(false);
      return result;
    } catch (err) {
      setIsLoading(false);
      setError(err as Error);
      console.error("[KORTEX] Action error:", err);
      return undefined;
    }
  }, [actionFn]);

  return [execute, { isLoading, error }];
}

// ─── REALTIME HOOK ─────────────────────────────────────────────────────────

export function useSupabaseRealtime(
  table: string,
  callback: (payload: unknown) => void,
  filter?: string
) {
  useEffect(() => {
    const channel = supabase
      .channel(`realtime:${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table, filter } as never, callback as never)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [table, callback, filter]);
}
