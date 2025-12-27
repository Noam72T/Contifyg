const discordLogger = require('../services/discordLogger');

/**
 * Middleware pour logger toutes les requêtes et détecter les comportements suspects
 */

// Map pour tracker les requêtes par IP
const requestTracker = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 100;
const SUSPICIOUS_PATTERNS = [
  /(\bor\b|\band\b).*=.*('|")/i, // SQL Injection
  /<script|javascript:|onerror=/i, // XSS
  /\.\.\/|\.\.\\/, // Path Traversal
  /union.*select|drop.*table|insert.*into/i, // SQL Injection avancée
];

/**
 * Middleware principal de logging de sécurité
 */
const securityLogger = async (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  // Tracker les requêtes par IP
  if (!requestTracker.has(ip)) {
    requestTracker.set(ip, []);
  }
  
  const requests = requestTracker.get(ip);
  requests.push(now);
  
  // Nettoyer les anciennes requêtes
  const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);
  requestTracker.set(ip, recentRequests);
  
  // Détecter trop de requêtes
  if (recentRequests.length > MAX_REQUESTS_PER_MINUTE) {
    await discordLogger.logSuspiciousActivity(req, 'Trop de requêtes détectées', {
      requestCount: recentRequests.length,
      timeWindow: '1 minute'
    });
  }
  
  // Vérifier les patterns suspects dans l'URL et les paramètres
  const fullUrl = req.originalUrl || req.url;
  const queryString = JSON.stringify(req.query);
  const bodyString = JSON.stringify(req.body);
  
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(fullUrl) || pattern.test(queryString) || pattern.test(bodyString)) {
      const attackType = pattern.source.includes('script') ? 'XSS' :
                        pattern.source.includes('union') ? 'SQL Injection' :
                        pattern.source.includes('\\.\\.') ? 'Path Traversal' : 'Injection';
      
      const payload = fullUrl + ' | ' + queryString + ' | ' + bodyString;
      
      await discordLogger.logSecurityThreat(req, attackType, payload);
      
      // Bloquer la requête
      return res.status(403).json({
        success: false,
        message: 'Requête bloquée pour raisons de sécurité'
      });
    }
  }
  
  next();
};

/**
 * Middleware pour logger les accès non autorisés
 */
const logUnauthorized = (resource) => {
  return async (req, res, next) => {
    // Ce middleware sera appelé seulement si l'accès est refusé
    const user = req.user || null;
    await discordLogger.logUnauthorizedAccess(req, resource, user);
    next();
  };
};

/**
 * Middleware pour logger les actions sensibles
 */
const logSensitiveAction = (actionName) => {
  return async (req, res, next) => {
    const user = req.user;
    if (user) {
      const target = req.params.id || req.body.id || 'N/A';
      await discordLogger.logSensitiveAction(user, actionName, target, req);
    }
    next();
  };
};

/**
 * Middleware pour détecter les tentatives de vol de données
 */
const detectDataTheft = (dataType, threshold = 100) => {
  return async (req, res, next) => {
    // Intercepter la réponse
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      // Vérifier si c'est un tableau de données
      if (Array.isArray(data) && data.length > threshold) {
        const user = req.user;
        if (user) {
          discordLogger.logDataTheftAttempt(req, user, dataType, data.length);
        }
      } else if (data.data && Array.isArray(data.data) && data.data.length > threshold) {
        const user = req.user;
        if (user) {
          discordLogger.logDataTheftAttempt(req, user, dataType, data.data.length);
        }
      }
      
      return originalJson(data);
    };
    
    next();
  };
};

/**
 * Nettoyer le tracker périodiquement
 */
setInterval(() => {
  const now = Date.now();
  for (const [ip, requests] of requestTracker.entries()) {
    const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);
    if (recentRequests.length === 0) {
      requestTracker.delete(ip);
    } else {
      requestTracker.set(ip, recentRequests);
    }
  }
}, RATE_LIMIT_WINDOW);

module.exports = {
  securityLogger,
  logUnauthorized,
  logSensitiveAction,
  detectDataTheft
};
