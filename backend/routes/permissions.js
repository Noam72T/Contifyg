const express = require('express');
const auth = require('../middleware/auth');
const Permission = require('../models/Permission');

const router = express.Router();

// @route   GET /api/permissions
// @desc    Récupérer toutes les permissions
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const permissions = await Permission.find().sort({ category: 1, name: 1 });
    
    // Grouper les permissions par catégorie
    const groupedPermissions = permissions.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    }, {});
    
    res.json({
      success: true,
      permissions: permissions,
      grouped: groupedPermissions
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// @route   GET /api/permissions/user/:userId
// @desc    Récupérer les permissions effectives d'un utilisateur pour une entreprise spécifique
// @access  Private
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    const Role = require('../models/Role');
    
    // Chercher par ID ou par username
    let user;
    if (req.params.userId.match(/^[0-9a-fA-F]{24}$/)) {
      // C'est un ObjectId valide
      user = await User.findById(req.params.userId)
    } else {
      // C'est probablement un username
      user = await User.findOne({ username: req.params.userId })
    }
    
    if (user) {
      user = await User.findById(user._id)
        .populate({
          path: 'companies.role',
          populate: {
            path: 'permissions',
            model: 'Permission'
          }
        })
        .populate({
          path: 'role',
          populate: {
            path: 'permissions',
            model: 'Permission'
          }
        });
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Récupérer l'ID de l'entreprise depuis les paramètres de requête
    const { companyId } = req.query;
    
    
    // Récupérer les permissions de l'utilisateur pour l'entreprise spécifique
    const userPermissions = new Set();
    const accessibleCategories = new Set();
    
    if (companyId) {
      // Permissions depuis companies.role pour l'entreprise spécifique
      const companyEntry = user.companies?.find(c => c.company.toString() === companyId.toString());
      
      if (companyEntry && companyEntry.role) {
       
        
        if (companyEntry.role.permissions && companyEntry.role.permissions.length > 0) {
         
        } else {
          
        }
        
        if (companyEntry.role.permissions && companyEntry.role.permissions.length > 0) {
          for (const permission of companyEntry.role.permissions) {
            
            userPermissions.add(permission.code);
            accessibleCategories.add(permission.category);
            
            // Si l'utilisateur a une permission VIEW ou MANAGE, ajouter la catégorie
            if (permission.code.includes('_VIEW') || permission.code.includes('_MANAGE')) {
              const category = permission.code.split('_')[0];
             
              accessibleCategories.add(category);
            }
          }
        } else {
          
        }
      } else {
        
      }
    } else {
      // Si pas d'entreprise spécifiée, donner SEULEMENT accès GÉNÉRAL
     
      
      // Donner seulement accès général par défaut
      userPermissions.add('VIEW_GENERALE_CATEGORY');
      accessibleCategories.add('GENERALE');
    }
    
    // DÉSACTIVÉ: Permissions depuis role legacy (ancien système)
    // On ignore complètement les permissions legacy pour éviter les conflits
    if (user.role && user.role.permissions && user.role.permissions.length > 0) {
     
    } else {
      
    }
    
    // Si l'utilisateur n'a aucune permission, lui donner SEULEMENT accès à la catégorie GÉNÉRALE
    if (userPermissions.size === 0 && accessibleCategories.size === 0) {
      
      userPermissions.clear(); // S'assurer qu'il n'y a rien d'autre
      accessibleCategories.clear(); // S'assurer qu'il n'y a rien d'autre
      userPermissions.add('VIEW_GENERALE_CATEGORY');
      accessibleCategories.add('GENERALE');
    }
    
   
    
    
    res.json({
      success: true,
      permissions: Array.from(userPermissions),
      categories: Array.from(accessibleCategories)
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// Stockage temporaire en mémoire pour les permissions par canal
// En production, ceci devrait être sauvegardé en base de données
let channelPermissions = {};

// @route   GET /api/permissions/channels/:companyId
// @desc    Récupérer les permissions par canal pour une entreprise
// @access  Private
router.get('/channels/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;
    
    // Retourner les permissions sauvegardées ou un objet vide
    const permissions = channelPermissions[companyId] || {};
    
    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// @route   PUT /api/permissions/channels/:companyId
// @desc    Sauvegarder les permissions par canal pour une entreprise
// @access  Private
router.put('/channels/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { permissions } = req.body;
    
    // Sauvegarder les permissions
    channelPermissions[companyId] = permissions;
    
    res.json({
      success: true,
      message: 'Permissions sauvegardées avec succès',
      data: permissions
    });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// @route   GET /api/permissions/check/:companyId/:userId/:channel
// @desc    Vérifier si un utilisateur a accès à un canal spécifique
// @access  Private
router.get('/check/:companyId/:userId/:channel', auth, async (req, res) => {
  try {
    const { companyId, userId, channel } = req.params;
    
    const companyPermissions = channelPermissions[companyId] || {};
    const userChannels = companyPermissions[userId] || [];
    const hasAccess = userChannels.includes(channel);
    
    res.json({
      success: true,
      data: {
        userId,
        channel,
        hasAccess,
        userChannels
      }
    });
  } catch (error) {
    console.error('Erreur lors de la vérification des permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// @route   POST /api/permissions/grant/:companyId
// @desc    Accorder l'accès à un canal pour un utilisateur
// @access  Private
router.post('/grant/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { userId, channel } = req.body;
    
    if (!channelPermissions[companyId]) {
      channelPermissions[companyId] = {};
    }
    
    if (!channelPermissions[companyId][userId]) {
      channelPermissions[companyId][userId] = [];
    }
    
    // Ajouter le canal s'il n'existe pas déjà
    if (!channelPermissions[companyId][userId].includes(channel)) {
      channelPermissions[companyId][userId].push(channel);
    }
    
    res.json({
      success: true,
      message: `Accès accordé au canal ${channel}`,
      data: channelPermissions[companyId][userId]
    });
  } catch (error) {
    console.error('Erreur lors de l\'octroi de permission:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// @route   POST /api/permissions/revoke/:companyId
// @desc    Révoquer l'accès à un canal pour un utilisateur
// @access  Private
router.post('/revoke/:companyId', auth, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { userId, channel } = req.body;
    
    if (channelPermissions[companyId] && channelPermissions[companyId][userId]) {
      channelPermissions[companyId][userId] = channelPermissions[companyId][userId].filter(
        c => c !== channel
      );
    }
    
    res.json({
      success: true,
      message: `Accès révoqué du canal ${channel}`,
      data: channelPermissions[companyId]?.[userId] || []
    });
  } catch (error) {
    console.error('Erreur lors de la révocation de permission:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

module.exports = router;
