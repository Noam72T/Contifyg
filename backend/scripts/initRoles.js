const mongoose = require('mongoose');
const Role = require('../models/Role');
require('dotenv').config();

const initializeSystemRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connexion à MongoDB réussie');

    // Vérifier si les rôles système existent déjà
    const existingTechnicien = await Role.findOne({ name: 'Technicien', isSystemRole: true });
    const existingUser = await Role.findOne({ name: 'User', isSystemRole: true });

    if (!existingTechnicien) {
      const technicienRole = new Role({
        name: 'Technicien',
        description: 'Accès complet au système, peut gérer toutes les entreprises et utilisateurs',
        company: null,
        permissions: {
          // Permissions générales
          canViewAllCompanies: true,
          canManageSystem: true,
          
          // Permissions comptabilité
          canViewCompta: true,
          canEditCompta: true,
          canDeleteCompta: true,
          
          // Permissions prestations
          canViewPrestations: true,
          canCreatePrestations: true,
          canEditPrestations: true,
          canDeletePrestations: true,
          
          // Permissions utilisateurs
          canViewUsers: true,
          canInviteUsers: true,
          canManageRoles: true,
          canRemoveUsers: true,
          
          // Permissions entreprise
          canEditCompany: true,
          canDeleteCompany: true
        },
        isSystemRole: true
      });

      await technicienRole.save();
      console.log('Rôle Technicien créé avec succès');
    } else {
      console.log('Rôle Technicien existe déjà');
    }

    if (!existingUser) {
      const userRole = new Role({
        name: 'User',
        description: 'Utilisateur standard avec accès limité',
        company: null,
        permissions: {
          // Permissions générales
          canViewAllCompanies: false,
          canManageSystem: false,
          
          // Permissions comptabilité
          canViewCompta: false,
          canEditCompta: false,
          canDeleteCompta: false,
          
          // Permissions prestations
          canViewPrestations: true,
          canCreatePrestations: false,
          canEditPrestations: false,
          canDeletePrestations: false,
          
          // Permissions utilisateurs
          canViewUsers: false,
          canInviteUsers: false,
          canManageRoles: false,
          canRemoveUsers: false,
          
          // Permissions entreprise
          canEditCompany: false,
          canDeleteCompany: false
        },
        isSystemRole: true
      });

      await userRole.save();
      console.log('Rôle User créé avec succès');
    } else {
      console.log('Rôle User existe déjà');
    }

    console.log('Initialisation des rôles système terminée');
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des rôles système:', error);
    process.exit(1);
  }
};

initializeSystemRoles();
