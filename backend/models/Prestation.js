const mongoose = require('mongoose');

const prestationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['Prestation de service', 'Ventes', 'Customs']
  },
  icon: {
    type: String,
    default: 'Wrench'
  },
  partner: {
    type: String,
    default: null
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index pour optimiser les requêtes par entreprise
prestationSchema.index({ company: 1 });
prestationSchema.index({ company: 1, category: 1 });

module.exports = mongoose.model('Prestation', prestationSchema);
