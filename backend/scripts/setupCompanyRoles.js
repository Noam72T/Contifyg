const mongoose = require('mongoose');
const { initializePermissions } = require('./initializePermissions');
const { createDefaultRoles } = require('./createDefaultRoles');
require('dotenv').config();

/**
 * Script pour initialiser les permissions et créer les rôles par défaut pour une entreprise
 */
async function setupCompanyRoles(companyId, createdBy) {
  try {
    console.log('=== INITIALISATION DU SYSTÈME DE RÔLES ===');
    
    // 1. Initialiser les permissions par défaut
    console.log('\n1. Initialisation des permissions...');
    await initializePermissions();
    
    // 2. Créer les rôles par défaut pour l'entreprise
    console.log('\n2. Création des rôles par défaut...');
    const roles = await createDefaultRoles(companyId, createdBy);
    
    console.log('\n✅ Configuration terminée avec succès !');
    console.log(`📋 ${roles.length} rôles créés pour l'entreprise ${companyId}`);
    
    return roles;
  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error);
    throw error;
  }
}

// Script autonome
async function runSetup() {
  if (require.main === module) {
    try {
      // Se connecter à MongoDB
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('✅ Connecté à MongoDB');

      const companyId = process.argv[2];
      const createdBy = process.argv[3];

      if (!companyId || !createdBy) {
        console.error('Usage: node setupCompanyRoles.js <companyId> <createdById>');
        console.log('Exemple: node setupCompanyRoles.js 68c15420182fb08214a0123f 68c3fd6870af44d72661234a');
        process.exit(1);
      }

      await setupCompanyRoles(companyId, createdBy);
      
    } catch (error) {
      console.error('❌ Erreur:', error);
      process.exit(1);
    } finally {
      mongoose.connection.close();
      console.log('🔌 Connexion MongoDB fermée');
    }
  }
}

module.exports = { setupCompanyRoles };
runSetup();
