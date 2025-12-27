const express = require('express');
const router = express.Router();
const TimerPermission = require('../models/TimerPermission');
const Company = require('../models/Company');
const auth = require('../middleware/auth');

// Middleware pour vérifier que l'utilisateur est Technicien
const requireTechnician = (req, res, next) => {
  if (req.user.systemRole !== 'Technicien') {
    return res.status(403).json({
      success: false,
      error: 'Accès réservé aux Techniciens'
    });
  }
  next();
};

// Obtenir toutes les entreprises avec leurs permissions timer
router.get('/companies', auth, requireTechnician, async (req, res) => {
  try {
    // Récupérer toutes les entreprises
    const companies = await Company.find({}).select('nom email createdAt');
    
    // Récupérer les permissions existantes
    const permissions = await TimerPermission.find({})
      .populate('company', 'nom email')
      .populate('authorizedBy', 'username nom prenom');
    
    // Créer un map des permissions par entreprise
    const permissionMap = {};
    permissions.forEach(perm => {
      if (perm.company) {
        permissionMap[perm.company._id] = perm;
      }
    });
    
    // Combiner les données
    const companiesWithPermissions = companies.map(company => ({
      _id: company._id,
      nom: company.nom,
      email: company.email,
      createdAt: company.createdAt,
      timerPermission: permissionMap[company._id] || {
        isAuthorized: false,
        features: {
          canCreateVehicles: true,
          canUseTimers: true,
          autoCreateSales: true,
          maxVehicles: 10
        },
        restrictions: {
          maxSessionDuration: 480,
          requireApproval: false,
          approvalThreshold: 1000
        },
        statistics: {
          totalSessions: 0,
          totalRevenue: 0,
          lastUsed: null
        }
      }
    }));
    
    res.json({
      success: true,
      companies: companiesWithPermissions
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des entreprises:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

// Autoriser ou modifier les permissions d'une entreprise
router.post('/authorize/:companyId', auth, requireTechnician, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { 
      isAuthorized, 
      features = {}, 
      restrictions = {},
      notes 
    } = req.body;
    
    // Vérifier que l'entreprise existe
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Entreprise non trouvée'
      });
    }
    
    // Chercher ou créer la permission
    let permission = await TimerPermission.findOne({ company: companyId });
    
    if (!permission) {
      permission = new TimerPermission({
        company: companyId,
        isAuthorized: false
      });
    }
    
    // Mettre à jour les permissions
    if (isAuthorized !== undefined) {
      if (isAuthorized && !permission.isAuthorized) {
        // Autoriser
        await permission.authorize(req.user.id, features);
      } else if (!isAuthorized && permission.isAuthorized) {
        // Révoquer
        await permission.revoke();
      }
      permission.isAuthorized = isAuthorized;
    }
    
    // Mettre à jour les fonctionnalités
    if (features.canCreateVehicles !== undefined) permission.features.canCreateVehicles = features.canCreateVehicles;
    if (features.canUseTimers !== undefined) permission.features.canUseTimers = features.canUseTimers;
    if (features.autoCreateSales !== undefined) permission.features.autoCreateSales = features.autoCreateSales;
    if (features.maxVehicles !== undefined) permission.features.maxVehicles = features.maxVehicles;
    
    // Mettre à jour les restrictions
    if (restrictions.maxSessionDuration !== undefined) permission.restrictions.maxSessionDuration = restrictions.maxSessionDuration;
    if (restrictions.requireApproval !== undefined) permission.restrictions.requireApproval = restrictions.requireApproval;
    if (restrictions.approvalThreshold !== undefined) permission.restrictions.approvalThreshold = restrictions.approvalThreshold;
    
    // Mettre à jour les notes
    if (notes !== undefined) permission.notes = notes;
    
    // Mettre à jour les informations d'autorisation si nécessaire
    if (isAuthorized && permission.isAuthorized) {
      permission.authorizedBy = req.user.id;
      permission.authorizedAt = new Date();
    }
    
    await permission.save();
    await permission.populate(['company', 'authorizedBy']);
    
    res.json({
      success: true,
      permission,
      message: isAuthorized ? 'Entreprise autorisée avec succès' : 'Autorisation révoquée'
    });
  } catch (error) {
    console.error('Erreur lors de la modification des permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

// Obtenir les permissions d'une entreprise spécifique (pour les Techniciens)
router.get('/company/:companyId', auth, requireTechnician, async (req, res) => {
  try {
    const { companyId } = req.params;
    
    const permission = await TimerPermission.findOne({ company: companyId })
      .populate('company', 'nom email')
      .populate('authorizedBy', 'username nom prenom');
    
    if (!permission) {
      return res.status(404).json({
        success: false,
        error: 'Permissions non trouvées pour cette entreprise'
      });
    }
    
    res.json({
      success: true,
      permission
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

// Route publique pour vérifier les permissions d'une entreprise (pour tous les utilisateurs)
router.get('/check/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;
    
    // Vérifier que l'entreprise existe
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Entreprise non trouvée'
      });
    }
    
    const permission = await TimerPermission.findOne({ company: companyId });
    
    // Si aucune permission n'existe, l'entreprise n'est pas autorisée
    const isAuthorized = permission ? permission.isAuthorized : false;
    
    res.json({
      success: true,
      permission: {
        isAuthorized,
        company: {
          _id: company._id,
          name: company.name || company.nom
        },
        authorizedAt: permission?.authorizedAt || null,
        authorizedBy: permission?.authorizedBy || null
      }
    });
  } catch (error) {
    console.error('Erreur lors de la vérification des permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

// Obtenir les statistiques globales des timers
router.get('/stats', auth, requireTechnician, async (req, res) => {
  try {
    const stats = await TimerPermission.aggregate([
      {
        $group: {
          _id: null,
          totalCompanies: { $sum: 1 },
          authorizedCompanies: {
            $sum: { $cond: ['$isAuthorized', 1, 0] }
          },
          totalSessions: { $sum: '$statistics.totalSessions' },
          totalRevenue: { $sum: '$statistics.totalRevenue' }
        }
      }
    ]);
    
    const result = stats[0] || {
      totalCompanies: 0,
      authorizedCompanies: 0,
      totalSessions: 0,
      totalRevenue: 0
    };
    
    res.json({
      success: true,
      stats: result
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

module.exports = router;
