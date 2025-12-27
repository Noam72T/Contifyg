/**
 * Script pour réinitialiser complètement un utilisateur pour une nouvelle semaine
 * Réinitialise les données financières ET supprime les salaires non payés
 * 
 * Usage:
 * node scripts/reset-user-for-new-week.js nom_utilisateur
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
const Salaire = require('../models/Salaire');
const Vente = require('../models/Vente');

const MONGODB_URI = process.env.MONGODB_URI;

async function resetUserForNewWeek(username) {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté\n');

    const user = await User.findOne({ username })
      .populate('company', 'name');
    
    if (!user) {
      console.error(`❌ Utilisateur "${username}" non trouvé`);
      process.exit(1);
    }

    console.log('👤 UTILISATEUR:');
    console.log(`   Username: ${user.username}`);
    console.log(`   Nom: ${user.firstName} ${user.lastName}`);
    console.log(`   Rôle système: ${user.systemRole}`);
    console.log(`   Entreprise: ${user.company ? user.company.name : 'Aucune'}`);
    console.log('');

    // 1. Récupérer les statistiques AVANT reset
    console.log('📊 DONNÉES AVANT RESET:');
    
    const ventesCount = await Vente.countDocuments({ 
      vendeur: user._id,
      company: user.company
    });
    
    const salairesNonPayes = await Salaire.find({ 
      employe: user._id,
      company: user.company,
      statut: { $ne: 'Payé' }
    });
    
    console.log(`   Ventes totales: ${ventesCount}`);
    console.log(`   Chiffre d'affaires: ${user.chiffreAffaires || 0}$`);
    console.log(`   Avances: ${user.avances || 0}$`);
    console.log(`   Primes: ${user.primes || 0}$`);
    console.log(`   Salaire actuel: ${user.salaireActuel || 0}$`);
    console.log(`   Salaires non payés: ${salairesNonPayes.length}`);
    
    if (salairesNonPayes.length > 0) {
      console.log('\n   Détails des salaires non payés:');
      salairesNonPayes.forEach(s => {
        console.log(`   - Semaine ${s.semaine}/${s.annee}: ${s.montant}$ (${s.statut})`);
      });
    }
    console.log('');

    // 2. Demander confirmation (simulation)
    console.log('⚠️  ATTENTION: Cette action va:');
    console.log('   1. Réinitialiser toutes les données financières à 0$');
    console.log('   2. Supprimer tous les salaires non payés');
    console.log('   3. Garder toutes les ventes (historique)');
    console.log('');

    // 3. Réinitialiser les données financières dans User
    console.log('🔄 Réinitialisation des données financières...');
    user.chiffreAffaires = 0;
    user.avances = 0;
    user.primes = 0;
    user.salaireActuel = 0;
    await user.save();
    console.log('   ✅ Données User réinitialisées');

    // 4. Supprimer les salaires non payés
    if (salairesNonPayes.length > 0) {
      console.log('🗑️  Suppression des salaires non payés...');
      const deleteResult = await Salaire.deleteMany({ 
        employe: user._id,
        company: user.company,
        statut: { $ne: 'Payé' }
      });
      console.log(`   ✅ ${deleteResult.deletedCount} salaire(s) supprimé(s)`);
    } else {
      console.log('   ℹ️  Aucun salaire non payé à supprimer');
    }

    // 5. Vérifier les données APRÈS reset
    console.log('\n📊 DONNÉES APRÈS RESET:');
    const userAfter = await User.findById(user._id);
    const salairesApres = await Salaire.countDocuments({ 
      employe: user._id,
      company: user.company,
      statut: { $ne: 'Payé' }
    });
    
    console.log(`   Chiffre d'affaires: ${userAfter.chiffreAffaires || 0}$`);
    console.log(`   Avances: ${userAfter.avances || 0}$`);
    console.log(`   Primes: ${userAfter.primes || 0}$`);
    console.log(`   Salaire actuel: ${userAfter.salaireActuel || 0}$`);
    console.log(`   Salaires non payés: ${salairesApres}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ RESET COMPLET RÉUSSI !');
    console.log('='.repeat(60));
    console.log(`👤 Utilisateur: ${user.username}`);
    console.log(`🏢 Entreprise: ${user.company ? user.company.name : 'Aucune'}`);
    console.log(`💰 Toutes les données financières: 0$`);
    console.log(`🗑️  Salaires non payés supprimés: ${salairesNonPayes.length}`);
    console.log(`📜 Ventes conservées: ${ventesCount}`);
    console.log('='.repeat(60));
    console.log('\n✨ L\'utilisateur peut maintenant commencer la nouvelle semaine !');

  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté de MongoDB');
  }
}

// Récupérer les arguments
const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('❌ Usage: node scripts/reset-user-for-new-week.js <username>');
  console.log('\nExemple:');
  console.log('  node scripts/reset-user-for-new-week.js Holl');
  console.log('\n💡 Ce script va:');
  console.log('   - Réinitialiser toutes les données financières à 0$');
  console.log('   - Supprimer tous les salaires non payés');
  console.log('   - Garder l\'historique des ventes');
  console.log('   - Préparer l\'utilisateur pour la nouvelle semaine');
  process.exit(1);
}

const [username] = args;

console.log('\n' + '='.repeat(60));
console.log('🔄 RESET UTILISATEUR POUR NOUVELLE SEMAINE');
console.log('='.repeat(60));
console.log(`Username: ${username}`);
console.log('='.repeat(60) + '\n');

resetUserForNewWeek(username);
