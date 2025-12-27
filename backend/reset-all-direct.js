// Script de réinitialisation multiple avec connexion directe MongoDB
// Usage: node reset-all-direct.js

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

console.log('\x1b[36m========================================\x1b[0m');
console.log('\x1b[36m  RÉINITIALISATION MULTIPLE\x1b[0m');
console.log('\x1b[36m  (Connexion directe MongoDB)\x1b[0m');
console.log('\x1b[36m========================================\x1b[0m');
console.log('');

// ⚠️ CONFIGUREZ VOS UTILISATEURS ICI
const usersToReset = [
  { username: 'Louis', password: 'Azerty1234A' },
  { username: 'Jack', password: 'Azerty1234A' },
  { username: 'Snow', password: 'Azerty1234&' }
  // Ajoutez d'autres utilisateurs ici
];

async function main() {
  let successCount = 0;
  let errorCount = 0;
  const results = [];

  try {
    // Connexion à MongoDB
    console.log('\x1b[33m🔄 Connexion à MongoDB...\x1b[0m');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/compta_db';
    await mongoose.connect(mongoUri);
    
    console.log('\x1b[32m✅ Connecté à MongoDB\x1b[0m\n');

    // Charger le modèle User
    const User = require('./models/User');

    console.log('\x1b[36m📋 Utilisateurs à réinitialiser: ' + usersToReset.length + '\x1b[0m\n');

    // Réinitialiser chaque utilisateur
    for (const userConfig of usersToReset) {
      console.log('\x1b[33m🔄 Traitement de: ' + userConfig.username + '\x1b[0m');
      
      try {
        // Vérifier si l'utilisateur existe
        const user = await User.findOne({ username: userConfig.username });
        
        if (!user) {
          console.log('  \x1b[31m❌ Utilisateur non trouvé\x1b[0m\n');
          errorCount++;
          results.push({
            username: userConfig.username,
            success: false,
            error: 'Utilisateur non trouvé'
          });
          continue;
        }

        // Hasher le nouveau mot de passe
        const hashedPassword = await bcrypt.hash(userConfig.password, 12);
        
        // Mettre à jour dans MongoDB
        await User.updateOne(
          { _id: user._id },
          { $set: { password: hashedPassword } }
        );
        
        // Vérifier que ça fonctionne
        const updatedUser = await User.findById(user._id);
        const isValid = await bcrypt.compare(userConfig.password, updatedUser.password);
        
        if (isValid) {
          console.log('  \x1b[32m✅ Mot de passe réinitialisé et vérifié\x1b[0m');
          console.log('  \x1b[90m   ID: ' + user._id + '\x1b[0m\n');
          successCount++;
          results.push({
            username: userConfig.username,
            success: true,
            password: userConfig.password
          });
        } else {
          console.log('  \x1b[33m⚠️  Mis à jour mais vérification échouée\x1b[0m\n');
          successCount++;
          results.push({
            username: userConfig.username,
            success: true,
            warning: 'Vérification échouée'
          });
        }
        
      } catch (error) {
        console.log('  \x1b[31m❌ Erreur: ' + error.message + '\x1b[0m\n');
        errorCount++;
        results.push({
          username: userConfig.username,
          success: false,
          error: error.message
        });
      }
    }

    // Afficher le résumé
    console.log('\x1b[36m========================================\x1b[0m');
    console.log('\x1b[36m  RÉSUMÉ\x1b[0m');
    console.log('\x1b[36m========================================\x1b[0m');
    console.log('\x1b[32m✅ Réussis: ' + successCount + '\x1b[0m');
    console.log('\x1b[31m❌ Erreurs: ' + errorCount + '\x1b[0m');
    console.log('');

    // Afficher les détails
    if (successCount > 0) {
      console.log('\x1b[32m✅ COMPTES RÉINITIALISÉS:\x1b[0m');
      results.filter(r => r.success).forEach(r => {
        console.log('  • ' + r.username + ' → ' + r.password);
      });
      console.log('');
    }

    if (errorCount > 0) {
      console.log('\x1b[31m❌ ERREURS:\x1b[0m');
      results.filter(r => !r.success).forEach(r => {
        console.log('  • ' + r.username + ' → ' + r.error);
      });
      console.log('');
    }

  } catch (error) {
    console.log('\n\x1b[31m❌ ERREUR FATALE:\x1b[0m');
    console.log('\x1b[31m' + error.message + '\x1b[0m\n');
  } finally {
    // Fermer la connexion MongoDB
    await mongoose.disconnect();
    console.log('\x1b[33m🔌 Déconnecté de MongoDB\x1b[0m\n');
  }
}

// Lancer le script
main();
