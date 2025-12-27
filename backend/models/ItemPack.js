const mongoose = require('mongoose');

// Schéma pour un item dans le pack (template)
const packItemSchema = new mongoose.Schema({
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
  gestionStock: {
    type: Boolean,
    default: false
  },
  customCategory: {
    type: String,
    enum: ['', 'cat1', 'cat2', 'cat3', 'cat4', 'cat5'],
    default: ''
  }
});

// Calculer automatiquement la marge brute
packItemSchema.pre('save', function(next) {
  if (this.coutRevient === 0) {
    this.margeBrute = this.prixVente;
  } else {
    this.margeBrute = this.prixVente - this.coutRevient;
  }
  next();
});

// Schéma principal pour le pack d'items
const itemPackSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom du pack est requis'],
    trim: true,
    maxlength: [100, 'Le nom du pack ne peut pas dépasser 100 caractères']
  },
  description: {
    type: String,
    default: '',
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  },
  items: [packItemSchema],
  creePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  dateCreation: {
    type: Date,
    default: Date.now
  },
  dateModification: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Mettre à jour la date de modification
itemPackSchema.pre('save', function(next) {
  this.dateModification = Date.now();
  next();
});

// Index pour optimiser les recherches
itemPackSchema.index({ nom: 1 });
itemPackSchema.index({ isActive: 1 });
itemPackSchema.index({ creePar: 1 });

module.exports = mongoose.model('ItemPack', itemPackSchema);
