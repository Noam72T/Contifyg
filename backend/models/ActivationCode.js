const mongoose = require('mongoose');

const activationCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
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
  isUsed: {
    type: Boolean,
    default: false
  },
  usedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  usedAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    required: true
  },
  maxUses: {
    type: Number,
    default: 1
  },
  currentUses: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index optimisés pour les requêtes fréquentes
activationCodeSchema.index({ code: 1 }, { unique: true }); // Index unique sur le code
activationCodeSchema.index({ company: 1, isActive: 1 }); // Index composé pour recherche par entreprise
activationCodeSchema.index({ isUsed: 1, expiresAt: 1 }); // Index composé pour codes valides
activationCodeSchema.index({ expiresAt: 1 }); // Index pour nettoyage automatique
activationCodeSchema.index({ generatedBy: 1 }); // Index sur le générateur
activationCodeSchema.index({ createdAt: 1 }); // Index pour tri par date

// TTL Index pour supprimer automatiquement les codes expirés après 30 jours
activationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 jours

// Méthode pour vérifier si le code est valide
activationCodeSchema.methods.isValid = function() {
  return this.isActive && 
         !this.isUsed && 
         this.expiresAt > new Date() &&
         (this.maxUses === null || this.currentUses < this.maxUses);
};

// Méthode pour marquer le code comme utilisé
activationCodeSchema.methods.markAsUsed = function(userId) {
  this.isUsed = true;
  this.usedBy = userId;
  this.usedAt = new Date();
  this.currentUses += 1;
  return this.save();
};

// Méthode statique pour nettoyer les codes expirés
activationCodeSchema.statics.cleanExpiredCodes = function() {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isUsed: true, usedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } // 7 jours après utilisation
    ]
  });
};

// Méthode statique pour générer un code unique
activationCodeSchema.statics.generateUniqueCode = async function() {
  let code;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (!isUnique && attempts < maxAttempts) {
    code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const existingCode = await this.findOne({ code });
    if (!existingCode) {
      isUnique = true;
    }
    attempts++;
  }
  
  if (!isUnique) {
    throw new Error('Impossible de générer un code unique après plusieurs tentatives');
  }
  
  return code;
};

module.exports = mongoose.model('ActivationCode', activationCodeSchema);