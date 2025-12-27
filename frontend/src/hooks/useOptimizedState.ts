import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook optimisé pour gérer les états avec debouncing automatique
 * Réduit les re-renders inutiles
 */
export function useOptimizedState<T>(
  initialValue: T,
  debounceMs: number = 0
): [T, (value: T | ((prev: T) => T)) => void, T] {
  const [state, setState] = useState<T>(initialValue);
  const [debouncedState, setDebouncedState] = useState<T>(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const setOptimizedState = useCallback((value: T | ((prev: T) => T)) => {
    setState(value);

    if (debounceMs > 0) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setState((currentState) => {
          const newValue = typeof value === 'function' ? (value as any)(currentState) : value;
          setDebouncedState(newValue);
          return newValue;
        });
      }, debounceMs);
    } else {
      setDebouncedState(typeof value === 'function' ? (value as any)(state) : value);
    }
  }, [debounceMs, state]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, setOptimizedState, debouncedState];
}

/**
 * Hook pour éviter les appels API multiples simultanés
 */
export function useApiCall<T>(
  apiFunction: (...args: any[]) => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isLoadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(async (...args: any[]) => {
    // Éviter les appels multiples
    if (isLoadingRef.current) {
      return data;
    }

    // Annuler l'appel précédent s'il existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    isLoadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const result = await apiFunction(...args);
      setData(result);
      return result;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err);
      }
      throw err;
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { data, loading, error, execute, isLoading: isLoadingRef.current };
}

/**
 * Hook pour throttler les fonctions (limite le nombre d'appels)
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 1000
): T {
  const lastRun = useRef(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const throttledFunction = useCallback((...args: any[]) => {
    const now = Date.now();
    const timeSinceLastRun = now - lastRun.current;

    if (timeSinceLastRun >= delay) {
      callback(...args);
      lastRun.current = now;
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
        lastRun.current = Date.now();
      }, delay - timeSinceLastRun);
    }
  }, [callback, delay]) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledFunction;
}

/**
 * Hook pour debouncer les valeurs
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
