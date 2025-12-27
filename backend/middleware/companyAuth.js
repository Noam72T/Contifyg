const User = require('../models/User');

// Middleware pour vérifier que l'utilisateur est assigné à une entreprise via un code valide
const requireCompanyValidation = async (req, res, next) => {
  try {
    // Vérifier si l'utilisateur est authentifié (ce middleware doit être utilisé après auth)
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    // Récupérer l'utilisateur avec ses informations d'entreprise
    const user = await User.findById(req.user.id).populate('company');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier si l'utilisateur est validé par code d'entreprise
    if (!user.isCompanyValidated) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé: vous devez être assigné à une entreprise via un code valide',
        requiresCompanyCode: true
      });
    }

    // Vérifier si l'utilisateur a une entreprise assignée
    if (!user.company) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé: aucune entreprise assignée',
        requiresCompanyCode: true
      });
    }

    // Vérifier si l'entreprise est active
    if (!user.company.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé: entreprise désactivée'
      });
    }

    // Ajouter les informations de l'entreprise à la requête pour les routes suivantes
    req.company = user.company;
    req.user.companyId = user.company._id;
    req.user.isCompanyValidated = user.isCompanyValidated;

    next();
  } catch (error) {
    console.error('Erreur dans le middleware companyAuth:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la vérification de l\'entreprise'
    });
  }
};

// Middleware pour vérifier que l'utilisateur est propriétaire de l'entreprise
const requireCompanyOwnership = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id || !req.company) {
      return res.status(401).json({
        success: false,
        message: 'Authentification et assignation à une entreprise requises'
      });
    }

    // Vérifier si l'utilisateur est le propriétaire de l'entreprise
    if (req.company.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé: seuls les propriétaires d\'entreprise peuvent effectuer cette action'
      });
    }

    next();
  } catch (error) {
    console.error('Erreur dans le middleware requireCompanyOwnership:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la vérification des droits de propriété'
    });
  }
};

// Middleware pour vérifier qu'un utilisateur appartient à la même entreprise
const requireSameCompany = (userIdField = 'userId') => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id || !req.company) {
        return res.status(401).json({
          success: false,
          message: 'Authentification et assignation à une entreprise requises'
        });
      }

      // Récupérer l'ID de l'utilisateur cible depuis les paramètres ou le body
      const targetUserId = req.params[userIdField] || req.body[userIdField];
      
      if (!targetUserId) {
        return res.status(400).json({
          success: false,
          message: `ID utilisateur requis dans ${userIdField}`
        });
      }

      // Vérifier que l'utilisateur cible appartient à la même entreprise
      const targetUser = await User.findById(targetUserId);
      
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur cible non trouvé'
        });
      }

      if (targetUser.company.toString() !== req.company._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Accès refusé: l\'utilisateur ne fait pas partie de votre entreprise'
        });
      }

      req.targetUser = targetUser;
      next();
    } catch (error) {
      console.error('Erreur dans le middleware requireSameCompany:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la vérification de l\'entreprise'
      });
    }
  };
};

// Middleware pour vérifier le niveau de rôle minimum
const requireMinimumRole = (minimumLevel) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentification requise'
        });
      }

      const user = await User.findById(req.user.id).populate('role');
      
      if (!user || !user.role) {
        return res.status(403).json({
          success: false,
          message: 'Aucun rôle assigné'
        });
      }

      if (user.role.niveau < minimumLevel) {
        return res.status(403).json({
          success: false,
          message: `Niveau de rôle insuffisant. Niveau ${minimumLevel} requis, vous avez le niveau ${user.role.niveau}`
        });
      }

      req.user.roleLevel = user.role.niveau;
      next();
    } catch (error) {
      console.error('Erreur dans le middleware requireMinimumRole:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la vérification du rôle'
      });
    }
  };
};

module.exports = {
  requireCompanyValidation,
  requireCompanyOwnership,
  requireSameCompany,
  requireMinimumRole
};
