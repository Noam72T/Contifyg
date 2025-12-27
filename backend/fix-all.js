// Script tout-en-un : Réinitialiser les mots de passe ET lier les comptes
// Usage: node fix-all.js

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

console.log('\x1b[36m========================================\x1b[0m');
console.log('\x1b[36m  CORRECTION COMPLÈTE\x1b[0m');
console.log('\x1b[36m========================================\x1b[0m');
console.log('');

// Configuration
const accountsConfig = [
  { username: 'Jack', password: 'Azerty1234A' },
  { username: 'Snow', password: 'Azerty1234&' },
  { username: 'Louis', password: 'Azerty1234A' }
];

async function main() {
  try {
    // Connexion à MongoDB
    console.log('\x1b[33m🔄 Connexion à MongoDB...\x1b[0m');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/compta_db';
    await mongoose.connect(mongoUri);
    
    console.log('\x1b[32m✅ Connecté à MongoDB\x1b[0m\n');

    const User = require('./models/User');

    // ÉTAPE 1 : Réinitialiser les mots de passe
    console.log('\x1b[36m========================================\x1b[0m');
    console.log('\x1b[36m  ÉTAPE 1: RÉINITIALISATION DES MOTS DE PASSE\x1b[0m');
    console.log('\x1b[36m========================================\x1b[0m\n');

    const users = [];
    let passwordResetCount = 0;

    for (const config of accountsConfig) {
      console.log(`\x1b[33m🔄 Traitement de ${config.username}...\x1b[0m`);
      
      const user = await User.findOne({ username: config.username, isActive: true });
      
      if (!user) {
        console.log(`  \x1b[31m❌ Utilisateur non trouvé\x1b[0m\n`);
        continue;
      }

      // Hasher le mot de passe
      const hashedPassword = await bcrypt.hash(config.password, 12);
      
      // Mettre à jour
      await User.updateOne(
        { _id: user._id },
        { $set: { password: hashedPassword } }
      );

      // Vérifier
      const updatedUser = await User.findById(user._id);
      const isValid = await bcrypt.compare(config.password, updatedUser.password);
      
      if (isValid) {
        console.log(`  \x1b[32m✅ Mot de passe réinitialisé et vérifié\x1b[0m`);
        console.log(`  \x1b[90m   Password: ${config.password}\x1b[0m\n`);
        passwordResetCount++;
        users.push(updatedUser);
      } else {
        console.log(`  \x1b[33m⚠️  Réinitialisé mais vérification échouée\x1b[0m\n`);
        users.push(updatedUser);
      }
    }

    console.log(`\x1b[32m✅ ${passwordResetCount}/${accountsConfig.length} mots de passe réinitialisés\x1b[0m\n`);

    // ÉTAPE 2 : Lier les comptes
    console.log('\x1b[36m========================================\x1b[0m');
    console.log('\x1b[36m  ÉTAPE 2: LIAGE DES COMPTES\x1b[0m');
    console.log('\x1b[36m========================================\x1b[0m\n');

    if (users.length < 2) {
      console.log('\x1b[33m⚠️  Pas assez de comptes pour lier\x1b[0m\n');
    } else {
      // Vérifier si un compte a déjà un familyId
      let familyId = null;
      for (const user of users) {
        if (user.accountFamilyId) {
          familyId = user.accountFamilyId;
          console.log(`\x1b[33m📌 Utilisation du familyId existant: ${familyId}\x1b[0m\n`);
          break;
        }
      }

      // Créer un nouveau familyId si nécessaire
      if (!familyId) {
        familyId = uuidv4();
        console.log(`\x1b[33m📌 Création d'un nouveau familyId: ${familyId}\x1b[0m\n`);
      }

      // Lier tous les comptes
      let linkedCount = 0;
      for (const user of users) {
        await User.updateOne(
          { _id: user._id },
          { $set: { accountFamilyId: familyId } }
        );
        console.log(`  \x1b[32m✅ ${user.username} lié\x1b[0m`);
        linkedCount++;
      }

      console.log(`\n\x1b[32m✅ ${linkedCount} comptes liés\x1b[0m\n`);
    }

    // RÉSUMÉ FINAL
    console.log('\x1b[36m========================================\x1b[0m');
    console.log('\x1b[36m  RÉSUMÉ FINAL\x1b[0m');
    console.log('\x1b[36m========================================\x1b[0m\n');

    console.log('\x1b[32m✅ COMPTES CONFIGURÉS:\x1b[0m\n');
    
    for (const config of accountsConfig) {
      const user = users.find(u => u.username === config.username);
      if (user) {
        console.log(`  • ${config.username}`);
        console.log(`    Nom: ${user.firstName} ${user.lastName}`);
        console.log(`    Password: ${config.password}`);
        console.log(`    FamilyID: ${user.accountFamilyId || 'Non lié'}`);
        console.log('');
      }
    }

    console.log('\x1b[33m💡 PROCHAINES ÉTAPES:\x1b[0m');
    console.log('  1. Connectez-vous avec n\'importe quel compte');
    console.log('  2. Cliquez sur votre avatar');
    console.log('  3. Vous verrez tous vos comptes liés');
    console.log('  4. Cliquez sur un compte pour switcher\n');

  } catch (error) {
    console.log('\n\x1b[31m❌ ERREUR:\x1b[0m');
    console.log('\x1b[31m' + error.message + '\x1b[0m');
    console.log('\x1b[31m' + error.stack + '\x1b[0m\n');
  } finally {
    await mongoose.disconnect();
    console.log('\x1b[33m🔌 Déconnecté de MongoDB\x1b[0m\n');
  }
}

main();
