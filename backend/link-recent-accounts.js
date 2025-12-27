// Script pour lier les comptes récemment créés
// Usage: node link-recent-accounts.js

require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

console.log('\x1b[36m========================================\x1b[0m');
console.log('\x1b[36m  LIAISON DES COMPTES RÉCENTS\x1b[0m');
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

    // Récupérer tous les comptes triés par date de création (les plus récents en premier)
    const allUsers = await User.find({})
      .sort({ createdAt: -1 })
      .select('username firstName lastName accountFamilyId createdAt')
      .limit(10);

    console.log('\x1b[36m📋 LES 10 COMPTES LES PLUS RÉCENTS:\x1b[0m\n');
    
    allUsers.forEach((user, index) => {
      const date = new Date(user.createdAt).toLocaleString('fr-FR');
      const familyId = user.accountFamilyId ? user.accountFamilyId.substring(0, 8) + '...' : 'Aucun';
      console.log(`${index + 1}. ${user.username} (${user.firstName} ${user.lastName})`);
      console.log(`   Créé le: ${date}`);
      console.log(`   FamilyId: ${familyId}`);
      console.log('');
    });

    // Demander quels comptes lier
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (query) => new Promise((resolve) => readline.question(query, resolve));

    console.log('\x1b[33m💡 Entrez les numéros des comptes à lier (séparés par des virgules):\x1b[0m');
    const answer = await question('Exemple: 1,2,3 pour lier les comptes 1, 2 et 3: ');
    
    const indices = answer.split(',').map(n => parseInt(n.trim()) - 1);
    const accountsToLink = indices.map(i => allUsers[i]).filter(Boolean);

    if (accountsToLink.length < 2) {
      console.log('\x1b[31m❌ Vous devez sélectionner au moins 2 comptes!\x1b[0m\n');
      readline.close();
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('\n\x1b[36m📝 COMPTES SÉLECTIONNÉS:\x1b[0m');
    accountsToLink.forEach(acc => {
      console.log(`  - ${acc.username} (${acc.firstName} ${acc.lastName})`);
    });

    const confirm = await question('\n\x1b[33mConfirmer la liaison de ces comptes? (oui/non): \x1b[0m');
    
    if (confirm.toLowerCase() !== 'oui') {
      console.log('\x1b[31m❌ Opération annulée\x1b[0m\n');
      readline.close();
      await mongoose.disconnect();
      process.exit(0);
    }

    // Trouver ou créer un accountFamilyId
    let familyId = accountsToLink.find(acc => acc.accountFamilyId)?.accountFamilyId;
    
    if (!familyId) {
      familyId = uuidv4();
      console.log(`\n\x1b[33m🆕 Création d'un nouveau FamilyId: ${familyId}\x1b[0m`);
    } else {
      console.log(`\n\x1b[33m🔗 Utilisation du FamilyId existant: ${familyId}\x1b[0m`);
    }

    // Lier tous les comptes
    console.log('\n\x1b[33m🔄 Liaison des comptes...\x1b[0m\n');
    
    for (const account of accountsToLink) {
      await User.findByIdAndUpdate(account._id, {
        accountFamilyId: familyId
      });
      console.log(`  \x1b[32m✅ ${account.username} lié avec succès\x1b[0m`);
    }

    console.log('\n\x1b[32m✅ TOUS LES COMPTES ONT ÉTÉ LIÉS AVEC SUCCÈS!\x1b[0m');
    console.log(`\x1b[32mFamilyId: ${familyId}\x1b[0m\n`);

    console.log('\x1b[36m📋 VÉRIFICATION:\x1b[0m');
    for (const account of accountsToLink) {
      const updated = await User.findById(account._id).select('username accountFamilyId');
      console.log(`  ${updated.username}: ${updated.accountFamilyId === familyId ? '✅' : '❌'}`);
    }
    console.log('');

    readline.close();

  } catch (error) {
    console.log('\n\x1b[31m❌ ERREUR:\x1b[0m');
    console.log('\x1b[31m' + error.message + '\x1b[0m\n');
  } finally {
    await mongoose.disconnect();
    console.log('\x1b[33m🔌 Déconnecté de MongoDB\x1b[0m\n');
  }
}

main();
