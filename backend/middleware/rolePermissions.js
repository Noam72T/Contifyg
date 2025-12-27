const User = require('../models/User');
const Role = require('../models/Role');

/**
 * Middleware pour vérifier les permissions basées sur les rôles
 * @param {string|Array} requiredPermissions - Permission(s) requise(s)
 * @param {string} requiredCategory - Catégorie requise (optionnel)
 */
const checkRolePermissions = (requiredPermissions, requiredCategory = null) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.userId)
        .populate({
          path: 'companies.role',
          populate: {
            path: 'permissions',
            model: 'Permission'
          }
        });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      // Techniciens ont accès à tout
      if (user.systemRole === 'Technicien') {
        return next();
      }

      // Récupérer toutes les permissions de l'utilisateur
      const userPermissions = new Set();
      const userCategories = new Set();

      for (const company of user.companies) {
        if (company.role && company.role.permissions) {
          for (const permission of company.role.permissions) {
            userPermissions.add(permission.code);
            userCategories.add(permission.category);
          }
        }
      }

      // Vérifier les permissions requises
      const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
      const hasRequiredPermission = permissions.some(perm => userPermissions.has(perm));

      // Vérifier la catégorie si spécifiée
      const hasCategoryAccess = requiredCategory ? userCategories.has(requiredCategory) : true;

      if (!hasRequiredPermission || !hasCategoryAccess) {
        return res.status(403).json({
          success: false,
          message: 'Permissions insuffisantes pour accéder à cette ressource',
          required: permissions,
          category: requiredCategory,
          userPermissions: Array.from(userPermissions),
          userCategories: Array.from(userCategories)
        });
      }

      // Ajouter les permissions utilisateur à la requête pour usage ultérieur
      req.userPermissions = Array.from(userPermissions);
      req.userCategories = Array.from(userCategories);

      next();
    } catch (error) {
      console.error('Erreur dans checkRolePermissions:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la vérification des permissions'
      });
    }
  };
};

/**
 * Middleware pour vérifier l'accès à une catégorie spécifique
 * @param {string} category - Catégorie à vérifier
 */
const checkCategoryAccess = (category) => {
  return checkRolePermissions([`VIEW_${category}_CATEGORY`], category);
};

module.exports = {
  checkRolePermissions,
  checkCategoryAccess
};
