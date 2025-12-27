const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom de l\'entreprise est requis'],
    trim: true,
    maxlength: [100, 'Le nom de l\'entreprise ne peut pas dépasser 100 caractères']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  },
  category: {
    type: String,
    required: [true, 'La catégorie de l\'entreprise est requise'],
    enum: ['Restaurant', 'Commerce', 'Service', 'Industrie', 'Technologie', 'Autre'],
    default: 'Autre'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Le propriétaire de l\'entreprise est requis']
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // Nouvelles informations de l'entreprise
  logo: {
    type: String,
    default: ''
  },
  pdg: {
    type: String,
    trim: true,
    maxlength: [100, 'Le nom du PDG ne peut pas dépasser 100 caractères']
  },
  compteBancaire: {
    type: String,
    trim: true,
    maxlength: [50, 'Le numéro de compte ne peut pas dépasser 50 caractères']
  },
  nombreEmployes: {
    type: Number,
    default: 0,
    min: [0, 'Le nombre d\'employés ne peut pas être négatif']
  },
  // Répartition des taxes (pourcentages)
  taxDistribution: {
    primes: {
      type: Number,
      default: 10,
      min: 0,
      max: 100
    },
    dividendes: {
      type: Number,
      default: 30,
      min: 0,
      max: 100
    },
    tresorerie: {
      type: Number,
      default: 60,
      min: 0,
      max: 100
    },
    ville: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  // Pourcentage d'impôt sur les bénéfices
  tauxImpot: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // Configuration API GLife
  apiMode: {
    type: Boolean,
    default: false,
    description: 'Si true, utilise l\'API GLife au lieu de la gestion manuelle'
  },
  glifeCompanyId: {
    type: Number,
    default: null,
    description: 'ID de l\'entreprise sur GLife pour récupérer les données via API'
  },
  apiEndpoints: {
    productions: {
      type: String,
      default: 'https://api.glife.fr/roleplay/company/productions'
    },
    invoices: {
      type: String,
      default: 'https://api.glife.fr/roleplay/company/invoices'
    },
    orgInvoices: {
      type: String,
      default: 'https://api.glife.fr/roleplay/org/invoices'
    }
  },
  // Paliers d'imposition progressifs
  taxBrackets: [{
    min: {
      type: Number,
      required: true,
      min: 0
    },
    max: {
      type: Number,
      default: null
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    }
  }],
  // Permissions personnalisées créées par l'entreprise
  customPermissions: [{
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    display: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Catégories personnalisées
  customCategories: [{
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    display: {
      type: String,
      required: true
    },
    color: {
      type: String,
      default: '#6B7280'
    },
    icon: {
      type: String,
      default: 'folder'
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  // Configuration des permissions par niveau (1-10)
  permissionLevels: {
    type: Map,
    of: {
      permissions: [String] // IDs des permissions personnalisées
    },
    default: function() {
      return new Map([
        ['1', { permissions: [] }],
        ['2', { permissions: [] }],
        ['3', { permissions: [] }],
        ['4', { permissions: [] }],
        ['5', { permissions: [] }],
        ['6', { permissions: [] }],
        ['7', { permissions: [] }],
        ['8', { permissions: [] }],
        ['9', { permissions: [] }],
        ['10', { permissions: [] }]
      ]);
    }
  },
  // Configuration des pages visibles dans le menu
  visiblePages: {
    type: [String],
    default: function() {
      // Par défaut, toutes les pages sont visibles
      return [
        '/dashboard',
        '/prestations',
        '/timers',
        '/timer-history',
        '/ventes',
        '/bilan',
        '/charges',
        '/factures',
        '/employes',
        '/historique-employes',
        '/liste-ventes',
        '/salaires',
        '/service-monitoring',
        '/liste-factures',
        '/gestion-roles',
        '/gestion-items',
        '/gestion-partenariats',
        '/gestion-stock',
        '/gestion-entreprise'
      ];
    }
  }
});

// Middleware pour mettre à jour updatedAt
companySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Méthode pour obtenir les permissions d'un niveau
companySchema.methods.getPermissionsForLevel = function(level) {
  if (level === 0 || !level) {
    return [];
  }
  
  const levelConfig = this.permissionLevels.get(level.toString());
  if (!levelConfig) return [];
  
  // Retourner les objets permissions complets basés sur les IDs
  return levelConfig.permissions.map(permId => {
    return this.customPermissions.find(p => p.id === permId);
  }).filter(Boolean); // Enlever les undefined
};

// Méthode pour mettre à jour les permissions d'un niveau
companySchema.methods.updatePermissionsForLevel = function(level, permissionIds) {
  this.permissionLevels.set(level.toString(), { permissions: permissionIds });
  return this.save();
};

// Méthode pour créer une permission personnalisée
companySchema.methods.createCustomPermission = function(permissionData) {
  const newPermission = {
    id: permissionData.id || `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: permissionData.name,
    display: permissionData.display,
    description: permissionData.description || '',
    category: permissionData.category
  };
  
  this.customPermissions.push(newPermission);
  return this.save();
};

// Méthode pour supprimer une permission personnalisée
companySchema.methods.deleteCustomPermission = function(permissionId) {
  // Supprimer la permission
  this.customPermissions = this.customPermissions.filter(p => p.id !== permissionId);
  
  // Supprimer de tous les niveaux
  for (let level = 1; level <= 10; level++) {
    const levelConfig = this.permissionLevels.get(level.toString());
    if (levelConfig) {
      levelConfig.permissions = levelConfig.permissions.filter(id => id !== permissionId);
      this.permissionLevels.set(level.toString(), levelConfig);
    }
  }
  
  return this.save();
};

// Méthode pour créer une catégorie personnalisée
companySchema.methods.createCustomCategory = function(categoryData) {
  const newCategory = {
    id: categoryData.id || `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: categoryData.name,
    display: categoryData.display,
    color: categoryData.color || '#6B7280',
    icon: categoryData.icon || 'folder',
    order: categoryData.order || this.customCategories.length
  };
  
  this.customCategories.push(newCategory);
  return this.save();
};

// Méthode pour supprimer une catégorie personnalisée
companySchema.methods.deleteCustomCategory = function(categoryId) {
  // Supprimer la catégorie
  this.customCategories = this.customCategories.filter(c => c.id !== categoryId);
  
  // Déplacer les permissions vers "Autre" ou supprimer selon la stratégie
  this.customPermissions.forEach(permission => {
    if (permission.category === categoryId) {
      permission.category = 'general'; // Catégorie par défaut
    }
  });
  
  return this.save();
};

// Méthode pour obtenir toutes les permissions disponibles groupées par catégorie
companySchema.methods.getPermissionsByCategory = function() {
  const grouped = {};
  
  // Initialiser avec les catégories personnalisées
  this.customCategories.forEach(category => {
    grouped[category.id] = {
      category: category,
      permissions: []
    };
  });
  
  // Ajouter une catégorie générale si elle n'existe pas
  if (!grouped['general']) {
    grouped['general'] = {
      category: { id: 'general', name: 'general', display: 'Général', color: '#6B7280', icon: 'folder' },
      permissions: []
    };
  }
  
  // Grouper les permissions
  this.customPermissions.forEach(permission => {
    const categoryId = permission.category || 'general';
    if (!grouped[categoryId]) {
      grouped[categoryId] = {
        category: { id: categoryId, name: categoryId, display: categoryId, color: '#6B7280', icon: 'folder' },
        permissions: []
      };
    }
    grouped[categoryId].permissions.push(permission);
  });
  
  return grouped;
};

// Méthode pour initialiser les permissions par défaut lors de la création d'entreprise
companySchema.methods.initializeDefaultPermissions = function() {
  // Créer quelques catégories de base
  const defaultCategories = [
    { id: 'general', name: 'general', display: 'Général', color: '#6B7280', icon: 'user' },
    { id: 'administration', name: 'administration', display: 'Administration', color: '#DC2626', icon: 'shield' },
    { id: 'comptabilite', name: 'comptabilite', display: 'Comptabilité', color: '#059669', icon: 'calculator' },
    { id: 'gestion', name: 'gestion', display: 'Gestion', color: '#2563EB', icon: 'settings' }
  ];
  
  this.customCategories = defaultCategories;
  
  // Créer quelques permissions de base
  const defaultPermissions = [
    { id: 'view_own_data', name: 'view_own_data', display: 'Voir ses propres données', category: 'general', description: 'Permet de voir ses propres informations' },
    { id: 'edit_own_profile', name: 'edit_own_profile', display: 'Modifier son profil', category: 'general', description: 'Permet de modifier son profil utilisateur' }
  ];
  
  this.customPermissions = defaultPermissions;
  
  // Donner les permissions de base au niveau 1
  this.permissionLevels.set('1', { permissions: ['view_own_data', 'edit_own_profile'] });
  
  return this.save();
};

// Index optimisés pour les recherches et gros volumes
companySchema.index({ owner: 1 }); // Index sur propriétaire
companySchema.index({ 'members.user': 1 }); // Index sur membres (array)
companySchema.index({ isActive: 1, category: 1 }); // Index composé statut + catégorie
companySchema.index({ name: 1 }); // Index sur nom pour recherche
companySchema.index({ createdAt: 1 }); // Index pour tri par date
companySchema.index({ 'members.user': 1, 'members.role': 1 }); // Index composé sur membres

module.exports = mongoose.model('Company', companySchema);
