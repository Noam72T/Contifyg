const cacheService = require('../services/cacheService');

/**
 * Middleware de monitoring des performances
 */
const performanceMonitor = (req, res, next) => {
  const startTime = Date.now();
  const originalUrl = req.originalUrl;
  const method = req.method;
  
  // Intercepter la fin de la réponse
  const originalEnd = res.end;
  res.end = function(...args) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    const statusCode = res.statusCode;
    
    // Logger les requêtes lentes (> 1000ms)
    if (duration > 1000) {
      console.warn(`🐌 REQUÊTE LENTE: ${method} ${originalUrl} - ${duration}ms - Status: ${statusCode}`);
      
      // Stocker les statistiques des requêtes lentes
      const slowQueryKey = `slow_queries:${new Date().toISOString().split('T')[0]}`;
      const slowQueries = cacheService.get(slowQueryKey) || [];
      slowQueries.push({
        method,
        url: originalUrl,
        duration,
        statusCode,
        timestamp: new Date().toISOString(),
        userId: req.userId || 'anonymous'
      });
      
      // Garder seulement les 100 dernières requêtes lentes
      if (slowQueries.length > 100) {
        slowQueries.shift();
      }
      
      cacheService.set(slowQueryKey, slowQueries, 86400); // 24h
    }
    
    // Logger toutes les requêtes en mode debug
    if (process.env.NODE_ENV === 'development') {
      const emoji = duration > 1000 ? '🐌' : duration > 500 ? '⚠️' : '✅';
      console.log(`${emoji} ${method} ${originalUrl} - ${duration}ms - Status: ${statusCode}`);
    }
    
    // Statistiques générales
    const statsKey = `api_stats:${new Date().toISOString().split('T')[0]}`;
    const stats = cacheService.get(statsKey) || {
      totalRequests: 0,
      totalDuration: 0,
      averageDuration: 0,
      slowRequests: 0,
      errorRequests: 0
    };
    
    stats.totalRequests++;
    stats.totalDuration += duration;
    stats.averageDuration = Math.round(stats.totalDuration / stats.totalRequests);
    
    if (duration > 1000) {
      stats.slowRequests++;
    }
    
    if (statusCode >= 400) {
      stats.errorRequests++;
    }
    
    cacheService.set(statsKey, stats, 86400); // 24h
    
    // Appeler la méthode end originale
    originalEnd.apply(this, args);
  };
  
  next();
};

/**
 * Obtenir les statistiques de performance
 */
const getPerformanceStats = () => {
  const today = new Date().toISOString().split('T')[0];
  const statsKey = `api_stats:${today}`;
  const slowQueryKey = `slow_queries:${today}`;
  
  const stats = cacheService.get(statsKey) || {
    totalRequests: 0,
    totalDuration: 0,
    averageDuration: 0,
    slowRequests: 0,
    errorRequests: 0
  };
  
  const slowQueries = cacheService.get(slowQueryKey) || [];
  const cacheStats = cacheService.getStats();
  
  return {
    date: today,
    requests: stats,
    slowQueries: slowQueries.slice(-10), // 10 dernières requêtes lentes
    cache: {
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      keys: cacheStats.keys,
      hitRate: cacheStats.hits > 0 ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(2) + '%' : '0%'
    }
  };
};

/**
 * Route pour obtenir les statistiques (à ajouter dans une route admin)
 */
const performanceStatsRoute = (req, res) => {
  try {
    const stats = getPerformanceStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des stats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
};

module.exports = {
  performanceMonitor,
  getPerformanceStats,
  performanceStatsRoute
};
