const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    trim: true
  },
  marque: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  modele: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  plaque: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  couleur: {
    type: String,
    trim: true
  },
  annee: {
    type: Number,
    min: 1900,
    max: new Date().getFullYear() + 1
  },
  image: {
    type: String, // URL ou base64 de l'image
    default: null
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
  proprietaire: {
    nom: String,
    telephone: String,
    email: String
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  creePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Statistiques d'utilisation
  stats: {
    totalSessions: {
      type: Number,
      default: 0
    },
    totalMinutes: {
      type: Number,
      default: 0
    },
    totalRevenu: {
      type: Number,
      default: 0
    },
    dernierUtilisation: {
      type: Date,
      default: null
    }
  }
}, {
  timestamps: true
});

// Index pour optimiser les requêtes
vehicleSchema.index({ company: 1, isActive: 1 });
vehicleSchema.index({ plaque: 1, company: 1 }, { unique: true });

// Méthode pour calculer le coût d'une session
vehicleSchema.methods.calculerCoutSession = function(dureeMinutes) {
  return this.tarifParMinute * dureeMinutes;
};

// Méthode pour mettre à jour les statistiques
vehicleSchema.methods.mettreAJourStats = function(dureeMinutes, cout) {
  this.stats.totalSessions += 1;
  this.stats.totalMinutes += dureeMinutes;
  this.stats.totalRevenu += cout;
  this.stats.dernierUtilisation = new Date();
  return this.save();
};

// Méthode pour obtenir le nom complet du véhicule
vehicleSchema.methods.getNomComplet = function() {
  return `${this.nom} (${this.plaque})`;
};

// Méthode pour obtenir les informations publiques
vehicleSchema.methods.toPublicJSON = function() {
  return {
    _id: this._id,
    nom: this.nom,
    marque: this.marque,
    modele: this.modele,
    plaque: this.plaque,
    couleur: this.couleur,
    annee: this.annee,
    image: this.image,
    description: this.description,
    tarifParMinute: this.tarifParMinute,
    proprietaire: this.proprietaire,
    stats: this.stats,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('Vehicle', vehicleSchema);
