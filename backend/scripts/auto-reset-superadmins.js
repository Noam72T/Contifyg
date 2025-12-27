/**
 * Script pour réinitialiser automatiquement TOUS les SuperAdmin chaque semaine
 * À exécuter via un cron job chaque lundi à 00:00
 * 
 * Usage:
 * node scripts/auto-reset-superadmins.js
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

function getStartOfWeek(year, week) {
  const jan4 = new Date(year, 0, 4);
  const startOfWeek = new Date(jan4.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
  startOfWeek.setDate(startOfWeek.getDate() - jan4.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
}

async function autoResetAllSuperAdmins() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🔄 RESET AUTOMATIQUE HEBDOMADAIRE - TOUS LES SUPERADMIN');
    console.log('='.repeat(60));
    console.log(`Date: ${new Date().toLocaleString('fr-FR')}`);
    console.log('='.repeat(60) + '\n');

    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté\n');

    // Récupérer tous les SuperAdmin
    const superAdmins = await User.find({ systemRole: 'SuperAdmin' })
      .populate('company', 'name');
    
    if (superAdmins.length === 0) {
      console.log('ℹ️  Aucun SuperAdmin trouvé');
      return;
    }

    console.log(`👥 ${superAdmins.length} SuperAdmin(s) trouvé(s):\n`);
    superAdmins.forEach((user, i) => {
      console.log(`   ${i + 1}. ${user.username} (${user.firstName} ${user.lastName}) - ${user.company?.name || 'Aucune entreprise'}`);
    });
    console.log('');

    // Calculer la semaine actuelle
    const now = new Date();
    const currentWeek = now.getWeek();
    const currentYear = now.getFullYear();
    const startOfCurrentWeek = getStartOfWeek(currentYear, currentWeek);

    console.log('📅 PÉRIODE:');
    console.log(`   Semaine actuelle: ${currentWeek}/${currentYear}`);
    console.log(`   Début de semaine: ${startOfCurrentWeek.toLocaleDateString('fr-FR')}`);
    console.log('');

    let totalVentesDeleted = 0;
    let totalTimersDeleted = 0;
    let totalSalairesDeleted = 0;
    let usersReset = 0;

    // Reset chaque SuperAdmin
    for (const user of superAdmins) {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`🔄 Reset: ${user.username} (${user.firstName} ${user.lastName})`);
      console.log(`${'─'.repeat(60)}`);

      try {
        // 1. Supprimer les ventes des semaines précédentes
        const deleteVentesResult = await Vente.deleteMany({
          vendeur: user._id,
          company: user.company,
          dateVente: { $lt: startOfCurrentWeek }
        });
        console.log(`   🗑️  Ventes supprimées: ${deleteVentesResult.deletedCount}`);
        totalVentesDeleted += deleteVentesResult.deletedCount;

        // Note: Les sessions timer ne sont PAS supprimées, conservées pour l'historique
        console.log(`   ℹ️  Timers conservés (filtrage automatique par semaine)`);

        // 3. Réinitialiser les données financières
        user.chiffreAffaires = 0;
        user.avances = 0;
        user.primes = 0;
        user.salaireActuel = 0;
        await user.save();
        console.log(`   ✅ Données User réinitialisées`);

        // 4. Supprimer les salaires hebdomadaires de la semaine précédente
        const deleteSalaireResult = await Salaire.deleteMany({
          employe: user._id,
          company: user.company,
          'periode.semaine': { $lt: currentWeek },
          'periode.annee': currentYear
        });
        console.log(`   🗑️  Salaires hebdo supprimés: ${deleteSalaireResult.deletedCount}`);
        totalSalairesDeleted += deleteSalaireResult.deletedCount;

        // 5. Supprimer les anciens salaires mensuels non payés
        const deleteOldSalaireResult = await Salaire.deleteMany({
          employe: user._id,
          company: user.company,
          statut: { $ne: 'Payé' },
          'periode.semaine': { $exists: false }
        });
        if (deleteOldSalaireResult.deletedCount > 0) {
          console.log(`   🗑️  Anciens salaires supprimés: ${deleteOldSalaireResult.deletedCount}`);
          totalSalairesDeleted += deleteOldSalaireResult.deletedCount;
        }

        console.log(`   ✅ Reset terminé pour ${user.username}`);
        usersReset++;

      } catch (error) {
        console.error(`   ❌ Erreur pour ${user.username}:`, error.message);
      }
    }

    // Résumé final
    console.log('\n' + '='.repeat(60));
    console.log('✅ RESET AUTOMATIQUE TERMINÉ');
    console.log('='.repeat(60));
    console.log(`👥 SuperAdmin reset: ${usersReset}/${superAdmins.length}`);
    console.log(`🗑️  Total ventes supprimées: ${totalVentesDeleted}`);
    console.log(`🗑️  Total timers supprimés: ${totalTimersDeleted}`);
    console.log(`🗑️  Total salaires supprimés: ${totalSalairesDeleted}`);
    console.log('='.repeat(60));
    console.log(`\n✨ Tous les SuperAdmin peuvent commencer la semaine ${currentWeek}/${currentYear} proprement !`);

  } catch (error) {
    console.error('\n❌ ERREUR GLOBALE:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté de MongoDB\n');
  }
}

// Exécution
autoResetAllSuperAdmins();
