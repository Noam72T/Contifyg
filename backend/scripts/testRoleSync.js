require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Employe = require('../models/Employe');
const Role = require('../models/Role');

// Script de test pour vérifier la synchronisation des rôles
async function testRoleSync() {
  try {
    console.log('🔍 Test de la synchronisation des rôles...');

    // Récupérer quelques employés avec leurs utilisateurs
    const employes = await Employe.find({})
      .populate({
        path: 'utilisateur',
        select: 'firstName lastName username companies role',
        populate: {
          path: 'companies.role',
          select: 'name level'
        }
      })
      .populate('role', 'name level')
      .limit(5);

    console.log('\n📊 État actuel des rôles:');
    
    for (const employe of employes) {
      if (!employe.utilisateur) continue;
      
      const user = employe.utilisateur;
      const companyRole = user.companies?.find(c => 
        c.company.toString() === employe.company.toString()
      )?.role;
      
      console.log(`\n👤 ${user.firstName} ${user.lastName}:`);
      console.log(`   - Rôle global: ${user.role ? 'Défini' : 'Non défini'}`);
      console.log(`   - Rôle entreprise: ${companyRole ? companyRole.name : 'Non défini'}`);
      console.log(`   - Rôle employé: ${employe.role ? 'Défini' : 'Non défini'}`);
      
      // Déterminer quel rôle devrait être utilisé
      let expectedRole = null;
      if (companyRole) {
        expectedRole = companyRole;
      } else if (user.role) {
        expectedRole = user.role;
      }
      
      console.log(`   - Rôle attendu: ${expectedRole ? (expectedRole.name || 'ID: ' + expectedRole) : 'Aucun'}`);
      
      if (expectedRole && (!employe.role || employe.role.toString() !== (expectedRole._id || expectedRole).toString())) {
        console.log(`   ⚠️ DÉSYNCHRONISÉ - Correction nécessaire`);
      } else {
        console.log(`   ✅ Synchronisé`);
      }
    }

    console.log('\n🔄 Recommandation: Exécutez la synchronisation si des désynchronisations sont détectées');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
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

  testRoleSync()
    .then(() => {
      console.log('\n✅ Test terminé');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erreur lors du test:', error);
      process.exit(1);
    });
}

module.exports = { testRoleSync };
