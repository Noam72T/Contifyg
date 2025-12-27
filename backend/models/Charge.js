const mongoose = require('mongoose');

const chargeSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  nom: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  montant: {
    type: Number,
    required: true,
    min: 0
  },
  categorie: {
    type: String,
    required: true,
    trim: true
  },
  dateCharge: {
    type: Date,
    required: true
  },
  recurrente: {
    type: Boolean,
    default: false
  },
  frequence: {
    type: String,
    enum: ['mensuelle', 'trimestrielle', 'semestrielle', 'annuelle'],
    required: function() {
      return this.recurrente;
    }
  },
  statut: {
    type: String,
    enum: ['en_attente', 'payee', 'annulee'],
    default: 'en_attente'
  },
  deductibilite: {
    type: String,
    enum: ['deductible', 'non_deductible', 'partiellement_deductible'],
    required: true,
    default: 'deductible'
  },
  pourcentageDeduction: {
    type: Number,
    min: 0,
    max: 100,
    required: function() {
      return this.deductibilite === 'partiellement_deductible';
    }
  },
  facture: {
    numero: String,
    fournisseur: String,
    dateEcheance: Date
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
chargeSchema.index({ company: 1, dateCharge: -1 });
chargeSchema.index({ company: 1, categorie: 1 });
chargeSchema.index({ company: 1, statut: 1 });

module.exports = mongoose.model('Charge', chargeSchema);
