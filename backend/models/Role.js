const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom du rôle est requis'],
    trim: true,
    maxlength: [50, 'Le nom du rôle ne peut pas dépasser 50 caractères']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'La description ne peut pas dépasser 200 caractères'],
    default: ''
  },
  normeSalariale: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  limiteSalaire: {
    type: Number,
    default: 0
  },
  typeContrat: {
    type: String,
    enum: ['DIRECTION', 'CDI', 'CDD', 'STAGIAIRE'],
    required: true,
    default: 'CDI'
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission'
  }],
  customPermissions: {
    type: Map,
    of: Boolean,
    default: new Map()
  },
  actif: {
    type: Boolean,
    default: true
  },
  creePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dateCreation: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Méthode pour obtenir toutes les permissions effectives du rôle
roleSchema.methods.getEffectivePermissions = async function() {
  try {
    await this.populate('permissions');
    
    const effectivePermissions = new Set();
    
    // Ajouter les permissions de base du rôle
    if (this.permissions && Array.isArray(this.permissions)) {
      this.permissions.forEach(permission => {
        if (permission && permission.code) {
          effectivePermissions.add(permission.code);
        }
      });
    }
    
    // Appliquer les permissions personnalisées
    if (this.customPermissions && typeof this.customPermissions.forEach === 'function') {
      for (const [permCode, hasPermission] of this.customPermissions) {
        if (hasPermission) {
          effectivePermissions.add(permCode);
        } else {
          effectivePermissions.delete(permCode);
        }
      }
    }
    
    return Array.from(effectivePermissions);
  } catch (error) {
    console.error('Erreur dans getEffectivePermissions:', error);
    return [];
  }
};

// Méthode pour vérifier une permission spécifique
roleSchema.methods.hasPermission = async function(permissionCode) {
  const permissions = await this.getEffectivePermissions();
  return permissions.includes(permissionCode);
};

// Méthode pour définir une permission personnalisée
roleSchema.methods.setCustomPermission = function(permissionCode, hasPermission) {
  this.customPermissions.set(permissionCode, hasPermission);
  return this.save();
};

// Index optimisés pour les recherches et gros volumes
roleSchema.index({ company: 1, actif: 1 }); // Index composé entreprise + statut
roleSchema.index({ company: 1, typeContrat: 1 }); // Index composé entreprise + type contrat
roleSchema.index({ company: 1, isDefault: 1 }); // Index composé entreprise + défaut
roleSchema.index({ nom: 1, company: 1 }); // Index pour recherche par nom
roleSchema.index({ creePar: 1 }); // Index sur créateur
roleSchema.index({ dateCreation: 1 }); // Index pour tri par date
roleSchema.index({ normeSalariale: 1 }); // Index pour tri par norme salariale

module.exports = mongoose.model('Role', roleSchema);
