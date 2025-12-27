/**
 * Script d'analyse des ventes par vendeur et par semaine
 * Récupère toutes les ventes d'un vendeur spécifique pour une semaine donnée
 * et calcule son CA total
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connexion MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/compta_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const Vente = require('../models/Vente');
const User = require('../models/User');
const Company = require('../models/Company');
const Role = require('../models/Role');
const { calculateEmployeeSalary } = require('../utils/salaryCalculator');

// Fonction pour obtenir le numéro de semaine ISO 8601
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Fonction pour obtenir le début de la semaine (Lundi 00:00:00)
function getStartOfWeek(year, weekNum) {
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;
  const firstThursday = new Date(jan4.getTime() - (jan4Day - 4) * 86400000);
  const targetThursday = new Date(firstThursday.getTime() + (weekNum - 1) * 7 * 86400000);
  const monday = new Date(targetThursday.getTime() - 3 * 86400000);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Fonction pour obtenir la fin de la semaine (Dimanche 23:59:59)
function getEndOfWeek(year, weekNum) {
  const startOfWeek = getStartOfWeek(year, weekNum);
  const endOfWeek = new Date(startOfWeek.getTime() + 6 * 86400000);
  endOfWeek.setHours(23, 59, 59, 999);
  return endOfWeek;
}

// Fonction principale d'analyse
async function analyzeVentesVendeur() {
  try {
    // Récupérer les arguments de la ligne de commande
    const args = process.argv.slice(2);
    
    let weekNum, yearNum, vendeurId, companyId;
    
    if (args.length === 0) {
      // Pas d'arguments : utiliser la semaine actuelle
      const today = new Date();
      weekNum = getWeekNumber(today);
      yearNum = today.getFullYear();
      console.log('\n⚠️  Aucun paramètre fourni. Utilisation de la semaine actuelle.\n');
    } else if (args.length < 2) {
      console.error('\n❌ Erreur: Paramètres insuffisants');
      console.log('\nUsage:');
      console.log('  node analyzeVentesVendeur.js [semaine] [année] [vendeurId] [companyId (optionnel)]');
      console.log('\nExemples:');
      console.log('  node analyzeVentesVendeur.js 44 2025 507f1f77bcf86cd799439011');
      console.log('  node analyzeVentesVendeur.js 44 2025 507f1f77bcf86cd799439011 68fe09997d912133d2687eda');
      console.log('  node analyzeVentesVendeur.js (utilise la semaine actuelle)\n');
      process.exit(1);
    } else {
      weekNum = parseInt(args[0]);
      yearNum = parseInt(args[1]);
      vendeurId = args[2];
      companyId = args[3]; // Optionnel
      
      // Validation
      if (isNaN(weekNum) || weekNum < 1 || weekNum > 53) {
        console.error('\n❌ Erreur: Le numéro de semaine doit être entre 1 et 53\n');
        process.exit(1);
      }
      
      if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
        console.error('\n❌ Erreur: L\'année doit être entre 2000 et 2100\n');
        process.exit(1);
      }
    }

    // Si pas de vendeurId fourni, demander de choisir
    if (!vendeurId) {
      console.log('\n=== LISTE DES VENDEURS ===\n');
      const users = await User.find({ 
        $or: [
          { systemRole: { $ne: 'Technicien' } },
          { systemRole: { $exists: false } }
        ]
      }).select('_id firstName lastName username company');
      
      if (users.length === 0) {
        console.log('❌ Aucun vendeur trouvé\n');
        process.exit(1);
      }
      
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.username}) - ID: ${user._id}`);
      });
      
      console.log('\n💡 Relancez le script avec l\'ID du vendeur souhaité\n');
      process.exit(0);
    }

    // Calculer les dates de début et fin de semaine
    const startOfWeek = getStartOfWeek(yearNum, weekNum);
    const endOfWeek = getEndOfWeek(yearNum, weekNum);

    console.log('\n=== ANALYSE DES VENTES PAR VENDEUR ===\n');
    console.log(`📅 Semaine ${weekNum}/${yearNum}`);
    console.log(`📆 Période: ${startOfWeek.toLocaleDateString('fr-FR')} → ${endOfWeek.toLocaleDateString('fr-FR')}\n`);

    // Récupérer les informations du vendeur
    const vendeur = await User.findById(vendeurId).populate('role');
    if (!vendeur) {
      console.error(`❌ Vendeur non trouvé: ${vendeurId}\n`);
      process.exit(1);
    }

    console.log(`👤 Vendeur: ${vendeur.firstName} ${vendeur.lastName} (${vendeur.username})`);
    console.log(`📧 Email: ${vendeur.email || 'N/A'}`);
    console.log(`📊 Score Social: ${vendeur.socialScore || 0}`);
    
    // Récupérer la norme salariale du rôle
    let normeSalariale = 0;
    if (vendeur.role && vendeur.role.normeSalariale) {
      normeSalariale = vendeur.role.normeSalariale;
      console.log(`💼 Rôle: ${vendeur.role.name} (Norme salariale: ${normeSalariale}%)`);
    } else {
      console.log(`⚠️  Aucune norme salariale définie pour ce vendeur`);
    }
    
    // Si une entreprise spécifique est demandée
    if (companyId) {
      const company = await Company.findById(companyId);
      if (!company) {
        console.error(`❌ Entreprise non trouvée: ${companyId}\n`);
        process.exit(1);
      }
      console.log(`🏢 Entreprise: ${company.name}`);
    } else {
      console.log(`🏢 Entreprise: Toutes les entreprises`);
    }
    
    console.log('='.repeat(80));

    // Construire le filtre de recherche
    const filter = {
      vendeur: vendeurId,
      dateVente: {
        $gte: startOfWeek,
        $lte: endOfWeek
      }
    };

    // Ajouter le filtre entreprise si spécifié
    if (companyId) {
      filter.company = companyId;
    }

    // Récupérer les ventes du vendeur pour cette semaine
    const ventes = await Vente.find(filter)
      .populate('company', 'name')
      .sort({ dateVente: 1 });

    if (ventes.length === 0) {
      console.log('\n⚠️  Aucune vente trouvée pour ce vendeur durant cette semaine\n');
      await mongoose.connection.close();
      return;
    }

    console.log(`\n💰 Total ventes: ${ventes.length}\n`);

    // Calculer le CA total
    let caTotal = 0;
    let totalCommission = 0;
    const ventesParJour = {};
    const ventesParEntreprise = {};

    for (const vente of ventes) {
      const montant = vente.montantTotal || 0;
      const commission = vente.totalCommission || 0;
      caTotal += montant;
      totalCommission += commission;

      // Grouper par jour
      const date = new Date(vente.dateVente);
      const jourKey = date.toLocaleDateString('fr-FR');
      if (!ventesParJour[jourKey]) {
        ventesParJour[jourKey] = { count: 0, total: 0, ventes: [] };
      }
      ventesParJour[jourKey].count++;
      ventesParJour[jourKey].total += montant;
      ventesParJour[jourKey].ventes.push({
        numero: vente.numeroCommande,
        heure: date.toLocaleTimeString('fr-FR'),
        montant: montant,
        commission: commission,
        articles: vente.prestations?.length || 0
      });

      // Grouper par entreprise
      const companyName = vente.company?.name || 'Entreprise inconnue';
      if (!ventesParEntreprise[companyName]) {
        ventesParEntreprise[companyName] = { count: 0, total: 0, commission: 0 };
      }
      ventesParEntreprise[companyName].count++;
      ventesParEntreprise[companyName].total += montant;
      ventesParEntreprise[companyName].commission += commission;
    }

    // Calculer le salaire selon la norme salariale et le score social
    const salaireCalcul = calculateEmployeeSalary(
      caTotal,
      normeSalariale,
      vendeur.socialScore || 0
    );

    // Afficher le résumé global
    console.log('📊 RÉSUMÉ GLOBAL:');
    console.log(`   CA Total:                    ${caTotal.toFixed(2)} $`);
    console.log(`   Nombre de ventes:            ${ventes.length}`);
    console.log(`   Panier moyen:                ${(caTotal / ventes.length).toFixed(2)} $`);
    console.log('');
    console.log('💰 CALCUL DU SALAIRE:');
    console.log(`   Norme salariale:             ${normeSalariale}%`);
    console.log(`   Salaire théorique:           ${salaireCalcul.salaireTraditionnelCalcule.toFixed(2)} $ (${caTotal.toFixed(2)} × ${normeSalariale}%)`);
    
    if (salaireCalcul.isEligibleSocial) {
      console.log(`   Score social:                ${salaireCalcul.socialScore}`);
      console.log(`   Limite de salaire:           ${salaireCalcul.limiteSalaire.toFixed(2)} $`);
      if (salaireCalcul.caVersEntreprise > 0) {
        console.log(`   ⚠️  Salaire plafonné à:        ${salaireCalcul.salaireAvecLimite.toFixed(2)} $`);
        console.log(`   💼 Surplus vers entreprise:   ${salaireCalcul.caVersEntreprise.toFixed(2)} $`);
      } else {
        console.log(`   ✅ Salaire non plafonné:       ${salaireCalcul.salaireAvecLimite.toFixed(2)} $`);
      }
    }
    console.log('');
    console.log(`   🎯 SALAIRE FINAL:             ${salaireCalcul.salaireCalculeFinal.toFixed(2)} $`);
    console.log('');
    console.log('📋 COMMISSIONS (info):');
    console.log(`   Commission totale ventes:    ${totalCommission.toFixed(2)} $`);
    console.log(`   Commission moyenne/vente:    ${(totalCommission / ventes.length).toFixed(2)} $`);

    // Afficher par entreprise si plusieurs
    if (Object.keys(ventesParEntreprise).length > 1) {
      console.log('\n\n🏢 RÉPARTITION PAR ENTREPRISE:');
      console.log('─'.repeat(80));
      for (const [companyName, data] of Object.entries(ventesParEntreprise)) {
        console.log(`\n   ${companyName}:`);
        console.log(`      Ventes:      ${data.count}`);
        console.log(`      CA:          ${data.total.toFixed(2)} $ (${((data.total / caTotal) * 100).toFixed(1)}%)`);
        console.log(`      Commission:  ${data.commission.toFixed(2)} $`);
      }
    }

    // Afficher par jour
    console.log('\n\n📅 VENTES PAR JOUR:');
    console.log('─'.repeat(80));
    
    const joursTries = Object.keys(ventesParJour).sort((a, b) => {
      return new Date(a.split('/').reverse().join('-')) - new Date(b.split('/').reverse().join('-'));
    });

    for (const jour of joursTries) {
      const data = ventesParJour[jour];
      const jourDate = new Date(jour.split('/').reverse().join('-'));
      const nomJour = jourDate.toLocaleDateString('fr-FR', { weekday: 'long' });
      
      console.log(`\n   ${jour} (${nomJour}): ${data.count} vente(s) - Total: ${data.total.toFixed(2)} $`);
      
      // Afficher le détail des ventes du jour
      data.ventes.forEach((v, i) => {
        console.log(`      ${i + 1}. ${v.numero} - ${v.heure} - ${v.montant.toFixed(2)} $ (Commission: ${v.commission.toFixed(2)} $) - ${v.articles} article(s)`);
      });
    }

    // Statistiques
    console.log('\n\n📈 STATISTIQUES:');
    console.log('─'.repeat(80));
    const montants = ventes.map(v => v.montantTotal || 0);
    const montantMax = Math.max(...montants);
    const montantMin = Math.min(...montants);
    const venteMax = ventes.find(v => v.montantTotal === montantMax);
    const venteMin = ventes.find(v => v.montantTotal === montantMin);

    console.log(`   Vente la plus élevée:  ${montantMax.toFixed(2)} $ (${venteMax?.numeroCommande})`);
    console.log(`   Vente la plus basse:   ${montantMin.toFixed(2)} $ (${venteMin?.numeroCommande})`);
    console.log(`   Panier moyen:          ${(caTotal / ventes.length).toFixed(2)} $`);
    
    // Répartition par jour de la semaine
    console.log('\n\n📊 RÉPARTITION PAR JOUR DE LA SEMAINE:');
    console.log('─'.repeat(80));
    const joursStats = {};
    const nomsJours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    
    ventes.forEach(vente => {
      const date = new Date(vente.dateVente);
      const jourSemaine = nomsJours[date.getDay()];
      if (!joursStats[jourSemaine]) {
        joursStats[jourSemaine] = { count: 0, total: 0 };
      }
      joursStats[jourSemaine].count++;
      joursStats[jourSemaine].total += vente.montantTotal || 0;
    });

    // Trier par ordre des jours de la semaine
    const joursOrdre = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    for (const jour of joursOrdre) {
      if (joursStats[jour]) {
        const data = joursStats[jour];
        const pourcentage = ((data.total / caTotal) * 100).toFixed(1);
        console.log(`   ${jour.padEnd(10)}: ${data.count} vente(s) - ${data.total.toFixed(2)} $ (${pourcentage}%)`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Analyse terminée\n');

  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connexion MongoDB fermée\n');
  }
}

// Exécuter l'analyse
analyzeVentesVendeur();
