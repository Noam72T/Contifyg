const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    default: ''
  },
  module: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['PAPERASSE', 'ADMINISTRATION', 'GESTION', 'GENERALE'],
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Permission', permissionSchema);