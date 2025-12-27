const mongoose = require('mongoose');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
require('dotenv').config();

/**
 * Créer les rôles par défaut pour une entreprise
 * @param {string} companyId - ID de l'entreprise
 * @param {string} createdBy - ID de l'utilisateur créateur
 */
const createDefaultRoles = async (companyId, createdBy) => {
  try {
    console.log(`Création des rôles par défaut pour l'entreprise ${companyId}...`);

    // Récupérer toutes les permissions
    const allPermissions = await Permission.find({});
    
    // Grouper les permissions par catégorie
    const paperassePermissions = allPermissions.filter(p => p.category === 'PAPERASSE');
    const administrationPermissions = allPermissions.filter(p => p.category === 'ADMINISTRATION');
    const gestionPermissions = allPermissions.filter(p => p.category === 'GESTION');

    // Récupérer les permissions par catégorie
    const generalePermissions = allPermissions.filter(p => p.category === 'GENERALE');

    // Définir les rôles par défaut
    const defaultRoles = [
      {
        nom: 'Employé',
        description: 'Accès de base - catégorie générale uniquement',
        normeSalariale: 35,
        limiteSalaire: 2500,
        typeContrat: 'CDI',
        isDefault: true,
        company: companyId,
        permissions: generalePermissions.map(p => p._id), // Seulement catégorie générale
        creePar: createdBy
      },
      {
        nom: 'Employé CDD',
        description: 'Accès de base pour contrat à durée déterminée',
        normeSalariale: 35,
        limiteSalaire: 2200,
        typeContrat: 'CDD',
        isDefault: true,
        company: companyId,
        permissions: generalePermissions.map(p => p._id), // Seulement catégorie générale
        creePar: createdBy
      },
      {
        nom: 'Employé Paperasse',
        description: 'Accès général + paperasse',
        normeSalariale: 35,
        limiteSalaire: 3500,
        typeContrat: 'CDI',
        isDefault: true,
        company: companyId,
        permissions: [
          ...generalePermissions.map(p => p._id),
          ...paperassePermissions.map(p => p._id)
        ],
        creePar: createdBy
      },
      {
        nom: 'Responsable Administration',
        description: 'Accès général + administration',
        normeSalariale: 35,
        limiteSalaire: 5000,
        typeContrat: 'CDI',
        isDefault: true,
        company: companyId,
        permissions: [
          ...generalePermissions.map(p => p._id),
          ...administrationPermissions.map(p => p._id)
        ],
        creePar: createdBy
      },
      {
        nom: 'Manager',
        description: 'Accès général + paperasse + administration',
        normeSalariale: 35,
        limiteSalaire: 7000,
        typeContrat: 'CDI',
        isDefault: true,
        company: companyId,
        permissions: [
          ...generalePermissions.map(p => p._id),
          ...paperassePermissions.map(p => p._id),
          ...administrationPermissions.map(p => p._id)
        ],
        creePar: createdBy
      },
      {
        nom: 'Directeur',
        description: 'Accès complet à toutes les catégories',
        normeSalariale: 35,
        limiteSalaire: 15000,
        typeContrat: 'DIRECTION',
        isDefault: true,
        company: companyId,
        permissions: allPermissions.map(p => p._id), // Toutes les permissions
        creePar: createdBy
      },
      {
        nom: 'Stagiaire',
        description: 'Accès limité - catégorie générale en lecture seule',
        normeSalariale: 20,
        limiteSalaire: 800,
        typeContrat: 'STAGIAIRE',
        isDefault: true,
        company: companyId,
        permissions: [
          ...generalePermissions.filter(p => p.code.includes('VIEW_')).map(p => p._id)
        ],
        creePar: createdBy
      }
    ];

    // Créer les rôles
    const createdRoles = await Role.insertMany(defaultRoles);
    
    console.log(`${createdRoles.length} rôles par défaut créés:`);
    createdRoles.forEach(role => {
      console.log(`- ${role.nom} (${role.typeContrat}) - ${role.permissions.length} permissions`);
    });

    return createdRoles;
  } catch (error) {
    console.error('Erreur lors de la création des rôles par défaut:', error);
    throw error;
  }
};

/**
 * Script autonome pour créer des rôles par défaut
 */
const runScript = async () => {
  if (require.main === module) {
    // Se connecter à MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    try {
      // Exemple d'utilisation - remplacez par les vrais IDs
      const companyId = process.argv[2]; // ID de l'entreprise passé en argument
      const createdBy = process.argv[3]; // ID de l'utilisateur créateur passé en argument

      if (!companyId || !createdBy) {
        console.error('Usage: node createDefaultRoles.js <companyId> <createdById>');
        process.exit(1);
      }

      await createDefaultRoles(companyId, createdBy);
      console.log('✅ Rôles par défaut créés avec succès !');
    } catch (error) {
      console.error('❌ Erreur:', error);
    } finally {
      mongoose.connection.close();
    }
  }
};

// Exporter les fonctions ET exécuter le script si appelé directement
module.exports = { createDefaultRoles };
runScript();
