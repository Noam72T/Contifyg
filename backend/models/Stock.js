const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  quantite: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  quantiteMinimale: {
    type: Number,
    default: 5,
    min: 0
  },
  semaine: {
    type: Number,
    required: true
  },
  annee: {
    type: Number,
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
  historiqueStock: [{
    action: {
      type: String,
      enum: ['ajout', 'retrait', 'vente', 'correction'],
      required: true
    },
    quantite: {
      type: Number,
      required: true
    },
    quantiteAvant: {
      type: Number,
      required: true
    },
    quantiteApres: {
      type: Number,
      required: true
    },
    motif: {
      type: String,
      default: ''
    },
    utilisateur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index pour optimiser les recherches
stockSchema.index({ company: 1 });
stockSchema.index({ item: 1, company: 1, semaine: 1, annee: 1 }, { unique: true });

// Middleware pour mettre à jour la date de modification
stockSchema.pre('save', function(next) {
  this.dateModification = Date.now();
  next();
});

// Méthode pour ajouter une entrée à l'historique
stockSchema.methods.ajouterHistorique = function(action, quantite, quantiteAvant, quantiteApres, motif, utilisateur) {
  this.historiqueStock.push({
    action,
    quantite,
    quantiteAvant,
    quantiteApres,
    motif,
    utilisateur,
    date: new Date()
  });
};

module.exports = mongoose.model('Stock', stockSchema);
