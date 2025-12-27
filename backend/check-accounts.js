// Script de diagnostic des comptes
// Usage: node check-accounts.js

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

console.log('\x1b[36m========================================\x1b[0m');
console.log('\x1b[36m  DIAGNOSTIC DES COMPTES\x1b[0m');
console.log('\x1b[36m========================================\x1b[0m');
console.log('');

async function main() {
  try {
    // Connexion à MongoDB
    console.log('\x1b[33m🔄 Connexion à MongoDB...\x1b[0m');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/compta_db';
    await mongoose.connect(mongoUri);
    
    console.log('\x1b[32m✅ Connecté à MongoDB\x1b[0m\n');

    // Charger le modèle User
    const User = require('./models/User');

    // Récupérer tous les utilisateurs actifs
    const users = await User.find({ isActive: true })
      .select('username firstName lastName discordId isCompanyValidated company createdAt')
      .sort({ createdAt: -1 });

    console.log('\x1b[36m📋 Nombre d\'utilisateurs actifs: ' + users.length + '\x1b[0m\n');

    // Afficher les détails de chaque utilisateur
    for (const user of users) {
      console.log('\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
      console.log('\x1b[37mUsername: \x1b[33m' + user.username + '\x1b[0m');
      console.log('ID: ' + user._id);
      console.log('Nom: ' + (user.firstName || 'N/A') + ' ' + (user.lastName || 'N/A'));
      console.log('Discord ID: ' + (user.discordId || 'N/A'));
      console.log('Validé entreprise: ' + (user.isCompanyValidated ? '\x1b[32mOui\x1b[0m' : '\x1b[31mNon\x1b[0m'));
      console.log('Entreprise: ' + (user.company || 'Aucune'));
      console.log('Créé le: ' + user.createdAt.toLocaleString());
      
      // Tester le mot de passe avec un mot de passe de test
      const testPasswords = ['Azerty1234A', 'Azerty1234&', 'password123'];
      let passwordWorks = false;
      
      for (const testPwd of testPasswords) {
        try {
          const userWithPassword = await User.findById(user._id);
          const isValid = await bcrypt.compare(testPwd, userWithPassword.password);
          if (isValid) {
            console.log('\x1b[32m✅ Mot de passe testé: ' + testPwd + '\x1b[0m');
            passwordWorks = true;
            break;
          }
        } catch (err) {
          // Ignorer les erreurs
        }
      }
      
      if (!passwordWorks) {
        console.log('\x1b[33m⚠️  Aucun mot de passe de test ne fonctionne\x1b[0m');
      }
      
      console.log('');
    }

    // Grouper par discordId pour voir les comptes liés
    console.log('\x1b[36m========================================\x1b[0m');
    console.log('\x1b[36m  COMPTES LIÉS PAR DISCORD\x1b[0m');
    console.log('\x1b[36m========================================\x1b[0m\n');

    const usersWithDiscord = users.filter(u => u.discordId);
    const discordGroups = {};

    usersWithDiscord.forEach(user => {
      if (!discordGroups[user.discordId]) {
        discordGroups[user.discordId] = [];
      }
      discordGroups[user.discordId].push(user);
    });

    Object.entries(discordGroups).forEach(([discordId, accounts]) => {
      console.log('\x1b[33mDiscord ID: ' + discordId + '\x1b[0m');
      console.log('Nombre de comptes: ' + accounts.length);
      accounts.forEach(acc => {
        console.log('  • ' + acc.username + ' (' + acc.firstName + ' ' + acc.lastName + ')');
      });
      console.log('');
    });

    // Comptes sans Discord
    const usersWithoutDiscord = users.filter(u => !u.discordId);
    if (usersWithoutDiscord.length > 0) {
      console.log('\x1b[33m📋 Comptes SANS Discord: ' + usersWithoutDiscord.length + '\x1b[0m');
      usersWithoutDiscord.forEach(user => {
        console.log('  • ' + user.username);
      });
      console.log('');
    }

  } catch (error) {
    console.log('\n\x1b[31m❌ ERREUR:\x1b[0m');
    console.log('\x1b[31m' + error.message + '\x1b[0m\n');
  } finally {
    await mongoose.disconnect();
    console.log('\x1b[33m🔌 Déconnecté de MongoDB\x1b[0m\n');
  }
}

main();
