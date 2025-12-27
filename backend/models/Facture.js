const mongoose = require('mongoose');

const factureSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  numero: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['emission', 'reception'],
    required: true
  },
  client: {
    nom: {
      type: String,
      required: true
    },
    email: String,
    telephone: String,
    adresse: {
      rue: String,
      ville: String,
      codePostal: String,
      pays: String
    }
  },
  articles: [{
    designation: {
      type: String,
      required: true
    },
    quantite: {
      type: Number,
      required: true,
      min: 0
    },
    prixUnitaire: {
      type: Number,
      required: true,
      min: 0
    },
    tva: {
      type: Number,
      default: 20,
      min: 0,
      max: 100
    },
    total: {
      type: Number,
      required: true
    }
  }],
  montantHT: {
    type: Number,
    required: true,
    min: 0
  },
  montantTVA: {
    type: Number,
    required: true,
    min: 0
  },
  montantTTC: {
    type: Number,
    required: true,
    min: 0
  },
  dateEmission: {
    type: Date,
    required: true
  },
  dateEcheance: {
    type: Date,
    required: true
  },
  statut: {
    type: String,
    enum: ['brouillon', 'envoyee', 'payee', 'en_retard', 'annulee'],
    default: 'brouillon'
  },
  modePaiement: {
    type: String,
    enum: ['virement', 'cheque', 'especes', 'carte', 'prelevement'],
    default: 'virement'
  },
  notes: {
    type: String,
    trim: true
  },
  payableA: {
    type: String,
    trim: true
  },
  numeroCompte: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  partenariat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partenariat',
    required: false
  },
  entrepriseEmettrice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: false
  }
}, {
  timestamps: true
});

// Index pour optimiser les requêtes
factureSchema.index({ company: 1, numero: 1 }, { unique: true }); // Numéro unique par entreprise
factureSchema.index({ company: 1, dateEmission: -1 });
factureSchema.index({ company: 1, statut: 1 });
factureSchema.index({ company: 1, type: 1 });

// Méthode pour générer un numéro de facture automatique avec préfixe entreprise
factureSchema.statics.generateNumero = async function(companyId, type) {
  // Récupérer les informations de l'entreprise
  const Company = mongoose.model('Company');
  const company = await Company.findById(companyId);
  
  if (!company) {
    throw new Error('Entreprise non trouvée');
  }
  
  // Générer le préfixe avec les 3 premières lettres de l'entreprise
  const companyPrefix = company.name.substring(0, 3).toUpperCase();
  const typePrefix = type === 'emission' ? 'FAC' : 'REC';
  const prefix = `${companyPrefix}-${typePrefix}`;
  const year = new Date().getFullYear();
  
  // Chercher la dernière facture de cette entreprise avec ce préfixe
  const lastFacture = await this.findOne({
    company: companyId,
    type: type,
    numero: new RegExp(`^${prefix}-${year}-`)
  }).sort({ numero: -1 });

  let nextNumber = 1;
  if (lastFacture) {
    const match = lastFacture.numero.match(/(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }

  return `${prefix}-${year}-${nextNumber.toString().padStart(4, '0')}`;
};

module.exports = mongoose.model('Facture', factureSchema);
