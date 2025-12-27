// Script pour lier plusieurs comptes à la même personne
// Usage: node link-accounts.js

require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\x1b[36m========================================\x1b[0m');
console.log('\x1b[36m  LIER DES COMPTES\x1b[0m');
console.log('\x1b[36m========================================\x1b[0m');
console.log('');

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  try {
    // Connexion à MongoDB
    console.log('\x1b[33m🔄 Connexion à MongoDB...\x1b[0m');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/compta_db';
    await mongoose.connect(mongoUri);
    
    console.log('\x1b[32m✅ Connecté à MongoDB\x1b[0m\n');

    const User = require('./models/User');

    // Afficher tous les utilisateurs
    const users = await User.find({ isActive: true })
      .select('username firstName lastName accountFamilyId company')
      .sort({ createdAt: 1 });

    console.log('\x1b[36m📋 Utilisateurs disponibles:\x1b[0m\n');
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.username} (${user.firstName} ${user.lastName})`);
      if (user.accountFamilyId) {
        console.log(`     \x1b[90mDéjà lié: ${user.accountFamilyId}\x1b[0m`);
      }
    });
    console.log('');

    // Demander quels comptes lier
    const usernamesToLink = await question('Entrez les noms d\'utilisateur à lier (séparés par des virgules): ');
    const usernameList = usernamesToLink.split(',').map(u => u.trim());

    if (usernameList.length < 2) {
      console.log('\n\x1b[31m❌ Vous devez lier au moins 2 comptes!\x1b[0m\n');
      await mongoose.disconnect();
      rl.close();
      process.exit(1);
    }

    // Vérifier que tous les utilisateurs existent
    const accountsToLink = [];
    for (const username of usernameList) {
      const user = await User.findOne({ username, isActive: true });
      if (!user) {
        console.log(`\n\x1b[31m❌ Utilisateur "${username}" non trouvé!\x1b[0m\n`);
        await mongoose.disconnect();
        rl.close();
        process.exit(1);
      }
      accountsToLink.push(user);
    }

    console.log('\n\x1b[36m📋 Comptes à lier:\x1b[0m');
    accountsToLink.forEach(user => {
      console.log(`  • ${user.username} (${user.firstName} ${user.lastName})`);
    });
    console.log('');

    const confirm = await question('Confirmer le liage de ces comptes? (oui/non): ');
    
    if (confirm.toLowerCase() !== 'oui' && confirm.toLowerCase() !== 'o') {
      console.log('\n\x1b[33m❌ Opération annulée\x1b[0m\n');
      await mongoose.disconnect();
      rl.close();
      process.exit(0);
    }

    // Générer un nouvel ID de famille ou utiliser un existant
    let familyId = null;
    
    // Vérifier si un des comptes a déjà un familyId
    for (const user of accountsToLink) {
      if (user.accountFamilyId) {
        familyId = user.accountFamilyId;
        console.log(`\n\x1b[33m📌 Utilisation du familyId existant: ${familyId}\x1b[0m`);
        break;
      }
    }

    // Si aucun familyId existant, en créer un nouveau
    if (!familyId) {
      familyId = uuidv4();
      console.log(`\n\x1b[33m📌 Création d'un nouveau familyId: ${familyId}\x1b[0m`);
    }

    console.log('\n\x1b[33m🔄 Mise à jour des comptes...\x1b[0m\n');

    // Mettre à jour tous les comptes avec le même familyId
    for (const user of accountsToLink) {
      await User.updateOne(
        { _id: user._id },
        { $set: { accountFamilyId: familyId } }
      );
      console.log(`  \x1b[32m✅ ${user.username} lié\x1b[0m`);
    }

    console.log('\n\x1b[32m========================================\x1b[0m');
    console.log('\x1b[32m  ✅ SUCCÈS!\x1b[0m');
    console.log('\x1b[32m========================================\x1b[0m\n');
    console.log(`\x1b[36mFamille ID: ${familyId}\x1b[0m`);
    console.log(`\x1b[36mComptes liés: ${accountsToLink.length}\x1b[0m\n`);
    console.log('\x1b[33m💡 Ces comptes apparaîtront maintenant dans "Mes Comptes"\x1b[0m\n');

  } catch (error) {
    console.log('\n\x1b[31m❌ ERREUR:\x1b[0m');
    console.log('\x1b[31m' + error.message + '\x1b[0m\n');
  } finally {
    await mongoose.disconnect();
    console.log('\x1b[33m🔌 Déconnecté de MongoDB\x1b[0m\n');
    rl.close();
  }
}

main();
