const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const glifeApiService = require('../services/glifeApiService');

// Middleware pour vérifier l'authentification sur toutes les routes
router.use(auth);

/**
 * GET /api/glife-api/stats - Obtenir les statistiques de l'API GLife
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = glifeApiService.getStats();
    
    res.json({
      success: true,
      stats: {
        ...stats,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des stats API GLife:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
});

/**
 * POST /api/glife-api/clear-cache - Vider le cache de l'API GLife
 */
router.post('/clear-cache', async (req, res) => {
  try {
    glifeApiService.clearCache();
    
    res.json({
      success: true,
      message: 'Cache vidé avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur lors du vidage du cache:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du vidage du cache',
      error: error.message
    });
  }
});

/**
 * GET /api/glife-api/health - Vérifier la santé de l'API GLife
 */
router.get('/health', async (req, res) => {
  try {
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'ID de l\'entreprise requis pour le test de santé'
      });
    }

    const startTime = Date.now();
    
    // Test simple avec une petite requête
    const endTimestamp = Math.floor(Date.now() / 1000);
    const startTimestamp = endTimestamp - (24 * 60 * 60); // 24 heures
    
    try {
      const productions = await glifeApiService.getProductions(companyId, startTimestamp, endTimestamp);
      const responseTime = Date.now() - startTime;
      
      res.json({
        success: true,
        health: {
          status: 'healthy',
          responseTime: `${responseTime}ms`,
          dataReceived: productions.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (apiError) {
      const responseTime = Date.now() - startTime;
      
      res.json({
        success: false,
        health: {
          status: 'unhealthy',
          responseTime: `${responseTime}ms`,
          error: apiError.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    console.error('❌ Erreur lors du test de santé:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du test de santé',
      error: error.message
    });
  }
});

module.exports = router;
