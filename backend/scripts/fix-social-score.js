/**
 * Script pour corriger le score social d'un utilisateur
 * Le score social doit être entre 0 et 100
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI;

async function fixSocialScore(username, newScore = 0) {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté\n');

    const user = await User.findOne({ username });
    
    if (!user) {
      console.error(`❌ Utilisateur "${username}" non trouvé`);
      process.exit(1);
    }

    console.log('👤 UTILISATEUR:');
    console.log(`   Username: ${user.username}`);
    console.log(`   Nom: ${user.firstName} ${user.lastName}`);
    console.log(`   Score social actuel: ${user.socialScore || 0}`);
    console.log('');

    // Vérifier si le score est invalide
    if (user.socialScore > 100 || user.socialScore < 0) {
      console.log('⚠️  Score social invalide détecté !');
      console.log(`   Valeur actuelle: ${user.socialScore}`);
      console.log(`   Valeur attendue: 0-100`);
      console.log('');
    }

    // Corriger le score
    const oldScore = user.socialScore;
    user.socialScore = newScore;
    await user.save();

    console.log('✅ SCORE SOCIAL CORRIGÉ:');
    console.log(`   Ancien score: ${oldScore}`);
    console.log(`   Nouveau score: ${user.socialScore}`);
    console.log('');

    console.log('='.repeat(60));
    console.log('✅ CORRECTION TERMINÉE');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté de MongoDB');
  }
}

const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('❌ Usage: node scripts/fix-social-score.js <username> [newScore]');
  console.log('\nExemples:');
  console.log('  node scripts/fix-social-score.js Holl 0');
  console.log('  node scripts/fix-social-score.js Holl 50');
  console.log('\nNote: Le score social doit être entre 0 et 100');
  process.exit(1);
}

const [username, scoreArg] = args;
const newScore = scoreArg ? parseInt(scoreArg) : 0;

if (newScore < 0 || newScore > 100) {
  console.error('❌ Le score social doit être entre 0 et 100');
  process.exit(1);
}

fixSocialScore(username, newScore);
