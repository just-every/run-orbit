import { useEffect, useState } from "react";
import { notFound } from '@tanstack/react-router';

export interface ResourceState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  reload: () => void;
}

export function useOperatorResource<T>(key: string, load: () => Promise<T>, initialData?: T): ResourceState<T> {
  const [data, setData] = useState<T | null>(initialData ?? null);
  const [failure, setFailure] = useState<{ key: string; error: Error } | null>(null);
  const error = failure?.key === key ? failure.error : null;
  const [request, setRequest] = useState(0);

  useEffect(() => {
    let active = true;
    // Retain the server-rendered result while refreshing this view.
    setFailure(null);

    load().then(
      (next) => { if (active) setData(next); },
      (next: unknown) => { if (active) setFailure({ key, error: next instanceof Error ? next : new Error("Orbit could not load this view.") }); }
    );

    return () => { active = false; };
  }, [key, load, request]);

  // The main detail read owns the route's recovery state; nested panels keep their own errors.
  if (error && (error as Error & { status?: number }).status === 404 && /^(opportunity|contact|company|draft|meeting|assistance):/.test(key)) {
    throw notFound();
  }

  return { data, error, loading: !data && !error, reload: () => setRequest((current) => current + 1) };
}
