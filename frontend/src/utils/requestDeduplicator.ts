/**
 * Système de déduplication des requêtes pour éviter les appels en double
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private requestCache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5000; // 5 secondes de cache
  private readonly REQUEST_TIMEOUT = 30000; // 30 secondes de timeout

  /**
   * Génère une clé unique pour la requête
   */
  private generateKey(url: string, method: string, data?: any): string {
    const dataStr = data ? JSON.stringify(data) : '';
    return `${method}:${url}:${dataStr}`;
  }

  /**
   * Nettoie les requêtes expirées
   */
  private cleanup(): void {
    const now = Date.now();
    
    // Nettoyer les requêtes en attente expirées
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.REQUEST_TIMEOUT) {
        this.pendingRequests.delete(key);
      }
    }
    
    // Nettoyer le cache expiré
    for (const [key, cached] of this.requestCache.entries()) {
      if (now - cached.timestamp > this.CACHE_TTL) {
        this.requestCache.delete(key);
      }
    }
  }

  /**
   * Exécute une requête avec déduplication
   */
  async deduplicate<T>(
    url: string,
    method: string,
    requestFn: () => Promise<T>,
    data?: any,
    useCache: boolean = true
  ): Promise<T> {
    this.cleanup();
    
    const key = this.generateKey(url, method, data);
    
    // Vérifier le cache pour les GET
    if (method === 'GET' && useCache) {
      const cached = this.requestCache.get(key);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }
    }
    
    // Vérifier si une requête identique est déjà en cours
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending.promise;
    }
    
    // Créer une nouvelle requête
    const promise = requestFn()
      .then((result) => {
        // Mettre en cache le résultat pour les GET
        if (method === 'GET' && useCache) {
          this.requestCache.set(key, {
            data: result,
            timestamp: Date.now()
          });
        }
        
        // Supprimer de la liste des requêtes en attente
        this.pendingRequests.delete(key);
        
        return result;
      })
      .catch((error) => {
        // Supprimer de la liste des requêtes en attente
        this.pendingRequests.delete(key);
        throw error;
      });
    
    // Ajouter à la liste des requêtes en attente
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now()
    });
    
    return promise;
  }

  /**
   * Invalide le cache pour une URL spécifique
   */
  invalidateCache(urlPattern: string): void {
    for (const key of this.requestCache.keys()) {
      if (key.includes(urlPattern)) {
        this.requestCache.delete(key);
      }
    }
  }

  /**
   * Vide tout le cache
   */
  clearCache(): void {
    this.requestCache.clear();
  }

  /**
   * Obtient les statistiques
   */
  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      cachedRequests: this.requestCache.size
    };
  }
}

export const requestDeduplicator = new RequestDeduplicator();
