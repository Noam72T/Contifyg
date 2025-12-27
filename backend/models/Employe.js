const mongoose = require('mongoose');

const employeSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  poste: {
    type: String,
    required: true,
    trim: true
  },
  salaire: {
    type: Number,
    required: true,
    min: 0
  },
  typeContrat: {
    type: String,
    enum: ['cdi', 'cdd', 'stage', 'freelance', 'interim'],
    required: true
  },
  dateEmbauche: {
    type: Date,
    required: true
  },
  dateFinContrat: {
    type: Date,
    required: function() {
      return this.typeContrat === 'cdd' || this.typeContrat === 'stage' || this.typeContrat === 'interim';
    }
  },
  statut: {
    type: String,
    enum: ['actif', 'conge', 'arret_maladie', 'demission', 'licenciement'],
    default: 'actif'
  },
  departement: {
    type: String,
    trim: true
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employe'
  },
  competences: [String],
  notes: {
    type: String,
    trim: true
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
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
employeSchema.index({ company: 1, statut: 1 });
employeSchema.index({ company: 1, departement: 1 });
employeSchema.index({ company: 1, utilisateur: 1 }, { unique: true });

module.exports = mongoose.model('Employe', employeSchema);
