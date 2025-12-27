const mongoose = require('mongoose');
const Permission = require('../models/Permission');

const defaultPermissions = [
  // Permissions générales (accessibles à tous les employés)
  {
    name: 'Voir catégorie générale',
    code: 'VIEW_GENERAL_CATEGORY',
    description: 'Accès à la catégorie générale de base',
    module: 'CATEGORIES',
    category: 'GENERALE'
  },
  {
    name: 'Créer factures simples',
    code: 'CREATE_SIMPLE_INVOICE',
    description: 'Créer des factures de base',
    module: 'INVOICING',
    category: 'GENERALE'
  },
  
  // Permissions paperasse
  {
    name: 'Voir catégorie paperasse',
    code: 'VIEW_PAPERASSE_CATEGORY',
    description: 'Accès à la catégorie paperasse',
    module: 'CATEGORIES',
    category: 'PAPERASSE'
  },
  {
    name: 'Gérer documents',
    code: 'MANAGE_DOCUMENTS',
    description: 'Créer, modifier et supprimer des documents',
    module: 'DOCUMENTS',
    category: 'PAPERASSE'
  },
  {
    name: 'Gérer factures avancées',
    code: 'MANAGE_ADVANCED_INVOICES',
    description: 'Créer des factures complexes avec options avancées',
    module: 'INVOICING',
    category: 'PAPERASSE'
  },
  
  // Permissions administration
  {
    name: 'Voir catégorie administration',
    code: 'VIEW_ADMINISTRATION_CATEGORY',
    description: 'Accès à la catégorie administration',
    module: 'CATEGORIES',
    category: 'ADMINISTRATION'
  },
  {
    name: 'Gérer utilisateurs',
    code: 'MANAGE_USERS',
    description: 'Créer, modifier et supprimer des utilisateurs',
    module: 'USERS',
    category: 'ADMINISTRATION'
  },
  {
    name: 'Gérer rôles',
    code: 'MANAGE_ROLES',
    description: 'Créer et modifier des rôles',
    module: 'ROLES',
    category: 'ADMINISTRATION'
  },
  
  // Permissions gestion
  {
    name: 'Voir catégorie gestion',
    code: 'VIEW_GESTION_CATEGORY',
    description: 'Accès à la catégorie gestion',
    module: 'CATEGORIES',
    category: 'GESTION'
  },
  {
    name: 'Voir rapports financiers',
    code: 'VIEW_FINANCIAL_REPORTS',
    description: 'Accès aux rapports et analyses financières',
    module: 'REPORTS',
    category: 'GESTION'
  },
  {
    name: 'Gérer paramètres entreprise',
    code: 'MANAGE_COMPANY_SETTINGS',
    description: 'Modifier les paramètres de l\'entreprise',
    module: 'SETTINGS',
    category: 'GESTION'
  }
];

async function initializePermissions() {
  try {
    console.log('Initialisation des permissions par défaut...');
    
    for (const permData of defaultPermissions) {
      const existingPerm = await Permission.findOne({ code: permData.code });
      
      if (!existingPerm) {
        const permission = new Permission(permData);
        await permission.save();
        console.log(`✓ Permission créée: ${permData.name} (${permData.code})`);
      } else {
        console.log(`- Permission existe déjà: ${permData.name} (${permData.code})`);
      }
    }
    
    console.log('Initialisation des permissions terminée.');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des permissions:', error);
  }
}

module.exports = { initializePermissions, defaultPermissions };
