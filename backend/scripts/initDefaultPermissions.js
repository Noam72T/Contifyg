const mongoose = require('mongoose');
const Permission = require('../models/Permission');
require('dotenv').config();

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

async function initPermissions() {
  try {
    // Se connecter à MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/compta');
    console.log('Connexion à MongoDB réussie');

    // Supprimer toutes les permissions existantes
    await Permission.deleteMany({});
    console.log('Permissions existantes supprimées');

    // Créer les nouvelles permissions
    for (const permData of defaultPermissions) {
      const permission = new Permission(permData);
      await permission.save();
      console.log(`Permission créée: ${permission.name}`);
    }

    console.log('Toutes les permissions ont été créées avec succès');
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de la création des permissions:', error);
    process.exit(1);
  }
}

// Exécuter le script seulement s'il est appelé directement
if (require.main === module) {
  initPermissions();
}

module.exports = { defaultPermissions };
