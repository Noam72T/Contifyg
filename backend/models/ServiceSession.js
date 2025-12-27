const mongoose = require('mongoose');

const serviceSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date,
    default: null
  },
  duration: {
    type: Number, // Durée en minutes
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index pour recherche rapide
serviceSessionSchema.index({ user: 1, company: 1, isActive: 1 });
serviceSessionSchema.index({ company: 1, isActive: 1 });

// Méthode pour terminer une session
serviceSessionSchema.methods.endSession = function() {
  this.endTime = new Date();
  this.isActive = false;
  this.duration = Math.round((this.endTime - this.startTime) / 1000 / 60); // Durée en minutes
  return this.save();
};

// Méthode statique pour obtenir la session active d'un utilisateur
serviceSessionSchema.statics.getActiveSession = async function(userId, companyId) {
  return this.findOne({
    user: userId,
    company: companyId,
    isActive: true
  }).populate('user', 'firstName lastName username');
};

// Méthode statique pour obtenir toutes les sessions actives d'une entreprise
serviceSessionSchema.statics.getActiveSessions = async function(companyId) {
  return this.find({
    company: companyId,
    isActive: true
  })
  .populate('user', 'firstName lastName username email')
  .sort({ startTime: -1 });
};

module.exports = mongoose.model('ServiceSession', serviceSessionSchema);
