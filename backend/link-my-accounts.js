// Script rapide pour lier vos comptes
// Usage: node link-my-accounts.js

require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

console.log('\x1b[36m========================================\x1b[0m');
console.log('\x1b[36m  LIER MES COMPTES\x1b[0m');
console.log('\x1b[36m========================================\x1b[0m');
console.log('');

// ⚠️ CONFIGUREZ VOS COMPTES ICI
const accountsToLink = ['Jack', 'Snow', 'Louis'];

async function main() {
  try {
    // Connexion à MongoDB
    console.log('\x1b[33m🔄 Connexion à MongoDB...\x1b[0m');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/compta_db';
    await mongoose.connect(mongoUri);
    
    console.log('\x1b[32m✅ Connecté à MongoDB\x1b[0m\n');

    const User = require('./models/User');

    console.log('\x1b[36m📋 Comptes à lier:\x1b[0m');
    accountsToLink.forEach(username => {
      console.log(`  • ${username}`);
    });
    console.log('');

    // Vérifier que tous les utilisateurs existent
    const users = [];
    for (const username of accountsToLink) {
      const user = await User.findOne({ username, isActive: true });
      if (!user) {
        console.log(`\x1b[31m❌ Utilisateur "${username}" non trouvé!\x1b[0m`);
        continue;
      }
      users.push(user);
      console.log(`\x1b[32m✅ ${username} trouvé (${user.firstName} ${user.lastName})\x1b[0m`);
    }

    if (users.length < 2) {
      console.log('\n\x1b[31m❌ Pas assez de comptes trouvés pour lier!\x1b[0m\n');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('');

    // Vérifier si un des comptes a déjà un familyId
    let familyId = null;
    for (const user of users) {
      if (user.accountFamilyId) {
        familyId = user.accountFamilyId;
        console.log(`\x1b[33m📌 Utilisation du familyId existant: ${familyId}\x1b[0m`);
        break;
      }
    }

    // Si aucun familyId existant, en créer un nouveau
    if (!familyId) {
      familyId = uuidv4();
      console.log(`\x1b[33m📌 Création d'un nouveau familyId: ${familyId}\x1b[0m`);
    }

    console.log('\n\x1b[33m🔄 Mise à jour des comptes...\x1b[0m\n');

    // Mettre à jour tous les comptes avec le même familyId
    let successCount = 0;
    for (const user of users) {
      try {
        await User.updateOne(
          { _id: user._id },
          { $set: { accountFamilyId: familyId } }
        );
        console.log(`  \x1b[32m✅ ${user.username} lié\x1b[0m`);
        successCount++;
      } catch (error) {
        console.log(`  \x1b[31m❌ Erreur pour ${user.username}: ${error.message}\x1b[0m`);
      }
    }

    console.log('\n\x1b[32m========================================\x1b[0m');
    console.log('\x1b[32m  ✅ SUCCÈS!\x1b[0m');
    console.log('\x1b[32m========================================\x1b[0m\n');
    console.log(`\x1b[36mFamille ID: ${familyId}\x1b[0m`);
    console.log(`\x1b[36mComptes liés: ${successCount}/${users.length}\x1b[0m\n`);
    
    // Vérifier le résultat
    console.log('\x1b[36m📋 Vérification:\x1b[0m');
    const linkedAccounts = await User.find({ 
      accountFamilyId: familyId,
      isActive: true 
    }).select('username firstName lastName');
    
    linkedAccounts.forEach(acc => {
      console.log(`  • ${acc.username} (${acc.firstName} ${acc.lastName})`);
    });
    console.log('');
    
    console.log('\x1b[33m💡 Ces comptes apparaîtront maintenant dans "Mes Comptes"\x1b[0m');
    console.log('\x1b[33m💡 Vous pouvez switcher entre eux depuis le menu utilisateur\x1b[0m\n');

  } catch (error) {
    console.log('\n\x1b[31m❌ ERREUR:\x1b[0m');
    console.log('\x1b[31m' + error.message + '\x1b[0m\n');
  } finally {
    await mongoose.disconnect();
    console.log('\x1b[33m🔌 Déconnecté de MongoDB\x1b[0m\n');
  }
}

main();
