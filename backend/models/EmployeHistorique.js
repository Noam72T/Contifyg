const mongoose = require('mongoose');

const employeHistoriqueSchema = new mongoose.Schema({
  // Informations de l'employé
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String
  },
  phoneNumber: {
    type: String
  },
  compteBancaire: {
    type: String
  },
  discordId: {
    type: String
  },
  discordUsername: {
    type: String
  },
  avatar: {
    type: String // Photo de profil de l'utilisateur
  },
  
  // Informations de l'entreprise
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  
  // Informations du rôle au moment du licenciement
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  },
  roleName: {
    type: String // Sauvegarde du nom du rôle au cas où le rôle serait supprimé
  },
  
  // Dates importantes
  dateRecrutement: {
    type: Date,
    required: true
  },
  dateLicenciement: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  // Informations sur le licenciement
  motifLicenciement: {
    type: String,
    default: 'Non spécifié'
  },
  licenciePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Qui a effectué le licenciement
  },
  
  // ID de l'utilisateur original (pour référence)
  originalUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index pour optimiser les recherches
employeHistoriqueSchema.index({ company: 1, dateLicenciement: -1 });

module.exports = mongoose.model('EmployeHistorique', employeHistoriqueSchema);
