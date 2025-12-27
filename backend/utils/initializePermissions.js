const Permission = require('../models/Permission');

// Permissions par défaut à créer pour chaque nouvelle entreprise
const defaultPermissions = [
  // ===== CATÉGORIE GENERALE =====
  {
    name: 'Voir la catégorie générale',
    code: 'VIEW_GENERALE_CATEGORY',
    description: 'Accès à la catégorie générale',
    module: 'Général',
    category: 'GENERALE'
  },
  {
    name: 'Supprimer ou modifier les historiques de ventes',
    code: 'MANAGE_VENTES_HISTORY',
    description: 'Supprimer ou modifier les historiques de ventes',
    module: 'Ventes',
    category: 'GENERALE'
  },
  {
    name: 'Créer des catégories de prestations',
    code: 'CREATE_PRESTATION_CATEGORIES',
    description: 'Créer des catégories de prestations',
    module: 'Prestations',
    category: 'GENERALE'
  },

  // ===== CATÉGORIE PAPERASSE =====
  {
    name: 'Voir la catégorie paperasse',
    code: 'VIEW_PAPERASSE_CATEGORY',
    description: 'Accès à la catégorie paperasse',
    module: 'Paperasse',
    category: 'PAPERASSE'
  },
  {
    name: 'Accès au bilan',
    code: 'ACCESS_BILAN',
    description: 'Accès aux bilans financiers',
    module: 'Bilan',
    category: 'PAPERASSE'
  },
  {
    name: 'Accès aux charges',
    code: 'ACCESS_CHARGES',
    description: 'Accès aux charges',
    module: 'Charges',
    category: 'PAPERASSE'
  },
  {
    name: 'Créer ou supprimer des charges',
    code: 'MANAGE_CHARGES',
    description: 'Créer ou supprimer des charges',
    module: 'Charges',
    category: 'PAPERASSE'
  },
  {
    name: 'Voir les factures',
    code: 'VIEW_FACTURES',
    description: 'Voir les factures',
    module: 'Factures',
    category: 'PAPERASSE'
  },
  {
    name: 'Créer des factures',
    code: 'CREATE_FACTURES',
    description: 'Créer des factures',
    module: 'Factures',
    category: 'PAPERASSE'
  },

  // ===== CATÉGORIE ADMINISTRATION =====
  {
    name: 'Voir la catégorie administration',
    code: 'VIEW_ADMINISTRATION_CATEGORY',
    description: 'Accès à la catégorie administration',
    module: 'Administration',
    category: 'ADMINISTRATION'
  },
  {
    name: 'Modifier ou licencier un employé',
    code: 'MANAGE_EMPLOYES',
    description: 'Modifier ou licencier un employé',
    module: 'Employés',
    category: 'ADMINISTRATION'
  },
  {
    name: 'Attribuer des rôles aux employés',
    code: 'ASSIGN_EMPLOYEE_ROLES',
    description: 'Attribuer ou modifier les rôles des employés',
    module: 'Employés',
    category: 'ADMINISTRATION'
  },
  {
    name: 'Générer un code employé',
    code: 'GENERATE_EMPLOYEE_CODE',
    description: 'Générer un code employé',
    module: 'Employés',
    category: 'ADMINISTRATION'
  },
  {
    name: 'Supprimer ou modifier une vente',
    code: 'MANAGE_VENTES',
    description: 'Supprimer ou modifier une vente',
    module: 'Ventes',
    category: 'ADMINISTRATION'
  },
  {
    name: 'Supprimer ou modifier un salaire',
    code: 'MANAGE_SALAIRES',
    description: 'Supprimer ou modifier un salaire',
    module: 'Salaires',
    category: 'ADMINISTRATION'
  },
  {
    name: 'Supprimer une facture',
    code: 'DELETE_FACTURES',
    description: 'Supprimer une facture',
    module: 'Factures',
    category: 'ADMINISTRATION'
  },
  {
    name: 'Supprimer des sessions timer',
    code: 'DELETE_TIMERS',
    description: 'Supprimer des sessions timer dans l\'historique',
    module: 'Timers',
    category: 'ADMINISTRATION'
  },
  {
    name: 'Gérer les sessions de service',
    code: 'MANAGE_SERVICE_SESSIONS',
    description: 'Modifier ou supprimer les sessions de service des employés',
    module: 'Services',
    category: 'ADMINISTRATION'
  },

  // ===== CATÉGORIE GESTION =====
  {
    name: 'Voir la catégorie gestion',
    code: 'VIEW_GESTION_CATEGORY',
    description: 'Accès à la catégorie gestion',
    module: 'Gestion',
    category: 'GESTION'
  },
  {
    name: 'Gérer les rôles',
    code: 'MANAGE_ROLES',
    description: 'Gérer les rôles',
    module: 'Rôles',
    category: 'GESTION'
  },
  {
    name: 'Gérer les items',
    code: 'MANAGE_ITEMS',
    description: 'Gérer les items',
    module: 'Items',
    category: 'GESTION'
  },
  {
    name: 'Gérer les partenariats',
    code: 'MANAGE_PARTNERSHIPS',
    description: 'Gérer les partenariats',
    module: 'Partenariats',
    category: 'GESTION'
  },
  {
    name: 'Gérer le stock',
    code: 'MANAGE_STOCK',
    description: 'Gérer le stock',
    module: 'Stock',
    category: 'GESTION'
  },
  {
    name: 'Gérer l\'entreprise',
    code: 'MANAGE_COMPANY',
    description: 'Gérer l\'entreprise',
    module: 'Entreprise',
    category: 'GESTION'
  }
];

/**
 * Initialise les permissions par défaut dans la base de données
 * Cette fonction est appelée une seule fois au démarrage de l'application
 */
async function initializeDefaultPermissions() {
  try {
    console.log('🔐 Initialisation des permissions par défaut...');
    
    for (const permData of defaultPermissions) {
      const existingPerm = await Permission.findOne({ code: permData.code });
      
      if (!existingPerm) {
        const permission = new Permission(permData);
        await permission.save();
        console.log(`✓ Permission créée: ${permData.name} (${permData.code})`);
      }
    }
    
    console.log('✅ Permissions par défaut initialisées');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation des permissions:', error);
  }
}

/**
 * Assigne toutes les permissions par défaut à un rôle Admin
 * @param {ObjectId} roleId - ID du rôle Admin
 */
async function assignAllPermissionsToAdminRole(roleId) {
  try {
    console.log('🔐 Assignation des permissions au rôle Admin...');
    
    // Récupérer toutes les permissions
    const allPermissions = await Permission.find({});
    const permissionIds = allPermissions.map(p => p._id);
    
    // Mettre à jour le rôle avec toutes les permissions
    const Role = require('../models/Role');
    await Role.findByIdAndUpdate(roleId, {
      permissions: permissionIds
    });
    
    console.log(`✅ ${permissionIds.length} permissions assignées au rôle Admin`);
    return permissionIds;
  } catch (error) {
    console.error('❌ Erreur lors de l\'assignation des permissions:', error);
    return [];
  }
}

/**
 * Crée les permissions de base pour un rôle Employé
 * @param {ObjectId} roleId - ID du rôle Employé
 */
async function assignBasicPermissionsToEmployeeRole(roleId) {
  try {
    console.log('🔐 Assignation des permissions de base au rôle Employé...');
    
    // Permissions de base pour un employé
    const basicPermissionCodes = [
      'VIEW_GENERALE_CATEGORY',
      'VIEW_PAPERASSE_CATEGORY',
      'VIEW_FACTURES',
      'CREATE_FACTURES'
    ];
    
    // Récupérer les permissions correspondantes
    const basicPermissions = await Permission.find({
      code: { $in: basicPermissionCodes }
    });
    
    const permissionIds = basicPermissions.map(p => p._id);
    
    // Mettre à jour le rôle avec les permissions de base
    const Role = require('../models/Role');
    await Role.findByIdAndUpdate(roleId, {
      permissions: permissionIds
    });
    
    console.log(`✅ ${permissionIds.length} permissions de base assignées au rôle Employé`);
    return permissionIds;
  } catch (error) {
    console.error('❌ Erreur lors de l\'assignation des permissions de base:', error);
    return [];
  }
}

module.exports = {
  initializeDefaultPermissions,
  assignAllPermissionsToAdminRole,
  assignBasicPermissionsToEmployeeRole,
  defaultPermissions
};
