const mongoose = require('mongoose');
const path = require('path');

// Charger les variables d'environnement depuis le bon chemin
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Modèles
const User = require('../models/User');
const Employe = require('../models/Employe');
const Company = require('../models/Company');
const Role = require('../models/Role');
const Salaire = require('../models/Salaire');

async function checkEmployeRoles() {
  try {
    // Connexion à la base de données
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connexion à MongoDB établie');

    // Vérifier les employés avec leurs rôles
    console.log('\n🔍 Vérification des employés avec rôles:');
    const employesAvecRole = await Employe.find({
      role: { $exists: true, $ne: null }
    })
    .populate('utilisateur', 'username firstName lastName')
    .populate('company', 'name')
    .populate('role', 'nom name normeSalariale limiteSalaire typeContrat niveau');

    console.log(`📊 Trouvé ${employesAvecRole.length} employés avec rôle:`);
    employesAvecRole.forEach(emp => {
      console.log(`  - ${emp.utilisateur?.username} (${emp.company?.name}): ${emp.role?.nom || emp.role?.name} - Norme: ${emp.role?.normeSalariale}€`);
    });

    // Vérifier un salaire spécifique pour voir si le populate fonctionne
    console.log('\n🔍 Test d\'un salaire avec populate:');
    const testSalaire = await Salaire.findOne({})
      .populate({
        path: 'employe',
        populate: [
          {
            path: 'utilisateur',
            select: 'firstName lastName username'
          },
          {
            path: 'role',
            select: 'nom name normeSalariale limiteSalaire typeContrat niveau'
          }
        ]
      });

    if (testSalaire) {
      console.log('📋 Salaire test:');
      console.log(`  - Employé: ${testSalaire.employe?.utilisateur?.username}`);
      console.log(`  - Rôle: ${testSalaire.employe?.role?.nom || testSalaire.employe?.role?.name || 'AUCUN'}`);
      console.log(`  - Norme salariale: ${testSalaire.employe?.role?.normeSalariale || 'N/A'}€`);
    } else {
      console.log('❌ Aucun salaire trouvé');
    }

    // Vérifier les employés sans rôle
    console.log('\n🔍 Employés SANS rôle:');
    const employesSansRole = await Employe.find({
      $or: [
        { role: { $exists: false } },
        { role: null }
      ]
    })
    .populate('utilisateur', 'username')
    .populate('company', 'name');

    console.log(`📊 Trouvé ${employesSansRole.length} employés SANS rôle:`);
    employesSansRole.forEach(emp => {
      console.log(`  - ${emp.utilisateur?.username} (${emp.company?.name})`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Connexion MongoDB fermée');
  }
}

// Exécuter le script
if (require.main === module) {
  checkEmployeRoles();
}

module.exports = checkEmployeRoles;
