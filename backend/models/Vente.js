const mongoose = require('mongoose');

const venteSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  numeroCommande: {
    type: String,
    required: true
  },
  // Informations du client/véhicule
  plaque: {
    type: String,
    trim: true
  },
  customCategory: {
    type: String,
    trim: true,
    default: 'N/A'
  },
  client: {
    nom: String,
    email: String,
    telephone: String
  },
  // Prestations vendues
  prestations: [{
    prestationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prestation',
      required: true
    },
    nom: {
      type: String,
      required: true
    },
    quantite: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    prixUnitaire: {
      type: Number,
      required: true,
      min: 0
    },
    prixUsine: {
      type: Number,
      default: 0,
      min: 0
    },
    commission: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    categorie: String,
    partenaire: String
  }],
  // Totaux
  sousTotal: {
    type: Number,
    required: true,
    min: 0
  },
  totalCommission: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrixUsine: {
    type: Number,
    required: true,
    min: 0
  },
  montantTotal: {
    type: Number,
    required: true,
    min: 0
  },
  // Informations de réduction
  reductionPourcentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  reductionMontant: {
    type: Number,
    default: 0,
    min: 0
  },
  commissionAvantReduction: {
    type: Number,
    default: 0,
    min: 0
  },
  commissionApresReduction: {
    type: Number,
    default: 0,
    min: 0
  },
  // Informations de vente
  dateVente: {
    type: Date,
    required: true,
    default: Date.now
  },
  heureVente: {
    type: String,
    required: true,
    default: () => new Date().toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Europe/Paris'
    })
  },
  vendeur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vendeurNom: {
    type: String,
    required: true
  },
  statut: {
    type: String,
    enum: ['confirmee', 'annulee'],
    default: 'confirmee'
  },
  modePaiement: {
    type: String,
    enum: ['virement', 'cheque', 'especes', 'carte', 'prelevement'],
    default: 'especes'
  },
  notes: {
    type: String,
    trim: true
  },
  // Partenariat associé à la vente
  partenariat: {
    type: String,
    trim: true
  },
  // Source de la vente (pour filtrer les ventes automatiques des timers)
  source: {
    type: String,
    enum: ['manual', 'timer_auto', 'import'],
    default: 'manual'
  },
  // ID de la session timer si vente créée automatiquement
  timerSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimerSession'
  }
}, {
  timestamps: true
});

// Index pour optimiser les requêtes
venteSchema.index({ company: 1, dateVente: -1 });
venteSchema.index({ company: 1, vendeur: 1 });
venteSchema.index({ company: 1, statut: 1 });
// Index composé pour que le numeroCommande soit unique par entreprise
venteSchema.index({ company: 1, numeroCommande: 1 }, { unique: true });

module.exports = mongoose.model('Vente', venteSchema);
