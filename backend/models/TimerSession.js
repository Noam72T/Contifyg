const mongoose = require('mongoose');

const timerSessionSchema = new mongoose.Schema({
  timerPrestation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimerPrestation',
    required: false // Optionnel pour support véhicules
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: false // Nouveau champ pour véhicules
  },
  vehiculePlaque: {
    type: String,
    trim: true
  },
  vehiculeInfo: {
    model: String,
    name: String,
    owner: {
      name: String,
      type: Number
    }
  },
  heureDebut: {
    type: Date,
    required: true
  },
  heureFin: {
    type: Date
  },
  dureeMinutes: {
    type: Number,
    default: 0
  },
  coutCalcule: {
    type: Number,
    default: 0
  },
  statut: {
    type: String,
    enum: ['en_cours', 'termine', 'pause', 'annule'],
    default: 'en_cours'
  },
  utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  partenariat: {
    type: String,
    default: 'Aucun partenaire'
  },
  notes: {
    type: String,
    trim: true
  },
  pausesTotales: {
    type: Number,
    default: 0 // En minutes
  },
  historiqueActions: [{
    action: {
      type: String,
      enum: ['start', 'pause', 'resume', 'stop', 'cancel']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String
  }]
}, {
  timestamps: true
});

// Index pour optimiser les requêtes
timerSessionSchema.index({ company: 1, statut: 1 });
timerSessionSchema.index({ utilisateur: 1, statut: 1 });
timerSessionSchema.index({ timerPrestation: 1 });
timerSessionSchema.index({ vehicle: 1 });

// Méthode pour calculer la durée effective (sans les pauses)
timerSessionSchema.methods.calculerDureeEffective = function() {
  if (!this.heureFin || !this.heureDebut) return 0;
  
  const dureeTotal = Math.floor((this.heureFin - this.heureDebut) / (1000 * 60)); // en minutes
  return Math.max(0, dureeTotal - this.pausesTotales);
};

// Méthode pour mettre à jour le coût
timerSessionSchema.methods.mettreAJourCout = async function() {
  this.dureeMinutes = this.calculerDureeEffective();
  
  if (this.vehicle) {
    // Nouveau mode avec véhicules
    await this.populate('vehicle');
    this.coutCalcule = this.vehicle.calculerCoutSession(this.dureeMinutes);
  } else if (this.timerPrestation) {
    // Ancien mode avec prestations timer
    await this.populate('timerPrestation');
    this.coutCalcule = this.timerPrestation.calculerCout(this.dureeMinutes);
  }
  
  return this.save();
};

// Méthode pour terminer la session
timerSessionSchema.methods.terminer = async function() {
  this.heureFin = new Date();
  this.statut = 'termine';
  this.historiqueActions.push({
    action: 'stop',
    timestamp: new Date()
  });
  return this.mettreAJourCout();
};

module.exports = mongoose.model('TimerSession', timerSessionSchema);
