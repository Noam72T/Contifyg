/**
 * Script pour vérifier les données d'un SuperAdmin pour la semaine actuelle
 * Affiche : ventes, salaires, CA, données User
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
const Vente = require('../models/Vente');
const Salaire = require('../models/Salaire');
const Employe = require('../models/Employe');

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

async function checkSuperAdminWeek(username) {
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
      process.exit(0);
    }

    // Calculer la semaine actuelle
    const now = new Date();
    const currentWeek = now.getWeek();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    console.log('📅 PÉRIODE ACTUELLE:');
    console.log(`   Semaine: ${currentWeek}/${currentYear}`);
    console.log(`   Mois: ${currentMonth}/${currentYear}`);
    console.log('');

    // Dates de la semaine
    const startOfWeek = getStartOfWeek(currentYear, currentWeek);
    const endOfWeek = getEndOfWeek(currentYear, currentWeek);

    console.log('📅 DATES DE LA SEMAINE:');
    console.log(`   Début: ${startOfWeek.toLocaleDateString('fr-FR')}`);
    console.log(`   Fin: ${endOfWeek.toLocaleDateString('fr-FR')}`);
    console.log('');

    // 1. Vérifier les données User
    console.log('💰 DONNÉES USER:');
    console.log(`   chiffreAffaires: ${user.chiffreAffaires || 0}$`);
    console.log(`   avances: ${user.avances || 0}$`);
    console.log(`   primes: ${user.primes || 0}$`);
    console.log(`   salaireActuel: ${user.salaireActuel || 0}$`);
    console.log(`   socialScore: ${user.socialScore || 0}%`);
    console.log('');

    // 2. Vérifier les ventes de la semaine actuelle
    const ventesWeek = await Vente.find({
      vendeur: user._id,
      company: user.company,
      dateVente: {
        $gte: startOfWeek,
        $lte: endOfWeek
      }
    });

    console.log('📊 VENTES DE LA SEMAINE ACTUELLE:');
    console.log(`   Nombre: ${ventesWeek.length}`);
    if (ventesWeek.length > 0) {
      const totalCA = ventesWeek.reduce((sum, v) => sum + (v.totalCommission || 0), 0);
      console.log(`   CA total: ${totalCA.toFixed(2)}$`);
      ventesWeek.forEach((v, i) => {
        console.log(`   ${i + 1}. ${v.numeroCommande} - ${v.totalCommission}$ - ${v.dateVente.toLocaleDateString('fr-FR')}`);
      });
    } else {
      console.log('   ❌ Aucune vente cette semaine');
    }
    console.log('');

    // 3. Vérifier toutes les ventes (pour comparaison)
    const toutesVentes = await Vente.find({
      vendeur: user._id,
      company: user.company
    }).sort({ dateVente: -1 });

    console.log('📊 TOUTES LES VENTES:');
    console.log(`   Total: ${toutesVentes.length}`);
    if (toutesVentes.length > 0) {
      const totalCA = toutesVentes.reduce((sum, v) => sum + (v.totalCommission || 0), 0);
      console.log(`   CA total: ${totalCA.toFixed(2)}$`);
      console.log('   Dernières ventes:');
      toutesVentes.slice(0, 5).forEach((v, i) => {
        const venteWeek = new Date(v.dateVente).getWeek();
        const venteYear = new Date(v.dateVente).getFullYear();
        console.log(`   ${i + 1}. ${v.numeroCommande} - ${v.totalCommission}$ - ${v.dateVente.toLocaleDateString('fr-FR')} (S${venteWeek}/${venteYear})`);
      });
    }
    console.log('');

    // 4. Vérifier les salaires
    const employe = await Employe.findOne({ utilisateur: user._id, company: user.company });
    
    if (employe) {
      console.log('💼 SALAIRES:');
      
      // Salaire hebdomadaire de la semaine actuelle
      const salaireWeek = await Salaire.findOne({
        employe: employe._id,
        company: user.company,
        'periode.semaine': currentWeek,
        'periode.annee': currentYear
      });

      console.log(`   Salaire semaine ${currentWeek}/${currentYear}:`);
      if (salaireWeek) {
        console.log(`     ✅ Trouvé - Montant: ${salaireWeek.salaireBrut}$`);
        console.log(`     Statut: ${salaireWeek.statut}`);
      } else {
        console.log(`     ❌ Aucun salaire pour cette semaine`);
      }

      // Salaire mensuel
      const salaireMois = await Salaire.findOne({
        employe: employe._id,
        company: user.company,
        'periode.mois': currentMonth,
        'periode.annee': currentYear,
        'periode.semaine': { $exists: false }
      });

      console.log(`   Salaire mois ${currentMonth}/${currentYear} (ancien système):`);
      if (salaireMois) {
        console.log(`     ✅ Trouvé - Montant: ${salaireMois.salaireBrut}$`);
        console.log(`     Statut: ${salaireMois.statut}`);
      } else {
        console.log(`     ❌ Aucun salaire mensuel`);
      }

      // Tous les salaires
      const tousSalaires = await Salaire.find({
        employe: employe._id,
        company: user.company
      }).sort({ createdAt: -1 });

      console.log(`   Total salaires: ${tousSalaires.length}`);
      if (tousSalaires.length > 0) {
        console.log('   Derniers salaires:');
        tousSalaires.slice(0, 3).forEach((s, i) => {
          const periode = s.periode.semaine 
            ? `S${s.periode.semaine}/${s.periode.annee}` 
            : `M${s.periode.mois}/${s.periode.annee}`;
          console.log(`     ${i + 1}. ${periode} - ${s.salaireBrut}$ - ${s.statut}`);
        });
      }
    } else {
      console.log('⚠️  Aucun employé trouvé pour cet utilisateur');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ VÉRIFICATION TERMINÉE');
    console.log('='.repeat(60));

    // Diagnostic
    console.log('\n🔍 DIAGNOSTIC:');
    if (ventesWeek.length === 0) {
      console.log('❌ Aucune vente cette semaine → Le salaire devrait être 0$');
      if (user.chiffreAffaires > 0 || user.salaireActuel > 0) {
        console.log('⚠️  PROBLÈME: Les champs User.chiffreAffaires ou User.salaireActuel ne sont pas à 0');
        console.log('💡 SOLUTION: Exécuter le script de reset: node scripts/reset-superadmin-weekly.js ' + username);
      }
    } else {
      const caWeek = ventesWeek.reduce((sum, v) => sum + (v.totalCommission || 0), 0);
      console.log(`✅ ${ventesWeek.length} vente(s) cette semaine → CA: ${caWeek.toFixed(2)}$`);
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
  console.log('❌ Usage: node scripts/check-superadmin-week.js <username>');
  console.log('\nExemple:');
  console.log('  node scripts/check-superadmin-week.js Holl');
  process.exit(1);
}

checkSuperAdminWeek(args[0]);
