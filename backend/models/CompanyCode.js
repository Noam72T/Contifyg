const mongoose = require('mongoose');
const crypto = require('crypto');

const companyCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    minlength: 8,
    maxlength: 12
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  maxUses: {
    type: Number,
    default: null // null = illimité
  },
  currentUses: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date,
    default: null // null = n'expire jamais
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200
  },
  // Historique des utilisations
  usageHistory: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    usedAt: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index pour optimiser les recherches
companyCodeSchema.index({ code: 1 });
companyCodeSchema.index({ company: 1 });
companyCodeSchema.index({ isActive: 1 });
companyCodeSchema.index({ expiresAt: 1 });

// Middleware pour mettre à jour updatedAt
companyCodeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Méthode statique pour générer un code unique
companyCodeSchema.statics.generateUniqueCode = async function() {
  let code;
  let exists = true;
  
  while (exists) {
    // Générer un code de 8 caractères alphanumériques
    code = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    // Vérifier si le code existe déjà
    const existingCode = await this.findOne({ code });
    exists = !!existingCode;
  }
  
  return code;
};

// Méthode pour vérifier si le code est valide
companyCodeSchema.methods.isValid = function() {
  // Vérifier si le code est actif
  if (!this.isActive) {
    return { valid: false, reason: 'Code désactivé' };
  }
  
  // Vérifier l'expiration
  if (this.expiresAt && this.expiresAt < new Date()) {
    return { valid: false, reason: 'Code expiré' };
  }
  
  // Vérifier le nombre d'utilisations
  if (this.maxUses && this.currentUses >= this.maxUses) {
    return { valid: false, reason: 'Nombre maximum d\'utilisations atteint' };
  }
  
  return { valid: true };
};

// Méthode pour utiliser le code
companyCodeSchema.methods.useCode = function(userId, ipAddress = null, userAgent = null) {
  // Vérifier si le code est valide
  const validation = this.isValid();
  if (!validation.valid) {
    throw new Error(validation.reason);
  }
  
  // Ajouter à l'historique
  this.usageHistory.push({
    user: userId,
    usedAt: new Date(),
    ipAddress,
    userAgent
  });
  
  // Incrémenter le compteur d'utilisations
  this.currentUses += 1;
  
  // Désactiver automatiquement si le maximum est atteint
  if (this.maxUses && this.currentUses >= this.maxUses) {
    this.isActive = false;
  }
  
  return this.save();
};

// Méthode pour obtenir les statistiques d'utilisation
companyCodeSchema.methods.getUsageStats = function() {
  return {
    totalUses: this.currentUses,
    maxUses: this.maxUses,
    remainingUses: this.maxUses ? Math.max(0, this.maxUses - this.currentUses) : null,
    isActive: this.isActive,
    isExpired: this.expiresAt ? this.expiresAt < new Date() : false,
    createdAt: this.createdAt,
    lastUsed: this.usageHistory.length > 0 ? 
      this.usageHistory[this.usageHistory.length - 1].usedAt : null
  };
};

// Méthode statique pour nettoyer les codes expirés
companyCodeSchema.statics.cleanupExpiredCodes = async function() {
  const result = await this.updateMany(
    { 
      expiresAt: { $lt: new Date() },
      isActive: true 
    },
    { 
      isActive: false 
    }
  );
  
  return result.modifiedCount;
};

// Méthode statique pour trouver les codes d'une entreprise
companyCodeSchema.statics.findByCompany = function(companyId, activeOnly = true) {
  const query = { company: companyId };
  if (activeOnly) {
    query.isActive = true;
    query.$or = [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ];
  }
  
  return this.find(query)
    .populate('generatedBy', 'username email firstName lastName')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('CompanyCode', companyCodeSchema);
