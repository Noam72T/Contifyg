// Gestionnaire de requêtes pour monitorer les appels API
// Stub simple pour éviter les erreurs de compilation

interface RequestStats {
  total: number;
  pending: number;
  completed: number;
  errors: number;
  totalRequests: number;
  cacheHits: number;
  rateLimitHits: number;
  averageResponseTime: number;
  queueLength: number;
  currentRequests: number;
  cacheSize: number;
  rateLimitDelay: number;
}

class RequestManager {
  private stats: RequestStats = {
    total: 0,
    pending: 0,
    completed: 0,
    errors: 0,
    totalRequests: 0,
    cacheHits: 0,
    rateLimitHits: 0,
    averageResponseTime: 0,
    queueLength: 0,
    currentRequests: 0,
    cacheSize: 0,
    rateLimitDelay: 0
  };

  private listeners: ((stats: RequestStats) => void)[] = [];

  startRequest() {
    this.stats.total++;
    this.stats.pending++;
    this.notifyListeners();
  }

  completeRequest() {
    this.stats.pending = Math.max(0, this.stats.pending - 1);
    this.stats.completed++;
    this.notifyListeners();
  }

  errorRequest() {
    this.stats.pending = Math.max(0, this.stats.pending - 1);
    this.stats.errors++;
    this.notifyListeners();
  }

  getStats(): RequestStats {
    return { ...this.stats };
  }

  subscribe(listener: (stats: RequestStats) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.getStats()));
  }

  reset() {
    this.stats = {
      total: 0,
      pending: 0,
      completed: 0,
      errors: 0,
      totalRequests: 0,
      cacheHits: 0,
      rateLimitHits: 0,
      averageResponseTime: 0,
      queueLength: 0,
      currentRequests: 0,
      cacheSize: 0,
      rateLimitDelay: 0
    };
    this.notifyListeners();
  }

  invalidateCache() {
    // Stub pour invalidation du cache
    this.stats.cacheSize = 0;
    this.stats.cacheHits = 0;
    this.notifyListeners();
  }
}

export const requestManager = new RequestManager();
export type { RequestStats };
