/**
 * Script pour réinitialiser un SuperAdmin pour la nouvelle semaine
 * Supprime les ventes de la semaine précédente et réinitialise les données
 * 
 * Usage:
 * node scripts/reset-superadmin-weekly.js nom_utilisateur
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
const Salaire = require('../models/Salaire');
const Vente = require('../models/Vente');
const TimerSession = require('../models/TimerSession');

const MONGODB_URI = process.env.MONGODB_URI;

// Fonction pour obtenir le numéro de semaine
Date.prototype.getWeek = function() {
  const date = new Date(this.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

async function resetSuperAdminWeekly(username) {
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

    if (user.systemRole !== 'SuperAdmin') {
      console.log('⚠️  Cet utilisateur n\'est pas SuperAdmin');
      console.log('💡 Ce script est conçu pour les SuperAdmin qui doivent être réinitialisés chaque semaine');
      console.log('💡 Pour les utilisateurs normaux, utilisez le système de paie standard');
      process.exit(0);
    }

    // Calculer la semaine actuelle
    const now = new Date();
    const currentWeek = now.getWeek();
    const currentYear = now.getFullYear();
    const previousWeek = currentWeek - 1;

    console.log('📅 PÉRIODE:');
    console.log(`   Semaine actuelle: ${currentWeek}/${currentYear}`);
    console.log(`   Semaine précédente: ${previousWeek}/${currentYear}`);
    console.log('');

    // 1. Récupérer les statistiques AVANT reset
    console.log('📊 DONNÉES AVANT RESET:');
    
    const toutesVentes = await Vente.find({ 
      vendeur: user._id,
      company: user.company
    });
    
    const ventesParSemaine = {};
    toutesVentes.forEach(v => {
      const venteDate = new Date(v.dateVente);
      const week = venteDate.getWeek();
      const year = venteDate.getFullYear();
      const key = `${week}/${year}`;
      
      if (!ventesParSemaine[key]) {
        ventesParSemaine[key] = {
          count: 0,
          total: 0
        };
      }
      ventesParSemaine[key].count++;
      ventesParSemaine[key].total += (v.commission || 0);
    });
    
    console.log(`   Total ventes: ${toutesVentes.length}`);
    console.log(`   Ventes par semaine:`);
    Object.keys(ventesParSemaine).sort().forEach(key => {
      const data = ventesParSemaine[key];
      console.log(`     Semaine ${key}: ${data.count} ventes, ${data.total.toFixed(2)}$`);
    });
    
    const salairesNonPayes = await Salaire.find({ 
      employe: user._id,
      company: user.company,
      statut: { $ne: 'Payé' }
    });
    
    console.log(`   Chiffre d'affaires: ${user.chiffreAffaires || 0}$`);
    console.log(`   Avances: ${user.avances || 0}$`);
    console.log(`   Primes: ${user.primes || 0}$`);
    console.log(`   Salaire actuel: ${user.salaireActuel || 0}$`);
    console.log(`   Salaires non payés: ${salairesNonPayes.length}`);
    console.log('');

    // 2. Demander confirmation
    console.log('⚠️  ATTENTION: Cette action va:');
    console.log(`   1. Supprimer TOUTES les ventes de la semaine ${previousWeek}/${currentYear} et avant`);
    console.log('   2. Réinitialiser toutes les données financières à 0$');
    console.log('   3. Supprimer tous les salaires non payés');
    console.log(`   4. Garder uniquement les ventes de la semaine ${currentWeek}/${currentYear}`);
    console.log('');

    // 3. Calculer les dates de la semaine actuelle
    function getStartOfWeek(year, week) {
      const jan4 = new Date(year, 0, 4);
      const startOfWeek = new Date(jan4.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
      startOfWeek.setDate(startOfWeek.getDate() - jan4.getDay() + 1);
      return startOfWeek;
    }

    const startOfCurrentWeek = getStartOfWeek(currentYear, currentWeek);

    // 4. Supprimer les ventes des semaines précédentes
    console.log('🗑️  Suppression des ventes des semaines précédentes...');
    const deleteResult = await Vente.deleteMany({
      vendeur: user._id,
      company: user.company,
      dateVente: { $lt: startOfCurrentWeek }
    });
    console.log(`   ✅ ${deleteResult.deletedCount} vente(s) supprimée(s)`);

    // Note: Les sessions timer ne sont PAS supprimées, elles sont conservées pour l'historique
    // Le calcul du salaire filtre automatiquement par semaine

    // 5. Réinitialiser les données financières dans User
    console.log('🔄 Réinitialisation des données financières...');
    user.chiffreAffaires = 0;
    user.avances = 0;
    user.primes = 0;
    user.salaireActuel = 0;
    await user.save();
    console.log('   ✅ Données User réinitialisées');

    // 6. Supprimer les salaires hebdomadaires de la semaine précédente (SuperAdmin uniquement)
    console.log('🗑️  Suppression des salaires hebdomadaires de la semaine précédente...');
    const deleteSalaireResult = await Salaire.deleteMany({ 
      employe: user._id,
      company: user.company,
      'periode.semaine': { $lt: currentWeek }, // Supprimer toutes les semaines précédentes
      'periode.annee': currentYear
    });
    console.log(`   ✅ ${deleteSalaireResult.deletedCount} salaire(s) hebdomadaire(s) supprimé(s)`);
    
    // 7. Supprimer aussi les salaires non payés sans semaine (ancien système)
    if (salairesNonPayes.length > 0) {
      console.log('🗑️  Suppression des salaires non payés (ancien système)...');
      const deleteOldSalaireResult = await Salaire.deleteMany({ 
        employe: user._id,
        company: user.company,
        statut: { $ne: 'Payé' },
        'periode.semaine': { $exists: false } // Seulement les anciens sans semaine
      });
      console.log(`   ✅ ${deleteOldSalaireResult.deletedCount} ancien(s) salaire(s) supprimé(s)`);
    } else {
      console.log('   ℹ️  Aucun ancien salaire non payé à supprimer');
    }

    // 7. Vérifier les données APRÈS reset
    console.log('\n📊 DONNÉES APRÈS RESET:');
    const userAfter = await User.findById(user._id);
    const ventesRestantes = await Vente.countDocuments({ 
      vendeur: user._id,
      company: user.company
    });
    const salairesApres = await Salaire.countDocuments({ 
      employe: user._id,
      company: user.company,
      statut: { $ne: 'Payé' }
    });
    
    console.log(`   Chiffre d'affaires: ${userAfter.chiffreAffaires || 0}$`);
    console.log(`   Avances: ${userAfter.avances || 0}$`);
    console.log(`   Primes: ${userAfter.primes || 0}$`);
    console.log(`   Salaire actuel: ${userAfter.salaireActuel || 0}$`);
    console.log(`   Ventes restantes (semaine ${currentWeek}): ${ventesRestantes}`);
    console.log(`   Salaires non payés: ${salairesApres}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ RESET SUPERADMIN RÉUSSI !');
    console.log('='.repeat(60));
    console.log(`👤 Utilisateur: ${user.username} (SuperAdmin)`);
    console.log(`🏢 Entreprise: ${user.company ? user.company.name : 'Aucune'}`);
    console.log(`💰 Données financières: 0$`);
    console.log(`🗑️  Ventes supprimées: ${deleteResult.deletedCount}`);
    console.log(`📜 Ventes conservées (semaine ${currentWeek}): ${ventesRestantes}`);
    console.log('='.repeat(60));
    console.log('\n✨ Le SuperAdmin peut maintenant commencer la semaine proprement !');
    console.log('💡 Ses ventes de la semaine actuelle sont conservées');

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
  console.log('❌ Usage: node scripts/reset-superadmin-weekly.js <username>');
  console.log('\nExemple:');
  console.log('  node scripts/reset-superadmin-weekly.js Holl');
  console.log('\n💡 Ce script est conçu pour les SuperAdmin qui doivent être réinitialisés chaque semaine');
  console.log('   - Supprime les ventes des semaines précédentes');
  console.log('   - Réinitialise les données financières');
  console.log('   - Garde les ventes de la semaine actuelle');
  console.log('   - Supprime les salaires non payés');
  process.exit(1);
}

const [username] = args;

console.log('\n' + '='.repeat(60));
console.log('🔄 RESET SUPERADMIN HEBDOMADAIRE');
console.log('='.repeat(60));
console.log(`Username: ${username}`);
console.log('='.repeat(60) + '\n');

resetSuperAdminWeekly(username);
