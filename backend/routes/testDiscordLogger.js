const express = require('express');
const router = express.Router();
const { asyncHandler, logSuccess, logCritical, discordLogger } = require('../middleware/discordLogger');

// Test de notification de succès
router.get('/test-success', asyncHandler(async (req, res) => {
  await logSuccess(req, 'Test de notification de succès', {
    testData: 'Données de test',
    timestamp: new Date().toISOString()
  });
  
  res.json({
    success: true,
    message: 'Notification de succès envoyée sur Discord'
  });
}));

// Test de notification d'erreur
router.get('/test-error', asyncHandler(async (req, res) => {
  const testError = new Error('Erreur de test pour Discord');
  testError.stack = 'Test Stack Trace\n  at testRoute\n  at express';
  
  await logCritical(req, 'Test d\'erreur', testError, {
    testType: 'Erreur simulée',
    severity: 'test'
  });
  
  res.json({
    success: true,
    message: 'Notification d\'erreur envoyée sur Discord'
  });
}));

// Test de crash simulé
router.get('/test-crash', asyncHandler(async (req, res) => {
  // Simuler un crash
  throw new Error('Crash simulé pour test Discord Logger');
}));

// Test de notification d'information
router.get('/test-info', asyncHandler(async (req, res) => {
  await discordLogger.logInfo(
    'Test d\'information',
    'Ceci est un test de notification d\'information',
    {
      userId: req.user?.id || 'utilisateur-test',
      companyId: req.user?.currentCompany || 'entreprise-test'
    }
  );
  
  res.json({
    success: true,
    message: 'Notification d\'information envoyée sur Discord'
  });
}));

// Test de toutes les notifications
router.get('/test-all', asyncHandler(async (req, res) => {
  const results = [];
  
  try {
    // Test info
    await discordLogger.logInfo('Test complet', 'Début du test de toutes les notifications');
    results.push('✅ Info envoyée');
    
    // Test succès
    await logSuccess(req, 'Test de succès dans test-all');
    results.push('✅ Succès envoyé');
    
    // Test erreur
    const testError = new Error('Erreur de test dans test-all');
    await discordLogger.logFailedAction('Test d\'action échouée', testError, {
      route: req.originalUrl,
      method: req.method
    });
    results.push('✅ Erreur envoyée');
    
    // Test final
    await discordLogger.logInfo('Test complet terminé', 'Tous les tests ont été exécutés avec succès');
    results.push('✅ Test final envoyé');
    
    res.json({
      success: true,
      message: 'Tous les tests Discord ont été exécutés',
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors des tests Discord',
      error: error.message,
      results
    });
  }
}));

// Vérifier la configuration
router.get('/config', (req, res) => {
  res.json({
    success: true,
    config: {
      webhookConfigured: !!process.env.DISCORD_WEBHOOK_URL,
      logEnabled: process.env.DISCORD_LOG_ENABLED === 'true',
      environment: process.env.NODE_ENV,
      serverName: process.env.SERVER_NAME || 'BackupVPS Server'
    }
  });
});

module.exports = router;
