/**
 * Script d'analyse des ventes d'une semaine spécifique
 * Permet de récupérer toutes les ventes d'une semaine donnée
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connexion MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/compta_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const Vente = require('../models/Vente');
const Company = require('../models/Company');

// Fonction pour obtenir les dates de début et fin d'une semaine
function getWeekDates(year, week) {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  const weekStart = new Date(ISOweekStart);
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(ISOweekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  return { weekStart, weekEnd };
}

// Fonction pour obtenir le numéro de semaine d'une date
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Fonction principale d'analyse
async function analyzeVentesSemaine() {
  try {
    // Récupérer les arguments de ligne de commande
    const args = process.argv.slice(2);
    
    let year, week, companyId;
    
    // Si pas d'arguments, demander la semaine actuelle
    if (args.length === 0) {
      const today = new Date();
      year = today.getFullYear();
      week = getWeekNumber(today);
      console.log(`\n📅 Aucune semaine spécifiée, utilisation de la semaine actuelle: ${week}/${year}\n`);
    } else if (args.length >= 2) {
      week = parseInt(args[0]);
      year = parseInt(args[1]);
      companyId = args[2]; // Optionnel
    } else {
      console.log('\n❌ Usage: node analyzeVentesSemaine.js [semaine] [année] [companyId (optionnel)]');
      console.log('Exemple: node analyzeVentesSemaine.js 4 2025');
      console.log('Exemple: node analyzeVentesSemaine.js 4 2025 507f1f77bcf86cd799439011\n');
      process.exit(1);
    }

    // Valider les paramètres
    if (week < 1 || week > 53) {
      console.log('❌ Erreur: Le numéro de semaine doit être entre 1 et 53\n');
      process.exit(1);
    }

    console.log('\n=== ANALYSE DES VENTES D\'UNE SEMAINE ===\n');
    console.log(`📅 Semaine ${week}/${year}\n`);

    // Calculer les dates de la semaine
    const { weekStart, weekEnd } = getWeekDates(year, week);
    console.log(`📆 Période: ${weekStart.toLocaleDateString('fr-FR')} → ${weekEnd.toLocaleDateString('fr-FR')}\n`);

    // Récupérer les entreprises
    let companies;
    if (companyId) {
      const company = await Company.findById(companyId);
      if (!company) {
        console.log(`❌ Entreprise non trouvée: ${companyId}\n`);
        process.exit(1);
      }
      companies = [company];
      console.log(`🏢 Entreprise: ${company.name}\n`);
    } else {
      companies = await Company.find();
      console.log(`🏢 ${companies.length} entreprise(s) trouvée(s)\n`);
    }

    let caGlobalSemaine = 0;
    let totalVentesGlobal = 0;

    // Analyser chaque entreprise
    for (const company of companies) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🏢 ${company.name} (ID: ${company._id})`);
      console.log('='.repeat(80));

      // Récupérer les ventes de la semaine
      const ventes = await Vente.find({
        company: company._id,
        dateVente: {
          $gte: weekStart,
          $lte: weekEnd
        }
      }).sort({ dateVente: 1 });

      if (ventes.length === 0) {
        console.log('\n⚠️  Aucune vente trouvée pour cette semaine\n');
        continue;
      }

      // Calculer le CA
      let caTotal = 0;
      const ventesParJour = {};

      for (const vente of ventes) {
        const montant = vente.montantTotal || 0;
        caTotal += montant;

        // Grouper par jour
        const date = new Date(vente.dateVente);
        const jourKey = date.toLocaleDateString('fr-FR');
        if (!ventesParJour[jourKey]) {
          ventesParJour[jourKey] = { count: 0, total: 0, ventes: [] };
        }
        ventesParJour[jourKey].count++;
        ventesParJour[jourKey].total += montant;
        ventesParJour[jourKey].ventes.push(vente);
      }

      caGlobalSemaine += caTotal;
      totalVentesGlobal += ventes.length;

      // Afficher le résumé
      console.log('\n📊 RÉSUMÉ:');
      console.log(`   Nombre de ventes: ${ventes.length}`);
      console.log(`   CA Total:         ${caTotal.toFixed(2)} $`);
      console.log(`   Panier moyen:     ${(caTotal / ventes.length).toFixed(2)} $`);

      // Afficher par jour
      console.log('\n📅 VENTES PAR JOUR:');
      console.log('─'.repeat(80));
      
      const joursOrdonnes = Object.keys(ventesParJour).sort((a, b) => {
        const dateA = a.split('/').reverse().join('');
        const dateB = b.split('/').reverse().join('');
        return dateA.localeCompare(dateB);
      });

      for (const jour of joursOrdonnes) {
        const data = ventesParJour[jour];
        console.log(`\n   ${jour}: ${data.count} vente(s) - Total: ${data.total.toFixed(2)} $`);
        
        // Afficher chaque vente du jour
        data.ventes.forEach((vente, i) => {
          const date = new Date(vente.dateVente);
          console.log(`      ${i + 1}. ${vente.numeroCommande} - ${date.toLocaleTimeString('fr-FR')} - ${(vente.montantTotal || 0).toFixed(2)} $`);
          
          // Afficher les articles
          if (vente.articles && vente.articles.length > 0) {
            vente.articles.forEach(art => {
              const sousTotal = (art.prixUnitaire || 0) * (art.quantite || 0);
              console.log(`         - ${art.nom} x${art.quantite} @ ${(art.prixUnitaire || 0).toFixed(2)} $ = ${sousTotal.toFixed(2)} $`);
            });
          }
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

      console.log(`   Vente la plus élevée: ${montantMax.toFixed(2)} $ (${venteMax?.numeroCommande})`);
      console.log(`   Vente la plus basse:  ${montantMin.toFixed(2)} $ (${venteMin?.numeroCommande})`);
      console.log(`   Panier moyen:         ${(caTotal / ventes.length).toFixed(2)} $`);

      // Répartition par jour de la semaine
      const joursNoms = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      const ventesParJourSemaine = {};
      
      ventes.forEach(vente => {
        const date = new Date(vente.dateVente);
        const jourNom = joursNoms[date.getDay()];
        if (!ventesParJourSemaine[jourNom]) {
          ventesParJourSemaine[jourNom] = { count: 0, total: 0 };
        }
        ventesParJourSemaine[jourNom].count++;
        ventesParJourSemaine[jourNom].total += (vente.montantTotal || 0);
      });

      console.log('\n📊 RÉPARTITION PAR JOUR DE LA SEMAINE:');
      console.log('─'.repeat(80));
      joursNoms.forEach(jour => {
        if (ventesParJourSemaine[jour]) {
          const data = ventesParJourSemaine[jour];
          const pourcentage = ((data.total / caTotal) * 100).toFixed(1);
          console.log(`   ${jour.padEnd(10)}: ${data.count} vente(s) - ${data.total.toFixed(2)} $ (${pourcentage}%)`);
        }
      });

      console.log('\n');
    }

    // Résumé global si plusieurs entreprises
    if (companies.length > 1) {
      console.log('\n\n📊 RÉSUMÉ GLOBAL TOUTES ENTREPRISES');
      console.log('='.repeat(80));
      console.log(`Semaine ${week}/${year}`);
      console.log(`Total ventes:     ${totalVentesGlobal}`);
      console.log(`CA Global:        ${caGlobalSemaine.toFixed(2)} $`);
      console.log(`Panier moyen:     ${totalVentesGlobal > 0 ? (caGlobalSemaine / totalVentesGlobal).toFixed(2) : 0} $`);
    }

    console.log('\n✅ Analyse terminée\n');

  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connexion MongoDB fermée\n');
  }
}

// Exécuter l'analyse
analyzeVentesSemaine();
