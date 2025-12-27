require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Role = require('../models/Role');
const Company = require('../models/Company');
const Salaire = require('../models/Salaire');
const Employe = require('../models/Employe');

// Script pour déboguer les données des salaires
async function debugSalaires() {
  try {
    console.log('🔍 Debug des données de salaires...');

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
      .limit(3);

    console.log('\n📊 Données récupérées:');
    
    for (const salaire of salaires) {
      if (!salaire.employe || !salaire.employe.utilisateur) continue;
      
      const employe = salaire.employe;
      const user = employe.utilisateur;
      
      console.log(`\n👤 ${user.firstName} ${user.lastName}:`);
      console.log(`   - ID Employé: ${employe._id}`);
      console.log(`   - Rôle employé: ${employe.role ? JSON.stringify(employe.role) : 'null'}`);
      console.log(`   - Rôle utilisateur global: ${user.role ? JSON.stringify(user.role) : 'null'}`);
      console.log(`   - Companies: ${user.companies ? user.companies.length : 0} entreprises`);
      
      if (user.companies && user.companies.length > 0) {
        user.companies.forEach((company, index) => {
          console.log(`     Company ${index + 1}: ${company.company}`);
          console.log(`     Role: ${company.role ? JSON.stringify(company.role) : 'null'}`);
        });
      }
      
      // Logique pour déterminer le rôle à afficher
      let displayRole = null;
      let roleSource = 'aucun';
      
      // 1. Priorité au rôle employé
      if (employe.role) {
        displayRole = employe.role;
        roleSource = 'employe.role';
      }
      // 2. Sinon rôle par entreprise
      else if (user.companies && user.companies.length > 0) {
        const companyRole = user.companies.find(c => c.role)?.role;
        if (companyRole) {
          displayRole = companyRole;
          roleSource = 'companies.role';
        }
      }
      // 3. Sinon rôle global
      else if (user.role) {
        displayRole = user.role;
        roleSource = 'user.role';
      }
      
      console.log(`   ➡️ Rôle à afficher: ${displayRole ? displayRole.name || displayRole : 'AUCUN'} (source: ${roleSource})`);
    }

    console.log('\n✅ Debug terminé');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur lors du debug:', error);
    process.exit(1);
  }
}

// Exécuter le script
debugSalaires();
