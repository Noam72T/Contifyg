require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Employe = require('../models/Employe');
const Role = require('../models/Role');

// Script de synchronisation des rôles entre User et Employe
async function syncEmployeRoles() {
  try {
    console.log('🔄 Début de la synchronisation des rôles...');

    // Récupérer tous les employés avec leurs utilisateurs et rôles
    const employes = await Employe.find({})
      .populate('utilisateur', 'role firstName lastName username')
      .populate('role', 'name level');

    let syncCount = 0;
    let errorCount = 0;

    for (const employe of employes) {
      try {
        if (!employe.utilisateur) {
          console.log(`⚠️ Employé ${employe._id} sans utilisateur associé`);
          continue;
        }

        const userRole = employe.utilisateur.role;
        const employeRole = employe.role;

        // Si l'utilisateur a un rôle mais pas l'employé, synchroniser
        if (userRole && !employeRole) {
          employe.role = userRole;
          await employe.save();
          syncCount++;
          console.log(`✅ Rôle synchronisé pour ${employe.utilisateur.firstName} ${employe.utilisateur.lastName} - Rôle: ${userRole}`);
        }
        // Si les rôles sont différents, mettre à jour avec le rôle de l'utilisateur
        else if (userRole && employeRole && userRole.toString() !== employeRole.toString()) {
          employe.role = userRole;
          await employe.save();
          syncCount++;
          console.log(`🔄 Rôle mis à jour pour ${employe.utilisateur.firstName} ${employe.utilisateur.lastName}`);
        }
        // Si l'utilisateur n'a pas de rôle mais l'employé en a un, garder celui de l'employé
        else if (!userRole && employeRole) {
          console.log(`ℹ️ Employé ${employe.utilisateur.firstName} ${employe.utilisateur.lastName} garde son rôle existant`);
        }
        // Si aucun des deux n'a de rôle
        else if (!userRole && !employeRole) {
          console.log(`⚠️ Aucun rôle défini pour ${employe.utilisateur.firstName} ${employe.utilisateur.lastName}`);
        }
        else {
          console.log(`✓ Rôle déjà synchronisé pour ${employe.utilisateur.firstName} ${employe.utilisateur.lastName}`);
        }

      } catch (error) {
        errorCount++;
        console.error(`❌ Erreur lors de la synchronisation de l'employé ${employe._id}:`, error.message);
      }
    }

    console.log('\n📊 Résumé de la synchronisation:');
    console.log(`- Total employés traités: ${employes.length}`);
    console.log(`- Rôles synchronisés: ${syncCount}`);
    console.log(`- Erreurs: ${errorCount}`);
    console.log('✅ Synchronisation terminée');

    return {
      total: employes.length,
      synchronized: syncCount,
      errors: errorCount
    };

  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation des rôles:', error);
    throw error;
  }
}

// Fonction pour synchroniser un employé spécifique
async function syncSingleEmployeRole(employeId) {
  try {
    const employe = await Employe.findById(employeId)
      .populate('utilisateur', 'role firstName lastName username');

    if (!employe) {
      throw new Error('Employé non trouvé');
    }

    if (!employe.utilisateur) {
      throw new Error('Utilisateur non associé à cet employé');
    }

    const userRole = employe.utilisateur.role;
    
    if (userRole) {
      employe.role = userRole;
      await employe.save();
      console.log(`✅ Rôle synchronisé pour l'employé ${employe.utilisateur.firstName} ${employe.utilisateur.lastName}`);
      return true;
    } else {
      console.log(`⚠️ L'utilisateur ${employe.utilisateur.firstName} ${employe.utilisateur.lastName} n'a pas de rôle défini`);
      return false;
    }

  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation de l\'employé:', error.message);
    throw error;
  }
}

// Si le script est exécuté directement
if (require.main === module) {
  // Vérifier que MONGODB_URI est défini
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI n\'est pas défini dans les variables d\'environnement');
    console.log('💡 Assurez-vous que le fichier .env contient MONGODB_URI=...');
    process.exit(1);
  }

  console.log('🔗 Connexion à la base de données...');
  
  // Connexion à la base de données
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  syncEmployeRoles()
    .then((result) => {
      console.log('Synchronisation terminée avec succès:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erreur lors de la synchronisation:', error);
      process.exit(1);
    });
}

module.exports = {
  syncEmployeRoles,
  syncSingleEmployeRole
};
