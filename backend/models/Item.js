const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom du produit est requis'],
    trim: true,
    maxlength: [100, 'Le nom du produit ne peut pas dépasser 100 caractères']
  },
  image: {
    type: String,
    default: ''
  },
  type: {
    type: [String],
    required: false,
    default: [],
    validate: {
      validator: function(v) {
        return Array.isArray(v);
      },
      message: 'Le type doit être un tableau'
    }
  },
  sousType: {
    type: String,
    enum: ['Inconnu', 'Apparence', 'Performance'],
    default: 'Inconnu'
  },
  prixVente: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  coutRevient: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  margeBrute: {
    type: Number,
    default: 0
  },
  categorie: {
    type: Number,
    default: null
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
  dateCreation: {
    type: Date,
    default: Date.now
  },
  dateModification: {
    type: Date,
    default: Date.now
  },
  gestionStock: {
    type: Boolean,
    default: false,
    required: false
  },
  customCategory: {
    type: String,
    enum: ['', 'cat1', 'cat2', 'cat3', 'cat4', 'cat5'],
    default: '',
    required: false
  }
}, {
  timestamps: true
});

// Calculer automatiquement la marge brute avant la sauvegarde
itemSchema.pre('save', function(next) {
  // Si coût de revient = 0, marge brute = prix de vente
  // Sinon, marge brute = prix de vente - coût de revient
  if (this.coutRevient === 0) {
    this.margeBrute = this.prixVente;
  } else {
    this.margeBrute = this.prixVente - this.coutRevient;
  }
  this.dateModification = Date.now();
  next();
});

// Index pour optimiser les recherches
itemSchema.index({ company: 1 });
itemSchema.index({ type: 1 });
itemSchema.index({ nom: 1 });

module.exports = mongoose.model('Item', itemSchema);
