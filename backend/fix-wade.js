// Script pour diagnostiquer et corriger le compte Wade
// Usage: node fix-wade.js

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

console.log('\x1b[36m========================================\x1b[0m');
console.log('\x1b[36m  DIAGNOSTIC ET CORRECTION - WADE\x1b[0m');
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

    // Chercher le compte Wade
    const wade = await User.findOne({ username: 'Wade' });
    
    if (!wade) {
      console.log('\x1b[31m❌ Compte Wade non trouvé!\x1b[0m\n');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('\x1b[36m📋 INFORMATIONS DU COMPTE:\x1b[0m');
    console.log('Username: Wade');
    console.log('ID: ' + wade._id);
    console.log('Nom: ' + wade.firstName + ' ' + wade.lastName);
    console.log('Téléphone: ' + wade.phoneNumber);
    console.log('Compte bancaire: ' + wade.compteBancaire);
    console.log('AccountFamilyId: ' + (wade.accountFamilyId || 'Aucun'));
    console.log('Créé le: ' + wade.createdAt);
    console.log('');

    // Tester le mot de passe actuel
    console.log('\x1b[33m🔍 TEST DU MOT DE PASSE ACTUEL:\x1b[0m');
    const testPassword = 'Azerty1234A';
    
    try {
      const isValid = await bcrypt.compare(testPassword, wade.password);
      if (isValid) {
        console.log('\x1b[32m✅ Le mot de passe "' + testPassword + '" fonctionne!\x1b[0m\n');
      } else {
        console.log('\x1b[31m❌ Le mot de passe "' + testPassword + '" ne fonctionne pas\x1b[0m');
        console.log('\x1b[33m🔄 Réinitialisation du mot de passe...\x1b[0m\n');
        
        // Réinitialiser le mot de passe
        const hashedPassword = await bcrypt.hash(testPassword, 12);
        await User.updateOne(
          { _id: wade._id },
          { $set: { password: hashedPassword } }
        );
        
        // Vérifier
        const updatedWade = await User.findById(wade._id);
        const isValidNow = await bcrypt.compare(testPassword, updatedWade.password);
        
        if (isValidNow) {
          console.log('\x1b[32m✅ Mot de passe réinitialisé avec succès!\x1b[0m\n');
        } else {
          console.log('\x1b[31m❌ Échec de la réinitialisation\x1b[0m\n');
        }
      }
    } catch (error) {
      console.log('\x1b[31m❌ Erreur lors du test: ' + error.message + '\x1b[0m\n');
    }

    // Vérifier/Créer le accountFamilyId
    console.log('\x1b[33m🔗 VÉRIFICATION DU LIAGE:\x1b[0m');
    
    if (!wade.accountFamilyId) {
      console.log('\x1b[33m⚠️  Wade n\'a pas de accountFamilyId\x1b[0m');
      console.log('\x1b[33m🔄 Recherche d\'autres comptes à lier...\x1b[0m\n');
      
      // Chercher les autres comptes (Jack, Snow, Louis)
      const otherAccounts = await User.find({
        username: { $in: ['Jack', 'Snow', 'Louis'] },
        isActive: true
      });
      
      if (otherAccounts.length > 0) {
        // Trouver un familyId existant
        let familyId = null;
        for (const acc of otherAccounts) {
          if (acc.accountFamilyId) {
            familyId = acc.accountFamilyId;
            break;
          }
        }
        
        if (familyId) {
          console.log('\x1b[33m📌 FamilyId trouvé: ' + familyId + '\x1b[0m');
          console.log('\x1b[33m🔄 Liage de Wade...\x1b[0m');
          
          await User.updateOne(
            { _id: wade._id },
            { $set: { accountFamilyId: familyId } }
          );
          
          console.log('\x1b[32m✅ Wade lié aux autres comptes!\x1b[0m\n');
        } else {
          console.log('\x1b[33m⚠️  Aucun familyId trouvé. Exécutez fix-all.js d\'abord.\x1b[0m\n');
        }
      }
    } else {
      console.log('\x1b[32m✅ Wade a déjà un accountFamilyId: ' + wade.accountFamilyId + '\x1b[0m\n');
    }

    // Afficher les comptes liés
    const updatedWade = await User.findById(wade._id);
    if (updatedWade.accountFamilyId) {
      console.log('\x1b[36m📋 COMPTES LIÉS:\x1b[0m');
      const linkedAccounts = await User.find({
        accountFamilyId: updatedWade.accountFamilyId,
        isActive: true
      }).select('username firstName lastName');
      
      linkedAccounts.forEach(acc => {
        console.log('  • ' + acc.username + ' (' + acc.firstName + ' ' + acc.lastName + ')');
      });
      console.log('');
    }

    console.log('\x1b[32m========================================\x1b[0m');
    console.log('\x1b[32m  ✅ CORRECTION TERMINÉE\x1b[0m');
    console.log('\x1b[32m========================================\x1b[0m\n');
    console.log('\x1b[36mVous pouvez maintenant vous connecter avec:\x1b[0m');
    console.log('  Username: Wade');
    console.log('  Password: Azerty1234A\n');

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
