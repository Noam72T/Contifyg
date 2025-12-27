const cacheService = require('../services/cacheService');

/**
 * Middleware de cache générique
 * @param {number} ttl - Temps de vie en secondes (défaut: 300 = 5 minutes)
 * @param {Function} keyGenerator - Fonction pour générer la clé de cache
 */
const cacheMiddleware = (ttl = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    try {
      // Générer la clé de cache
      let cacheKey;
      if (keyGenerator && typeof keyGenerator === 'function') {
        cacheKey = keyGenerator(req);
      } else {
        // Clé par défaut basée sur l'URL et les paramètres
        const queryString = new URLSearchParams(req.query).toString();
        cacheKey = `${req.originalUrl}:${queryString}:${req.userId || 'anonymous'}`;
      }

      // Vérifier si les données sont en cache
      const cachedData = cacheService.get(cacheKey);
      
      if (cachedData) {
        console.log(`📦 Cache HIT pour: ${cacheKey}`);
        return res.json(cachedData);
      }

      console.log(`🔍 Cache MISS pour: ${cacheKey}`);

      // Intercepter la réponse pour la mettre en cache
      const originalJson = res.json;
      res.json = function(data) {
        // Mettre en cache seulement les réponses de succès
        if (res.statusCode === 200 && data.success !== false) {
          cacheService.set(cacheKey, data, ttl);
          console.log(`💾 Données mises en cache: ${cacheKey}`);
        }
        
        // Appeler la méthode json originale
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Erreur dans le middleware de cache:', error);
      next(); // Continuer sans cache en cas d'erreur
    }
  };
};

/**
 * Middleware de cache spécifique pour les utilisateurs
 */
const usersCacheMiddleware = cacheMiddleware(300, (req) => {
  const { company, page = 1, limit = 50 } = req.query;
  return cacheService.generateUsersCacheKey(company, page, limit);
});

/**
 * Middleware de cache spécifique pour les prestations
 */
const prestationsCacheMiddleware = cacheMiddleware(600, (req) => { // 10 minutes pour les prestations
  const { company, category, page = 1 } = req.query;
  return cacheService.generatePrestationsCacheKey(company, category, page);
});

/**
 * Middleware de cache spécifique pour les employés
 */
const employesCacheMiddleware = cacheMiddleware(300, (req) => {
  const { companyId, statut, page = 1 } = req.query;
  return cacheService.generateEmployesCacheKey(companyId, statut, page);
});

/**
 * Middleware de cache pour le profil utilisateur
 */
const profileCacheMiddleware = cacheMiddleware(180, (req) => { // 3 minutes pour le profil
  return `user:profile:${req.user.id}`;
});

/**
 * Middleware pour invalider le cache après une modification
 */
const invalidateCacheMiddleware = (patterns = []) => {
  return (req, res, next) => {
    const originalJson = res.json;
    res.json = function(data) {
      // Invalider le cache après une réponse de succès
      if (res.statusCode === 200 || res.statusCode === 201) {
        patterns.forEach(pattern => {
          if (typeof pattern === 'function') {
            const key = pattern(req, data);
            cacheService.delPattern(key);
          } else {
            cacheService.delPattern(pattern);
          }
        });
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  cacheMiddleware,
  usersCacheMiddleware,
  prestationsCacheMiddleware,
  employesCacheMiddleware,
  profileCacheMiddleware,
  invalidateCacheMiddleware
};
