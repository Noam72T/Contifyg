require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Role = require('../models/Role');
const Company = require('../models/Company');
const Salaire = require('../models/Salaire');
const Employe = require('../models/Employe');

// Script pour tester l'API des salaires
async function testSalairesAPI() {
  try {
    console.log('🔍 Test de l\'API des salaires...');

    // Vérifier que MONGODB_URI est défini
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI n\'est pas défini');
      process.exit(1);
    }

    console.log('🔗 Connexion à la base de données...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Simuler la logique de l'API GET /salaires
    console.log('\n📊 Test de la logique des salaires...');
    
    // Récupérer quelques salaires avec la même requête que l'API
    const salaires = await Salaire.find({})
      .populate({
        path: 'employe',
        populate: [
          {
            path: 'utilisateur',
            select: 'firstName lastName username companies role',
            populate: [
              {
                path: 'companies.role',
                select: 'name level'
              },
              {
                path: 'role',
                select: 'name level'
              }
            ]
          },
          {
            path: 'role',
            select: 'name level'
          }
        ]
      })
      .limit(5);

    // Fonction utilitaire pour ajouter le rôle d'affichage (copie de celle dans salaires.js)
    function addDisplayRole(salaire, companyId = null) {
      const salaireObj = salaire.toObject ? salaire.toObject() : salaire;
      
      if (salaireObj.employe && salaireObj.employe.utilisateur) {
        const employe = salaireObj.employe;
        const user = employe.utilisateur;
        
        // Logique pour déterminer le rôle à afficher
        let displayRole = null;
        
        // 1. Priorité au rôle employé synchronisé
        if (employe.role) {
          displayRole = employe.role;
        }
        // 2. Sinon rôle par entreprise correspondant
        else if (user.companies && user.companies.length > 0) {
          const targetCompanyId = companyId || salaireObj.company;
          const companyRole = user.companies.find(c => 
            c.company && c.company.toString() === targetCompanyId.toString() && c.role
          )?.role;
          if (companyRole) {
            displayRole = companyRole;
          }
        }
        // 3. Sinon rôle global
        else if (user.role) {
          displayRole = user.role;
        }
        
        // Ajouter le rôle calculé à l'objet employé
        salaireObj.employe.displayRole = displayRole;
      }
      
      return salaireObj;
    }

    // Appliquer la logique comme dans l'API
    const salairesWithDisplayRole = salaires.map(salaire => addDisplayRole(salaire));

    console.log('\n📋 Résultats:');
    
    for (const salaire of salairesWithDisplayRole) {
      if (!salaire.employe || !salaire.employe.utilisateur) continue;
      
      const employe = salaire.employe;
      const user = employe.utilisateur;
      const displayRole = employe.displayRole;
      
      console.log(`\n👤 ${user.firstName} ${user.lastName}:`);
      console.log(`   - Rôle employé: ${employe.role ? employe.role.name || 'ID: ' + employe.role : 'null'}`);
      console.log(`   - Rôle utilisateur: ${user.role ? user.role.name || 'ID: ' + user.role : 'null'}`);
      console.log(`   - Companies: ${user.companies ? user.companies.length : 0}`);
      if (user.companies && user.companies.length > 0) {
        user.companies.forEach((company, index) => {
          console.log(`     Company ${index + 1}: Role = ${company.role ? company.role.name || 'ID: ' + company.role : 'null'}`);
        });
      }
      console.log(`   ➡️ RÔLE AFFICHÉ: ${displayRole ? displayRole.name || 'ID: ' + displayRole : '❌ AUCUN RÔLE'}`);
      
      if (!displayRole) {
        console.log(`   ⚠️ PROBLÈME: Aucun rôle trouvé pour cet employé`);
      }
    }

    console.log('\n✅ Test terminé');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    process.exit(1);
  }
}

// Exécuter le script
testSalairesAPI();
