const mongoose = require('mongoose');

const partenaritSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    trim: true
  },
  entreprisePartenaire: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  statut: {
    type: String,
    enum: ['actif', 'inactif', 'suspendu'],
    default: 'actif'
  },
  creePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dateCreation: {
    type: Date,
    default: Date.now
  },
  dateModification: {
    type: Date,
    default: Date.now
  },
  categoriesVisibles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PrestationCategory',
    required: true
  }],
  webhookDiscord: {
    type: String,
    required: false,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optionnel
        return /^https:\/\/discord(app)?\.com\/api\/webhooks\//.test(v);
      },
      message: 'Le webhook Discord doit être une URL valide Discord'
    }
  },
  gainsParSemaine: [{
    semaine: {
      type: Number, // Numéro de semaine (37, 38, etc.)
      required: true
    },
    montant: {
      type: Number,
      default: 0
    },
    dateCreation: {
      type: Date,
      default: Date.now
    }
  }],
  semaineActuelle: {
    type: Number,
    required: false
  }
}, {
  timestamps: true
});

// Index pour optimiser les requêtes
partenaritSchema.index({ company: 1, statut: 1 });
partenaritSchema.index({ entreprisePartenaire: 1 });

module.exports = mongoose.model('Partenariat', partenaritSchema);
