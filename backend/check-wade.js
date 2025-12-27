// Script pour vérifier si Wade existe
// Usage: node check-wade.js

require('dotenv').config();
const mongoose = require('mongoose');

console.log('\x1b[36m========================================\x1b[0m');
console.log('\x1b[36m  VÉRIFICATION COMPTE WADE\x1b[0m');
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

    // Chercher Wade
    const wade = await User.findOne({ username: 'Wade' });
    
    if (wade) {
      console.log('\x1b[32m✅ COMPTE WADE TROUVÉ:\x1b[0m\n');
      console.log('ID: ' + wade._id);
      console.log('Username: ' + wade.username);
      console.log('Nom: ' + wade.firstName + ' ' + wade.lastName);
      console.log('Téléphone: ' + wade.phoneNumber);
      console.log('Compte bancaire: ' + wade.compteBancaire);
      console.log('Actif: ' + (wade.isActive ? 'Oui' : 'Non'));
      console.log('Validé entreprise: ' + (wade.isCompanyValidated ? 'Oui' : 'Non'));
      console.log('AccountFamilyId: ' + (wade.accountFamilyId || 'Aucun'));
      console.log('Créé le: ' + wade.createdAt);
      console.log('');
    } else {
      console.log('\x1b[31m❌ COMPTE WADE NON TROUVÉ\x1b[0m\n');
      console.log('\x1b[33m💡 Le compte n\'a peut-être pas été créé correctement.\x1b[0m');
      console.log('\x1b[33m   Vérifiez les logs du backend lors de la création.\x1b[0m\n');
    }

    // Afficher tous les comptes
    console.log('\x1b[36m📋 TOUS LES COMPTES ACTIFS:\x1b[0m\n');
    const allUsers = await User.find({ isActive: true })
      .select('username firstName lastName createdAt')
      .sort({ createdAt: -1 });
    
    allUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.username} (${user.firstName} ${user.lastName}) - Créé le ${user.createdAt.toLocaleString()}`);
    });
    console.log('');

  } catch (error) {
    console.log('\n\x1b[31m❌ ERREUR:\x1b[0m');
    console.log('\x1b[31m' + error.message + '\x1b[0m\n');
  } finally {
    await mongoose.disconnect();
    console.log('\x1b[33m🔌 Déconnecté de MongoDB\x1b[0m\n');
  }
}

main();
