const mongoose = require('mongoose');

const PrestationCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  icon: {
    type: String,
    default: 'Folder'
  },
  color: {
    type: String,
    default: '#3b82f6'
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PrestationCategory',
    default: null
  },
  isSystemCategory: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Champ pour les catégories personnalisées de véhicules
  customVehicleCategory: {
    type: String,
    trim: true,
    default: null
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
PrestationCategorySchema.index({ company: 1, name: 1 });
PrestationCategorySchema.index({ company: 1, parentCategory: 1 });

module.exports = mongoose.model('PrestationCategory', PrestationCategorySchema);
