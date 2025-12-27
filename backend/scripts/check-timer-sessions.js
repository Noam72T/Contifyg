/**
 * Script pour vérifier les sessions timer d'un utilisateur
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
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

function getEndOfWeek(year, week) {
  const start = getStartOfWeek(year, week);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

async function checkTimerSessions(username) {
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
    console.log(`   Entreprise: ${user.company ? user.company.name : 'Aucune'}`);
    console.log('');

    // Calculer la semaine actuelle
    const now = new Date();
    const currentWeek = now.getWeek();
    const currentYear = now.getFullYear();

    console.log('📅 PÉRIODE ACTUELLE:');
    console.log(`   Semaine: ${currentWeek}/${currentYear}`);
    console.log('');

    // Dates de la semaine
    const startOfWeek = getStartOfWeek(currentYear, currentWeek);
    const endOfWeek = getEndOfWeek(currentYear, currentWeek);

    console.log('📅 DATES DE LA SEMAINE:');
    console.log(`   Début: ${startOfWeek.toLocaleDateString('fr-FR')}`);
    console.log(`   Fin: ${endOfWeek.toLocaleDateString('fr-FR')}`);
    console.log('');

    // Récupérer les sessions timer de la semaine actuelle
    const sessionsWeek = await TimerSession.find({
      utilisateur: user._id,
      company: user.company,
      createdAt: {
        $gte: startOfWeek,
        $lte: endOfWeek
      }
    }).populate('vehicle', 'nom tarifParMinute');

    console.log('⏱️  SESSIONS TIMER DE LA SEMAINE ACTUELLE:');
    console.log(`   Nombre: ${sessionsWeek.length}`);
    if (sessionsWeek.length > 0) {
      const totalCA = sessionsWeek.reduce((sum, s) => sum + (s.coutCalcule || s.coutTotal || 0), 0);
      console.log(`   CA total: ${totalCA.toFixed(2)}$`);
      console.log('');
      sessionsWeek.forEach((s, i) => {
        const cout = s.coutCalcule || s.coutTotal || 0;
        const duree = s.dureeMinutes || 0;
        console.log(`   ${i + 1}. ${s.vehicle?.nom || 'N/A'} - ${cout.toFixed(2)}$ - ${duree}min - ${s.statut}`);
        console.log(`      Date: ${s.createdAt.toLocaleDateString('fr-FR')} ${s.createdAt.toLocaleTimeString('fr-FR')}`);
      });
    } else {
      console.log('   ❌ Aucune session cette semaine');
    }
    console.log('');

    // Récupérer toutes les sessions timer
    const toutesSessionsCount = await TimerSession.countDocuments({
      utilisateur: user._id,
      company: user.company
    });

    const dernieresSessions = await TimerSession.find({
      utilisateur: user._id,
      company: user.company
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('vehicle', 'nom tarifParMinute');

    console.log('⏱️  TOUTES LES SESSIONS TIMER:');
    console.log(`   Total: ${toutesSessionsCount}`);
    if (dernieresSessions.length > 0) {
      console.log('   Dernières sessions:');
      dernieresSessions.forEach((s, i) => {
        const cout = s.coutCalcule || s.coutTotal || 0;
        const sessionWeek = new Date(s.createdAt).getWeek();
        const sessionYear = new Date(s.createdAt).getFullYear();
        console.log(`   ${i + 1}. ${s.vehicle?.nom || 'N/A'} - ${cout.toFixed(2)}$ - ${s.statut} - S${sessionWeek}/${sessionYear}`);
        console.log(`      Date: ${s.createdAt.toLocaleDateString('fr-FR')}`);
      });
    }
    console.log('');

    console.log('='.repeat(60));
    console.log('✅ VÉRIFICATION TERMINÉE');
    console.log('='.repeat(60));

    // Diagnostic
    console.log('\n🔍 DIAGNOSTIC:');
    if (sessionsWeek.length === 0) {
      console.log('✅ Aucune session timer cette semaine');
    } else {
      const caWeek = sessionsWeek.reduce((sum, s) => sum + (s.coutCalcule || s.coutTotal || 0), 0);
      console.log(`⚠️  ${sessionsWeek.length} session(s) timer cette semaine → CA: ${caWeek.toFixed(2)}$`);
      console.log('');
      console.log('💡 SOLUTION:');
      console.log('   Les sessions timer de la semaine précédente doivent être supprimées');
      console.log('   pour les SuperAdmin lors du reset hebdomadaire.');
      console.log('');
      console.log('   Pour supprimer manuellement ces sessions:');
      console.log(`   node scripts/delete-timer-sessions.js ${username} ${currentWeek} ${currentYear}`);
    }

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
  console.log('❌ Usage: node scripts/check-timer-sessions.js <username>');
  console.log('\nExemple:');
  console.log('  node scripts/check-timer-sessions.js Holl');
  process.exit(1);
}

checkTimerSessions(args[0]);
