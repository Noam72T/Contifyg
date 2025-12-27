const mongoose = require('mongoose');

const salaireSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  employe: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employe',
    required: true
  },
  periode: {
    mois: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    annee: {
      type: Number,
      required: true
    },
    semaine: {
      type: Number,
      min: 1,
      max: 53,
      // Optionnel : utilisé uniquement pour les SuperAdmin qui ont un reset hebdomadaire
      required: false
    }
  },
  salaireBrut: {
    type: Number,
    required: true,
    min: 0
  },
  heuresNormales: {
    type: Number,
    default: 0,
    min: 0
  },
  heuresSupplementaires: {
    type: Number,
    default: 0,
    min: 0
  },
  primes: {
    type: Number,
    default: 0,
    min: 0
  },
  cotisationsSociales: {
    securiteSociale: {
      type: Number,
      default: 0
    },
    retraite: {
      type: Number,
      default: 0
    },
    chomage: {
      type: Number,
      default: 0
    },
    mutuelle: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  impots: {
    type: Number,
    default: 0,
    min: 0
  },
  salaireNet: {
    type: Number,
    required: true,
    min: 0
  },
  congesPayes: {
    jours: {
      type: Number,
      default: 0
    },
    montant: {
      type: Number,
      default: 0
    }
  },
  statut: {
    type: String,
    enum: ['calcule', 'valide', 'paye'],
    default: 'calcule'
  },
  datePaiement: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index pour optimiser les requêtes et éviter les doublons
// Index unique modifié pour supporter les salaires hebdomadaires (SuperAdmin)
salaireSchema.index({ company: 1, employe: 1, 'periode.mois': 1, 'periode.annee': 1, 'periode.semaine': 1 }, { unique: true, sparse: true });
salaireSchema.index({ company: 1, 'periode.annee': -1, 'periode.mois': -1 });
salaireSchema.index({ company: 1, statut: 1 });

module.exports = mongoose.model('Salaire', salaireSchema);
