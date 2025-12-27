// Script pour diagnostiquer le compte Mike
// Usage: node diagnose-mike.js

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

console.log('\x1b[36m========================================\x1b[0m');
console.log('\x1b[36m  DIAGNOSTIC COMPTE MIKE\x1b[0m');
console.log('\x1b[36m========================================\x1b[0m');
console.log('');

async function main() {
  try {
    // Connexion à MongoDB
    console.log('\x1b[33m🔄 Connexion à MongoDB...\x1b[0m');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/compta_db';
    await mongoose.connect(mongoUri);
    
    console.log('\x1b[32m✅ Connecté à MongoDB\x1b[0m\n');

    const User = require('./models/User');

    // Chercher Mike
    const mike = await User.findOne({ username: 'Mike' });
    
    if (!mike) {
      console.log('\x1b[31m❌ Compte Mike non trouvé!\x1b[0m\n');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('\x1b[36m📋 INFORMATIONS DU COMPTE:\x1b[0m');
    console.log('Username: Mike');
    console.log('ID: ' + mike._id);
    console.log('Nom: ' + mike.firstName + ' ' + mike.lastName);
    console.log('Téléphone: ' + mike.phoneNumber);
    console.log('Compte bancaire: ' + mike.compteBancaire);
    console.log('AccountFamilyId: ' + (mike.accountFamilyId || 'Aucun'));
    console.log('Créé le: ' + mike.createdAt);
    console.log('Hash du mot de passe: ' + mike.password.substring(0, 20) + '...');
    console.log('');

    // Tester plusieurs mots de passe possibles
    const passwordsToTest = [
      'Azerty1234&',
      'Azerty1234A',
      'azerty1234',
      'Azerty1234'
    ];

    console.log('\x1b[33m🔍 TEST DES MOTS DE PASSE:\x1b[0m\n');
    
    for (const pwd of passwordsToTest) {
      try {
        const isValid = await bcrypt.compare(pwd, mike.password);
        if (isValid) {
          console.log(`  \x1b[32m✅ "${pwd}" FONCTIONNE!\x1b[0m`);
        } else {
          console.log(`  \x1b[31m❌ "${pwd}" ne fonctionne pas\x1b[0m`);
        }
      } catch (error) {
        console.log(`  \x1b[31m❌ "${pwd}" - Erreur: ${error.message}\x1b[0m`);
      }
    }

    console.log('\n\x1b[33m💡 SOLUTION:\x1b[0m');
    console.log('Si aucun mot de passe ne fonctionne, exécutez:');
    console.log('  node reset-password-direct.js');
    console.log('  Choisissez "Mike" et définissez un nouveau mot de passe\n');

  } catch (error) {
    console.log('\n\x1b[31m❌ ERREUR:\x1b[0m');
    console.log('\x1b[31m' + error.message + '\x1b[0m\n');
  } finally {
    await mongoose.disconnect();
    console.log('\x1b[33m🔌 Déconnecté de MongoDB\x1b[0m\n');
  }
}

main();
