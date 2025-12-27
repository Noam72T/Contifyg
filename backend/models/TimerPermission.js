const mongoose = require('mongoose');

const timerPermissionSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    unique: true // Une seule permission par entreprise
  },
  isAuthorized: {
    type: Boolean,
    default: false
  },
  authorizedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() { return this.isAuthorized; }
  },
  authorizedAt: {
    type: Date,
    default: function() { return this.isAuthorized ? new Date() : null; }
  },
  features: {
    canCreateVehicles: {
      type: Boolean,
      default: true
    },
    canUseTimers: {
      type: Boolean,
      default: true
    },
    autoCreateSales: {
      type: Boolean,
      default: true // Créer automatiquement les ventes
    },
    maxVehicles: {
      type: Number,
      default: 10 // Limite de véhicules
    }
  },
  restrictions: {
    maxSessionDuration: {
      type: Number,
      default: 480 // 8 heures en minutes
    },
    requireApproval: {
      type: Boolean,
      default: false // Nécessite approbation pour les grosses factures
    },
    approvalThreshold: {
      type: Number,
      default: 1000 // Seuil en $ pour approbation
    }
  },
  statistics: {
    totalSessions: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    lastUsed: {
      type: Date,
      default: null
    }
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index pour optimiser les requêtes
timerPermissionSchema.index({ company: 1 });
timerPermissionSchema.index({ isAuthorized: 1 });
timerPermissionSchema.index({ authorizedBy: 1 });

// Méthode pour vérifier si une entreprise est autorisée
timerPermissionSchema.statics.isCompanyAuthorized = async function(companyId) {
  const permission = await this.findOne({ company: companyId, isAuthorized: true });
  return !!permission;
};

// Méthode pour obtenir les permissions d'une entreprise
timerPermissionSchema.statics.getCompanyPermissions = async function(companyId) {
  return await this.findOne({ company: companyId });
};

// Méthode pour autoriser une entreprise
timerPermissionSchema.methods.authorize = function(technicianId, features = {}) {
  this.isAuthorized = true;
  this.authorizedBy = technicianId;
  this.authorizedAt = new Date();
  
  // Appliquer les fonctionnalités personnalisées
  if (features.canCreateVehicles !== undefined) this.features.canCreateVehicles = features.canCreateVehicles;
  if (features.canUseTimers !== undefined) this.features.canUseTimers = features.canUseTimers;
  if (features.autoCreateSales !== undefined) this.features.autoCreateSales = features.autoCreateSales;
  if (features.maxVehicles !== undefined) this.features.maxVehicles = features.maxVehicles;
  
  return this.save();
};

// Méthode pour révoquer l'autorisation
timerPermissionSchema.methods.revoke = function() {
  this.isAuthorized = false;
  this.authorizedBy = null;
  this.authorizedAt = null;
  return this.save();
};

// Méthode pour mettre à jour les statistiques
timerPermissionSchema.methods.updateStats = function(sessionCount = 1, revenue = 0) {
  this.statistics.totalSessions += sessionCount;
  this.statistics.totalRevenue += revenue;
  this.statistics.lastUsed = new Date();
  return this.save();
};

module.exports = mongoose.model('TimerPermission', timerPermissionSchema);
