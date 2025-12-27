const discordLogger = require('../services/discordLogger');

/**
 * Middleware pour capturer et logger les erreurs dans les routes
 * Usage: app.use('/api/route', logErrors, routeHandler);
 */
const logErrors = (req, res, next) => {
  // Wrapper pour les fonctions async
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Intercepter les réponses d'erreur
  res.json = function(data) {
    if (data && !data.success && res.statusCode >= 400) {
      // Log automatique des erreurs
      const context = {
        route: req.originalUrl,
        method: req.method,
        userId: req.user?.id || req.user?._id,
        companyId: req.user?.currentCompany || req.user?.company,
        data: req.body
      };
      
      const error = new Error(data.message || 'Erreur inconnue');
      error.status = res.statusCode;
      
      // Log asynchrone sans bloquer la réponse
      if (res.statusCode >= 500) {
        discordLogger.logCrash(error, context).catch(console.error);
      } else if (res.statusCode >= 400) {
        discordLogger.logFailedAction(
          `${req.method} ${req.originalUrl}`,
          error,
          context
        ).catch(console.error);
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Wrapper pour les routes async qui capture automatiquement les erreurs
 * Usage: router.get('/route', asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(async (error) => {
      console.error('Erreur dans route async:', error);
      
      const context = {
        route: req.originalUrl,
        method: req.method,
        userId: req.user?.id || req.user?._id,
        companyId: req.user?.currentCompany || req.user?.company,
        data: req.body
      };
      
      // Log Discord
      try {
        if (error.status >= 500 || !error.status) {
          await discordLogger.logCrash(error, context);
        } else {
          await discordLogger.logFailedAction(
            `${req.method} ${req.originalUrl}`,
            error,
            context
          );
        }
      } catch (logError) {
        console.error('Erreur lors du log Discord:', logError.message);
      }
      
      next(error);
    });
  };
};

/**
 * Log manuel d'une action importante réussie
 */
const logSuccess = async (req, action, details = {}) => {
  try {
    const context = {
      userId: req.user?.id || req.user?._id,
      companyId: req.user?.currentCompany || req.user?.company,
      ...details
    };
    
    await discordLogger.logInfo(
      `✅ ${action}`,
      `Action réussie: ${action}`,
      context
    );
  } catch (error) {
    console.error('Erreur lors du log Discord de succès:', error.message);
  }
};

/**
 * Log manuel d'une action critique
 */
const logCritical = async (req, action, error, details = {}) => {
  try {
    const context = {
      route: req.originalUrl,
      method: req.method,
      userId: req.user?.id || req.user?._id,
      companyId: req.user?.currentCompany || req.user?.company,
      ...details
    };
    
    await discordLogger.logCrash(error, context);
  } catch (logError) {
    console.error('Erreur lors du log Discord critique:', logError.message);
  }
};

module.exports = {
  logErrors,
  asyncHandler,
  logSuccess,
  logCritical,
  discordLogger
};
