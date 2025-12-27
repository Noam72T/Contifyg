const mongoose = require('mongoose');

const timerPrestationSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  tarifParMinute: {
    type: Number,
    required: true,
    min: 0
  },
  couleur: {
    type: String,
    default: '#3b82f6'
  },
  icone: {
    type: String,
    default: 'Timer'
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  ordre: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index pour optimiser les requêtes par entreprise
timerPrestationSchema.index({ company: 1, isActive: 1 });

// Méthode pour calculer le coût basé sur la durée
timerPrestationSchema.methods.calculerCout = function(dureeEnMinutes, quantite = 1) {
  return this.tarifParMinute * dureeEnMinutes * quantite;
};

module.exports = mongoose.model('TimerPrestation', timerPrestationSchema);
