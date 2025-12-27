// Script de réinitialisation de mot de passe avec connexion directe MongoDB
// Usage: node reset-password-direct.js

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\x1b[36m========================================\x1b[0m');
console.log('\x1b[36m  RÉINITIALISATION DE MOT DE PASSE\x1b[0m');
console.log('\x1b[36m  (Connexion directe MongoDB)\x1b[0m');
console.log('\x1b[36m========================================\x1b[0m');
console.log('');

// Fonction pour poser une question
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Fonction principale
async function main() {
  try {
    // Connexion à MongoDB
    console.log('\x1b[33m🔄 Connexion à MongoDB...\x1b[0m');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/compta_db';
    await mongoose.connect(mongoUri);
    
    console.log('\x1b[32m✅ Connecté à MongoDB\x1b[0m\n');

    // Charger le modèle User
    const User = require('./models/User');

    // Demander le nom d'utilisateur
    const username = await question('Entrez le nom d\'utilisateur: ');
    
    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ username });
    
    if (!user) {
      console.log('\n\x1b[31m❌ ERREUR: Utilisateur "' + username + '" non trouvé!\x1b[0m\n');
      await mongoose.disconnect();
      rl.close();
      process.exit(1);
    }
    
    console.log('\x1b[32m✅ Utilisateur trouvé: ' + username + '\x1b[0m');
    console.log('   ID: ' + user._id);
    console.log('   Actif: ' + (user.isActive ? 'Oui' : 'Non'));
    console.log('');
    
    // Demander le nouveau mot de passe
    const newPassword = await question('Entrez le nouveau mot de passe: ');
    
    // Confirmer le mot de passe
    const confirmPassword = await question('Confirmez le nouveau mot de passe: ');
    
    // Vérifier que les mots de passe correspondent
    if (newPassword !== confirmPassword) {
      console.log('\n\x1b[31m❌ ERREUR: Les mots de passe ne correspondent pas!\x1b[0m\n');
      await mongoose.disconnect();
      rl.close();
      process.exit(1);
    }
    
    // Vérifier la longueur du mot de passe
    if (newPassword.length < 6) {
      console.log('\n\x1b[31m❌ ERREUR: Le mot de passe doit contenir au moins 6 caractères!\x1b[0m\n');
      await mongoose.disconnect();
      rl.close();
      process.exit(1);
    }
    
    console.log('\n\x1b[33m🔄 Hashage du mot de passe avec bcryptjs...\x1b[0m');
    
    // Hasher le nouveau mot de passe avec bcryptjs (même que le modèle User)
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    console.log('\x1b[32m✅ Mot de passe hashé\x1b[0m');
    console.log('\x1b[33m🔄 Mise à jour dans la base de données...\x1b[0m');
    
    // Mettre à jour directement dans MongoDB
    await User.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );
    
    console.log('\x1b[32m✅ Mot de passe mis à jour dans MongoDB\x1b[0m\n');
    
    // Vérifier que la mise à jour a fonctionné
    const updatedUser = await User.findById(user._id);
    const isValid = await bcrypt.compare(newPassword, updatedUser.password);
    
    if (isValid) {
      console.log('\x1b[32m========================================\x1b[0m');
      console.log('\x1b[32m  ✅ SUCCÈS!\x1b[0m');
      console.log('\x1b[32m========================================\x1b[0m\n');
      console.log('\x1b[36mVous pouvez maintenant vous connecter avec:\x1b[0m');
      console.log('  Username: \x1b[37m' + username + '\x1b[0m');
      console.log('  Password: \x1b[37m' + newPassword + '\x1b[0m');
      console.log('');
    } else {
      console.log('\n\x1b[31m⚠️  ATTENTION: La vérification du mot de passe a échoué!\x1b[0m');
      console.log('\x1b[31m   Le mot de passe a été mis à jour mais la vérification a échoué.\x1b[0m\n');
    }
    
  } catch (error) {
    console.log('\n\x1b[31m❌ ERREUR:\x1b[0m');
    console.log('\x1b[31m' + error.message + '\x1b[0m');
    console.log('\x1b[31m' + error.stack + '\x1b[0m\n');
  } finally {
    // Fermer la connexion MongoDB
    await mongoose.disconnect();
    console.log('\x1b[33m🔌 Déconnecté de MongoDB\x1b[0m\n');
    rl.close();
  }
}

// Lancer le script
main();
