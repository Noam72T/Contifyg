const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  idUser: {
    type: String,
    sparse: true
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: function() {
      return !this.discordId; // Mot de passe requis seulement si pas de Discord
    }
  },
  firstName: {
    type: String,
    required: function() {
      // Requis seulement si ce n'est pas un utilisateur Discord non validé
      return !this.discordId || this.isCompanyValidated;
    }
  },
  lastName: {
    type: String,
    required: function() {
      // Requis seulement si ce n'est pas un utilisateur Discord non validé
      return !this.discordId || this.isCompanyValidated;
    }
  },
  phoneNumber: {
    type: String,
    default: '',
    validate: {
      validator: function(v) {
        // Permettre vide ou format 555-XXXXXXX (555 suivi d'un tiret et de chiffres)
        return !v || /^555-\d+$/.test(v);
      },
      message: 'Le numéro de téléphone doit commencer par 555- suivi de chiffres'
    }
  },
  compteBancaire: {
    type: String,
    default: '',
    validate: {
      validator: function(v) {
        // Permettre vide ou maximum 7 chiffres
        return !v || (/^\d+$/.test(v) && v.length <= 7);
      },
      message: 'Le numéro de compte bancaire ne peut contenir que des chiffres (maximum 7)'
    }
  },
  // ID du personnage GLife (pour API)
  charId: {
    type: Number,
    default: null,
    description: 'ID du personnage sur GLife pour récupérer les données via API'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Champs Discord
  discordId: {
    type: String,
    sparse: true,
    index: { unique: true, sparse: true }
  },
  discordUsername: {
    type: String
  },
  avatar: {
    type: String
  },
  // Famille de comptes - pour lier plusieurs comptes à la même personne
  accountFamilyId: {
    type: String,
    sparse: true,
    index: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  // Relation avec l'entreprise
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  // Rôle de l'utilisateur
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  },
  // Code d'activation
  activationCode: {
    type: String
  },
  isActivated: {
    type: Boolean,
    default: false
  },
  activatedAt: {
    type: Date
  },
  // Code d'entreprise utilisé lors de l'inscription
  companyCode: {
    type: String,
    uppercase: true
  },
  companyCodeUsedAt: {
    type: Date
  },
  // Statut de validation par code d'entreprise
  isCompanyValidated: {
    type: Boolean,
    default: false
  },
  // Rôle système (pour les techniciens et super admins)
  systemRole: {
    type: String,
    enum: ['Technicien', 'SuperAdmin', 'Utilisateur'],
    default: 'Utilisateur'
  },
  // Format legacy : companies (array) - à garder pour compatibilité
  companies: [{
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company'
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Entreprise actuelle
  currentCompany: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  // Champs financiers pour les salaires
  avances: {
    type: Number,
    default: 0,
    min: 0
  },
  primes: {
    type: Number,
    default: 0,
    min: 0
  },
  // Question et réponse de sécurité pour reset password
  securityQuestion: {
    type: String,
    required: false
  },
  securityAnswer: {
    type: String,
    required: false
  },
  // Dates de création et modification
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index optimisés pour les requêtes fréquentes et gros volumes
userSchema.index({ username: 1 }, { unique: true }); // Index unique pour login rapide
// Note: discordId index is already defined in the schema with proper sparse + unique options
userSchema.index({ company: 1, isActive: 1 }); // Index composé pour filtrage entreprise + statut
userSchema.index({ currentCompany: 1, isActive: 1 }); // Nouveau système multi-entreprises
userSchema.index({ 'companies.company': 1 }); // Index sur array pour recherche entreprise
userSchema.index({ systemRole: 1 }); // Index pour filtrer techniciens
userSchema.index({ isCompanyValidated: 1, company: 1 }); // Index composé validation + entreprise
userSchema.index({ createdAt: 1 }); // Index pour tri par date
userSchema.index({ lastLogin: 1 }); // Index pour tri par dernière connexion
userSchema.index({ activationCode: 1 }, { sparse: true }); // Index sparse pour codes d'activation

// Middleware pour hasher le mot de passe avant la sauvegarde
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') && !this.isModified('securityAnswer')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    
    // Hasher le mot de passe si modifié
    if (this.isModified('password')) {
      this.password = await bcrypt.hash(this.password, salt);
    }
    
    // Hasher la réponse de sécurité si modifiée
    if (this.isModified('securityAnswer') && this.securityAnswer) {
      this.securityAnswer = await bcrypt.hash(this.securityAnswer.toLowerCase().trim(), salt);
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Méthode pour comparer la réponse de sécurité
userSchema.methods.compareSecurityAnswer = async function(candidateAnswer) {
  if (!this.securityAnswer) return false;
  return bcrypt.compare(candidateAnswer.toLowerCase().trim(), this.securityAnswer);
};

// Méthode pour obtenir les informations publiques de l'utilisateur
userSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    idUser: this.idUser,
    username: this.username,
    firstName: this.firstName,
    lastName: this.lastName,
    phoneNumber: this.phoneNumber,
    isActive: this.isActive,
    avatar: this.avatar,
    company: this.company,
    role: this.role,
    isActivated: this.isActivated,
    lastLogin: this.lastLogin,
    avances: this.avances,
    createdAt: this.createdAt
  };
};

// Méthode pour vérifier si l'utilisateur a une permission spécifique
userSchema.methods.hasPermission = async function(permission) {
  if (!this.role) return false;
  
  await this.populate('role');
  return this.role && this.role.permissions && this.role.permissions.includes(permission);
};

// Méthode pour vérifier si l'utilisateur a un niveau de permission minimum
userSchema.methods.hasMinimumLevel = async function(minLevel) {
  if (!this.role) return false;
  
  await this.populate('role');
  return this.role && this.role.level >= minLevel;
};

// Méthode statique pour trouver les utilisateurs d'une entreprise
userSchema.statics.findByCompany = function(companyId) {
  return this.find({ company: companyId }).populate('role');
};

// Méthode statique pour trouver les utilisateurs avec un rôle spécifique
userSchema.statics.findByRole = function(roleId) {
  return this.find({ role: roleId }).populate('company');
};

// Middleware pour mettre à jour updatedAt
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('User', userSchema);
