const mongoose = require('mongoose');

const bilanSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  periode: {
    debut: {
      type: Date,
      required: true
    },
    fin: {
      type: Date,
      required: true
    }
  },
  actif: {
    immobilisations: {
      type: Number,
      default: 0
    },
    stocks: {
      type: Number,
      default: 0
    },
    creances: {
      type: Number,
      default: 0
    },
    tresorerie: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  passif: {
    capitaux: {
      type: Number,
      default: 0
    },
    dettes: {
      type: Number,
      default: 0
    },
    provisions: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  resultat: {
    chiffreAffaires: {
      type: Number,
      default: 0
    },
    charges: {
      type: Number,
      default: 0
    },
    benefice: {
      type: Number,
      default: 0
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index pour optimiser les requêtes
bilanSchema.index({ company: 1, 'periode.debut': -1 });

module.exports = mongoose.model('Bilan', bilanSchema);
