import { useEffect, useState } from "react";

export interface ResourceState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  reload: () => void;
}

export function useOperatorResource<T>(key: string, load: () => Promise<T>, initialData?: T): ResourceState<T> {
  const [data, setData] = useState<T | null>(initialData ?? null);
  const [error, setError] = useState<Error | null>(null);
  const [request, setRequest] = useState(0);

  useEffect(() => {
    let active = true;
    // Retain the server-rendered result while refreshing this view.
    setError(null);

    load().then(
      (next) => { if (active) setData(next); },
      (next: unknown) => { if (active) setError(next instanceof Error ? next : new Error("Orbit could not load this view.")); }
    );

    return () => { active = false; };
  }, [key, load, request]);

  return { data, error, loading: !data && !error, reload: () => setRequest((current) => current + 1) };
}
