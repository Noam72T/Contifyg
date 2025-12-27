import { useRef, useCallback } from 'react';

/**
 * Hook pour debouncer les requêtes API
 * Évite les appels multiples rapides
 */
export function useDebouncedRequest<T extends (...args: any[]) => Promise<any>>(
  callback: T,
  delay: number = 300
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingPromiseRef = useRef<{
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  } | null>(null);

  const debouncedFunction = useCallback(
    (...args: Parameters<T>): Promise<ReturnType<T>> => {
      // Annuler le timeout précédent
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      return new Promise((resolve, reject) => {
        // Stocker les promesses pour les résoudre plus tard
        pendingPromiseRef.current = { resolve, reject };

        timeoutRef.current = setTimeout(async () => {
          try {
            const result = await callback(...args);
            pendingPromiseRef.current?.resolve(result);
          } catch (error) {
            pendingPromiseRef.current?.reject(error);
          } finally {
            pendingPromiseRef.current = null;
          }
        }, delay);
      });
    },
    [callback, delay]
  ) as T;

  return debouncedFunction;
}

/**
 * Hook pour throttler les requêtes API
 * Limite le nombre d'appels dans un intervalle de temps
 */
export function useThrottledRequest<T extends (...args: any[]) => Promise<any>>(
  callback: T,
  limit: number = 1000
): T {
  const lastCallRef = useRef<number>(0);
  const pendingRef = useRef<Promise<any> | null>(null);

  const throttledFunction = useCallback(
    (...args: Parameters<T>): Promise<ReturnType<T>> => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;

      // Si une requête est déjà en cours, retourner la même promesse
      if (pendingRef.current) {
        return pendingRef.current;
      }

      // Si le délai n'est pas écoulé, attendre
      if (timeSinceLastCall < limit) {
        return new Promise((resolve, reject) => {
          setTimeout(async () => {
            try {
              lastCallRef.current = Date.now();
              pendingRef.current = callback(...args);
              const result = await pendingRef.current;
              pendingRef.current = null;
              resolve(result);
            } catch (error) {
              pendingRef.current = null;
              reject(error);
            }
          }, limit - timeSinceLastCall);
        });
      }

      // Exécuter immédiatement
      lastCallRef.current = now;
      pendingRef.current = callback(...args);
      
      pendingRef.current.finally(() => {
        pendingRef.current = null;
      });

      return pendingRef.current;
    },
    [callback, limit]
  ) as T;

  return throttledFunction;
}
