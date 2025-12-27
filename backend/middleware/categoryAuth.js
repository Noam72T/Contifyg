const Permission = require('../models/Permission');
const Role = require('../models/Role');
const User = require('../models/User');

/**
 * Middleware pour vérifier l'accès aux catégories
 * @param {string} category - La catégorie à vérifier (PAPERASSE, ADMINISTRATION, GESTION)
 * @param {string} action - L'action à vérifier (VIEW, MANAGE)
 */
const checkCategoryAccess = (category, action = 'VIEW') => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id)
        .populate({
          path: 'companies.role',
          model: 'Role',
          populate: {
            path: 'permissions',
            model: 'Permission'
          }
        });

      // Obtenir l'entreprise active (à partir des paramètres ou du contexte)
      const companyId = req.params.companyId || req.body.companyId || req.headers['x-company-id'];
      
      if (!companyId) {
        return res.status(400).json({ 
          message: 'ID de l\'entreprise requis',
          code: 'COMPANY_ID_REQUIRED'
        });
      }

      // Trouver l'entreprise de l'utilisateur
      const userCompany = user.companies.find(c => c.company.toString() === companyId);
      
      if (!userCompany) {
        return res.status(403).json({ 
          message: 'Vous n\'appartenez pas à cette entreprise',
          code: 'NOT_COMPANY_MEMBER'
        });
      }

      const role = userCompany.role;
      if (!role || !role.permissions) {
        return res.status(403).json({ 
          message: 'Aucun rôle ou permission défini',
          code: 'NO_ROLE_PERMISSIONS'
        });
      }

      // Construire les codes de permission à vérifier
      const permissionCodes = [];
      
      if (action === 'VIEW') {
        permissionCodes.push(`VIEW_${category}`);
      }
      
      if (action === 'MANAGE') {
        permissionCodes.push(`MANAGE_${category}`);
      }

      // Vérifier si l'utilisateur a au moins une des permissions requises
      const hasPermission = role.permissions.some(permission => 
        permissionCodes.includes(permission.code) || 
        permission.category === category
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          message: `Accès refusé à la catégorie ${category}. Permissions requises: ${permissionCodes.join(' ou ')}`,
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredPermissions: permissionCodes,
          userPermissions: role.permissions.map(p => p.code)
        });
      }

      // Ajouter les informations au request pour utilisation ultérieure
      req.userCompany = userCompany;
      req.userRole = role;
      req.companyId = companyId;

      next();
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions:', error);
      return res.status(500).json({ 
        message: 'Erreur serveur lors de la vérification des permissions',
        error: error.message 
      });
    }
  };
};

/**
 * Vérifier si un utilisateur a accès à une catégorie spécifique
 * @param {string} userId - ID de l'utilisateur
 * @param {string} companyId - ID de l'entreprise
 * @param {string} category - Catégorie à vérifier
 * @param {string} action - Action à vérifier (VIEW, MANAGE)
 * @returns {Promise<boolean>}
 */
const hasUserCategoryAccess = async (userId, companyId, category, action = 'VIEW') => {
  try {
    const user = await User.findById(userId)
      .populate({
        path: 'companies.role',
        model: 'Role',
        populate: {
          path: 'permissions',
          model: 'Permission'
        }
      });

    if (!user) return false;

    const userCompany = user.companies.find(c => c.company.toString() === companyId);
    if (!userCompany || !userCompany.role) return false;

    const role = userCompany.role;
    const permissionCodes = [`${action}_${category}`];

    return role.permissions.some(permission => 
      permissionCodes.includes(permission.code) || 
      permission.category === category
    );
  } catch (error) {
    console.error('Erreur lors de la vérification d\'accès:', error);
    return false;
  }
};

/**
 * Obtenir toutes les catégories accessibles pour un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} companyId - ID de l'entreprise
 * @returns {Promise<Array>}
 */
const getUserAccessibleCategories = async (userId, companyId) => {
  try {
    const user = await User.findById(userId)
      .populate({
        path: 'companies.role',
        model: 'Role',
        populate: {
          path: 'permissions',
          model: 'Permission'
        }
      });

    if (!user) return [];

    const userCompany = user.companies.find(c => c.company.toString() === companyId);
    if (!userCompany || !userCompany.role) return [];

    const role = userCompany.role;
    const categories = new Set();

    // Extraire les catégories des permissions
    role.permissions.forEach(permission => {
      if (permission.category) {
        categories.add(permission.category);
      }
    });

    return Array.from(categories);
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    return [];
  }
};

module.exports = {
  checkCategoryAccess,
  hasUserCategoryAccess,
  getUserAccessibleCategories
};
