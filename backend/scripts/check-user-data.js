/**
 * Script pour vérifier toutes les données d'un utilisateur
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');

const MONGODB_URI = process.env.MONGODB_URI;

async function checkUserData(username) {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté\n');

    const user = await User.findOne({ username });
    
    if (!user) {
      console.error(`❌ Utilisateur "${username}" non trouvé`);
      process.exit(1);
    }

    console.log('👤 DONNÉES UTILISATEUR COMPLÈTES:');
    console.log(`   _id: ${user._id}`);
    console.log(`   username: ${user.username}`);
    console.log(`   firstName: ${user.firstName}`);
    console.log(`   lastName: ${user.lastName}`);
    console.log(`   systemRole: ${user.systemRole}`);
    console.log(`   company: ${user.company}`);
    console.log(`   role: ${user.role}`);
    console.log('');
    console.log('💰 DONNÉES FINANCIÈRES:');
    console.log(`   chiffreAffaires: ${user.chiffreAffaires || 0}$`);
    console.log(`   avances: ${user.avances || 0}$`);
    console.log(`   primes: ${user.primes || 0}$`);
    console.log(`   salaireActuel: ${user.salaireActuel || 0}$`);
    console.log(`   socialScore: ${user.socialScore || 0}%`);
    console.log('');
    console.log('📊 AUTRES CHAMPS:');
    console.log(`   isActive: ${user.isActive}`);
    console.log(`   isCompanyValidated: ${user.isCompanyValidated}`);
    console.log(`   createdAt: ${user.createdAt}`);
    console.log(`   updatedAt: ${user.updatedAt}`);

  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté de MongoDB');
  }
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.log('❌ Usage: node scripts/check-user-data.js <username>');
  process.exit(1);
}

checkUserData(args[0]);
