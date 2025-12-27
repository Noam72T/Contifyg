import { useRef, useEffect, useMemo, useCallback, useState } from 'react';

/**
 * Cache en mémoire pour les données fréquemment accédées
 */
class PerformanceCache {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any, ttl: number = this.DEFAULT_TTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(pattern?: string) {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const performanceCache = new PerformanceCache();

/**
 * Hook pour utiliser le cache de performance
 */
export function useCachedData<T>(
  key: string,
  fetchFunction: () => Promise<T>,
  ttl?: number
): { data: T | null; loading: boolean; error: Error | null; refetch: () => Promise<void> } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isLoadingRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (isLoadingRef.current) return;

    // Vérifier le cache d'abord
    const cached = performanceCache.get(key);
    if (cached) {
      setData(cached);
      return;
    }

    isLoadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFunction();
      performanceCache.set(key, result, ttl);
      setData(result);
    } catch (err: any) {
      setError(err);
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, [key, fetchFunction, ttl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Optimiseur de re-renders pour les listes
 */
export function useListOptimization<T>(
  items: T[],
  keyExtractor: (item: T) => string | number
) {
  const previousItemsRef = useRef<Map<string | number, T>>(new Map());

  const optimizedItems = useMemo(() => {
    const newMap = new Map<string | number, T>();
    const result: T[] = [];

    items.forEach(item => {
      const key = keyExtractor(item);
      const previousItem = previousItemsRef.current.get(key);

      // Réutiliser l'objet précédent si identique (évite re-render)
      if (previousItem && JSON.stringify(previousItem) === JSON.stringify(item)) {
        result.push(previousItem);
        newMap.set(key, previousItem);
      } else {
        result.push(item);
        newMap.set(key, item);
      }
    });

    previousItemsRef.current = newMap;
    return result;
  }, [items, keyExtractor]);

  return optimizedItems;
}

/**
 * Hook pour éviter les re-renders inutiles lors du scroll
 */
export function useScrollOptimization(threshold: number = 100) {
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const handleScroll = useCallback((callback: (scrollY: number) => void) => {
    const scrollY = window.scrollY;

    if (Math.abs(scrollY - lastScrollY.current) < threshold) {
      return;
    }

    if (!ticking.current) {
      window.requestAnimationFrame(() => {
        callback(scrollY);
        lastScrollY.current = scrollY;
        ticking.current = false;
      });

      ticking.current = true;
    }
  }, [threshold]);

  return handleScroll;
}

/**
 * Optimiseur d'images avec lazy loading
 */
export function useImageOptimization(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = src;

    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
    };

    img.onerror = () => {
      setImageSrc(placeholder || '');
      setIsLoaded(false);
    };

    imgRef.current = img;

    return () => {
      if (imgRef.current) {
        imgRef.current.onload = null;
        imgRef.current.onerror = null;
      }
    };
  }, [src, placeholder]);

  return { imageSrc, isLoaded };
}

/**
 * Batch des mises à jour d'état pour réduire les re-renders
 */
export function useBatchedUpdates() {
  const updates = useRef<Array<() => void>>([]);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const batchUpdate = useCallback((updateFn: () => void) => {
    updates.current.push(updateFn);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      updates.current.forEach(fn => fn());
      updates.current = [];
    }, 16); // ~60fps
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return batchUpdate;
}

/**
 * Mesure les performances d'un composant
 */
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const renderTimes = useRef<number[]>([]);
  const startTime = useRef(performance.now());

  useEffect(() => {
    renderCount.current += 1;
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;
    renderTimes.current.push(renderTime);

    // Garder seulement les 10 derniers renders
    if (renderTimes.current.length > 10) {
      renderTimes.current.shift();
    }

    startTime.current = performance.now();
  });

  const getStats = useCallback(() => {
    const avgRenderTime = renderTimes.current.length > 0
      ? renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length
      : 0;

    return {
      componentName,
      renderCount: renderCount.current,
      avgRenderTime: avgRenderTime.toFixed(2),
      lastRenderTime: renderTimes.current[renderTimes.current.length - 1]?.toFixed(2) || '0'
    };
  }, [componentName]);

  return getStats;
}

