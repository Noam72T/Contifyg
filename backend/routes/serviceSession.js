const express = require('express');
const router = express.Router();
const ServiceSession = require('../models/ServiceSession');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Démarrer une session de service
router.post('/start', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    // Récupérer l'entreprise (priorité à currentCompany = entreprise actuellement sélectionnée)
    const companyId = user.currentCompany || user.company || (user.companies && user.companies.length > 0 ? user.companies[0].company : null);

    if (!companyId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Aucune entreprise assignée à cet utilisateur' 
      });
    }

    console.log(`🔍 Démarrage service - User: ${user.username}, Company: ${companyId}`);

    // Vérifier s'il y a des sessions actives (toutes entreprises confondues)
    const existingSessions = await ServiceSession.find({
      user: userId,
      isActive: true
    });
    
    // Si des sessions actives existent, les arrêter automatiquement
    if (existingSessions.length > 0) {
      console.log(`⚠️ ${existingSessions.length} session(s) active(s) trouvée(s), arrêt automatique...`);
      
      for (const session of existingSessions) {
        await session.endSession();
        console.log(`✅ Session arrêtée automatiquement - Company: ${session.company}`);
      }
    }

    // Créer une nouvelle session
    const newSession = new ServiceSession({
      user: userId,
      company: companyId,
      startTime: new Date(),
      isActive: true
    });

    await newSession.save();
    await newSession.populate('user', 'firstName lastName username');

    console.log(`✅ Session de service démarrée pour ${user.firstName} ${user.lastName}`);

    res.json({ 
      success: true, 
      message: 'Session de service démarrée',
      session: newSession
    });

  } catch (error) {
    console.error('❌ Erreur lors du démarrage de la session:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors du démarrage de la session',
      error: error.message 
    });
  }
});

// Arrêter la session de service active
router.post('/stop', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    // Récupérer l'entreprise (priorité à currentCompany = entreprise actuellement sélectionnée)
    const companyId = user.currentCompany || user.company || (user.companies && user.companies.length > 0 ? user.companies[0].company : null);

    if (!companyId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Aucune entreprise assignée à cet utilisateur' 
      });
    }

    // Trouver la session active
    const activeSession = await ServiceSession.getActiveSession(userId, companyId);
    
    if (!activeSession) {
      return res.status(400).json({ 
        success: false, 
        message: 'Aucune session de service active trouvée'
      });
    }

    // Terminer la session
    await activeSession.endSession();
    await activeSession.populate('user', 'firstName lastName username');

    console.log(`✅ Session de service terminée pour ${user.firstName} ${user.lastName} - Durée: ${activeSession.duration} minutes`);

    res.json({ 
      success: true, 
      message: 'Session de service terminée',
      session: activeSession
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'arrêt de la session:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'arrêt de la session',
      error: error.message 
    });
  }
});

// Arrêter TOUTES les sessions actives de l'utilisateur (utile lors du changement d'entreprise)
router.post('/stop-all', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    // Trouver TOUTES les sessions actives de l'utilisateur (toutes entreprises confondues)
    const activeSessions = await ServiceSession.find({
      user: userId,
      isActive: true
    });

    if (activeSessions.length === 0) {
      return res.json({ 
        success: true, 
        message: 'Aucune session active à arrêter',
        stoppedCount: 0
      });
    }

    // Terminer toutes les sessions
    const stoppedSessions = [];
    for (const session of activeSessions) {
      await session.endSession();
      await session.populate('user', 'firstName lastName username');
      stoppedSessions.push(session);
    }

    console.log(`✅ ${stoppedSessions.length} session(s) de service terminée(s) pour ${user.firstName} ${user.lastName}`);

    res.json({ 
      success: true, 
      message: `${stoppedSessions.length} session(s) de service terminée(s)`,
      stoppedCount: stoppedSessions.length,
      sessions: stoppedSessions
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'arrêt des sessions:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'arrêt des sessions',
      error: error.message 
    });
  }
});

// Obtenir le statut de service de l'utilisateur connecté
router.get('/status', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    // Récupérer l'entreprise (priorité à currentCompany = entreprise actuellement sélectionnée)
    const companyId = user.currentCompany || user.company || (user.companies && user.companies.length > 0 ? user.companies[0].company : null);

    if (!companyId) {
      // Si pas d'entreprise, retourner simplement pas en service
      return res.json({ 
        success: true,
        isInService: false,
        session: null
      });
    }

    const activeSession = await ServiceSession.getActiveSession(userId, companyId);

    res.json({ 
      success: true,
      isInService: !!activeSession,
      session: activeSession
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération du statut:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération du statut',
      error: error.message 
    });
  }
});

// Obtenir toutes les sessions actives de l'entreprise
router.get('/active/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;

    const activeSessions = await ServiceSession.getActiveSessions(companyId);

    // Calculer la durée actuelle pour chaque session active
    const sessionsWithDuration = activeSessions.map(session => {
      const currentDuration = Math.round((new Date() - session.startTime) / 1000 / 60);
      return {
        ...session.toObject(),
        currentDuration
      };
    });

    res.json({ 
      success: true,
      count: activeSessions.length,
      sessions: sessionsWithDuration
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des sessions actives:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des sessions actives',
      error: error.message 
    });
  }
});

// Obtenir l'historique des sessions (avec pagination et filtrage par date)
router.get('/history/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { page = 1, limit = 50, userId, startDate, endDate } = req.query;

    const query = {
      company: companyId,
      isActive: false // Seulement les sessions terminées
    };

    if (userId) {
      query.user = userId;
    }

    // Filtrage par date si fourni
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) {
        query.startTime.$gte = new Date(startDate);
      }
      if (endDate) {
        query.startTime.$lte = new Date(endDate);
      }
    }

    const sessions = await ServiceSession.find(query)
      .populate('user', 'firstName lastName username email')
      .sort({ startTime: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await ServiceSession.countDocuments(query);

    res.json({ 
      success: true,
      sessions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'historique:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération de l\'historique',
      error: error.message 
    });
  }
});

// Obtenir les statistiques de service d'un utilisateur
router.get('/stats/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const query = {
      user: userId,
      isActive: false
    };

    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }

    const sessions = await ServiceSession.find(query);

    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
    const totalHours = Math.round(totalMinutes / 60 * 100) / 100;

    res.json({ 
      success: true,
      stats: {
        totalSessions,
        totalMinutes,
        totalHours,
        averageSessionMinutes: totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message 
    });
  }
});

// Modifier une session de service (heures de début/fin)
router.put('/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { startTime, endTime } = req.body;

    // Vérifier les permissions (sauf pour les techniciens)
    const user = await User.findById(req.userId);
    if (user.systemRole !== 'Technicien') {
      // Récupérer l'entreprise actuelle
      const companyId = user.currentCompany || user.company || (user.companies && user.companies.length > 0 ? user.companies[0].company : null);
      
      // Chercher le rôle de l'utilisateur dans l'entreprise actuelle
      const Role = require('../models/Role');
      let userRole = null;
      
      if (companyId && user.companies) {
        const companyData = user.companies.find(c => c.company.toString() === companyId.toString());
        if (companyData && companyData.role) {
          userRole = await Role.findById(companyData.role).populate('permissions');
        }
      }
      
      // Si pas de rôle d'entreprise, utiliser le rôle global
      if (!userRole && user.role) {
        userRole = await Role.findById(user.role).populate('permissions');
      }
      
      if (!userRole || !userRole.permissions.some(p => p.code === 'MANAGE_SERVICE_SESSIONS')) {
        return res.status(403).json({ 
          success: false, 
          message: 'Vous n\'avez pas la permission de modifier les sessions de service' 
        });
      }
    }

    const session = await ServiceSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({ 
        success: false, 
        message: 'Session non trouvée' 
      });
    }

    // Mettre à jour les heures
    if (startTime) {
      session.startTime = new Date(startTime);
    }

    if (endTime) {
      session.endTime = new Date(endTime);
      session.isActive = false;
      
      // Recalculer la durée
      const diffMs = session.endTime.getTime() - session.startTime.getTime();
      session.duration = Math.round(diffMs / 1000 / 60);
    }

    await session.save();
    await session.populate('user', 'firstName lastName username email');

    console.log(`✅ Session modifiée - ID: ${sessionId}`);

    res.json({ 
      success: true, 
      message: 'Session modifiée avec succès',
      session
    });

  } catch (error) {
    console.error('❌ Erreur lors de la modification de la session:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la modification de la session',
      error: error.message 
    });
  }
});

// Supprimer une session de service
router.delete('/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Vérifier les permissions (sauf pour les techniciens)
    const user = await User.findById(req.userId);
    if (user.systemRole !== 'Technicien') {
      // Récupérer l'entreprise actuelle
      const companyId = user.currentCompany || user.company || (user.companies && user.companies.length > 0 ? user.companies[0].company : null);
      
      // Chercher le rôle de l'utilisateur dans l'entreprise actuelle
      const Role = require('../models/Role');
      let userRole = null;
      
      if (companyId && user.companies) {
        const companyData = user.companies.find(c => c.company.toString() === companyId.toString());
        if (companyData && companyData.role) {
          userRole = await Role.findById(companyData.role).populate('permissions');
        }
      }
      
      // Si pas de rôle d'entreprise, utiliser le rôle global
      if (!userRole && user.role) {
        userRole = await Role.findById(user.role).populate('permissions');
      }
      
      if (!userRole || !userRole.permissions.some(p => p.code === 'MANAGE_SERVICE_SESSIONS')) {
        return res.status(403).json({ 
          success: false, 
          message: 'Vous n\'avez pas la permission de supprimer les sessions de service' 
        });
      }
    }

    const session = await ServiceSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({ 
        success: false, 
        message: 'Session non trouvée' 
      });
    }

    await ServiceSession.findByIdAndDelete(sessionId);

    console.log(`✅ Session supprimée - ID: ${sessionId}`);

    res.json({ 
      success: true, 
      message: 'Session supprimée avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur lors de la suppression de la session:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la suppression de la session',
      error: error.message 
    });
  }
});

// Obtenir les statistiques de la semaine en cours
router.get('/week-stats/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;

    // Calculer le début de la semaine (lundi)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Si dimanche, reculer de 6 jours
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const sessions = await ServiceSession.find({
      company: companyId,
      startTime: { $gte: startOfWeek }
    }).populate('user', 'firstName lastName username email');

    // Calculer les stats par utilisateur
    const userStatsMap = new Map();

    sessions.forEach(session => {
      const userId = session.user._id.toString();
      
      if (!userStatsMap.has(userId)) {
        userStatsMap.set(userId, {
          userId,
          userName: `${session.user.firstName} ${session.user.lastName}`,
          totalSessions: 0,
          totalMinutes: 0,
          isActive: session.isActive
        });
      }

      const stats = userStatsMap.get(userId);
      stats.totalSessions++;
      stats.totalMinutes += session.duration || 0;
      if (session.isActive) stats.isActive = true;
    });

    const weekStats = Array.from(userStatsMap.values()).map(stats => ({
      ...stats,
      totalHours: Math.round(stats.totalMinutes / 60 * 100) / 100
    }));

    res.json({ 
      success: true,
      startOfWeek,
      stats: weekStats
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des stats de la semaine:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des stats',
      error: error.message 
    });
  }
});

module.exports = router;
