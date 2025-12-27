/**
 * Script d'analyse des ventes par entreprise
 * Analyse toutes les ventes et calcule les totaux par période
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


// Fonction principale d'analyse
async function analyzeVentes() {
  try {
    console.log('\n=== ANALYSE DES VENTES PAR ENTREPRISE ===\n');

    // 1. Récupérer toutes les entreprises
    const companies = await Company.find();
    console.log(`📊 ${companies.length} entreprise(s) trouvée(s)\n`);

    for (const company of companies) {
      console.log(`\n🏢 Entreprise: ${company.name} (ID: ${company._id})`);
      console.log('='.repeat(80));

      // 2. Récupérer toutes les ventes de cette entreprise
      const ventes = await Vente.find({ company: company._id })
        .sort({ dateVente: -1 });

      if (ventes.length === 0) {
        console.log('⚠️  Aucune vente trouvée pour cette entreprise\n');
        continue;
      }

      console.log(`\n💰 Total ventes: ${ventes.length}`);

      // 3. Calculer le CA total
      let caTotal = 0;
      const ventesParMois = {};
      const ventesParSemaine = {};

      for (const vente of ventes) {
        const montant = vente.montantTotal || 0;
        caTotal += montant;

        // Grouper par mois
        const date = new Date(vente.dateVente);
        const moisKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!ventesParMois[moisKey]) {
          ventesParMois[moisKey] = { count: 0, total: 0, ventes: [] };
        }
        ventesParMois[moisKey].count++;
        ventesParMois[moisKey].total += montant;
        ventesParMois[moisKey].ventes.push({
          numero: vente.numeroCommande,
          date: date.toLocaleDateString('fr-FR'),
          montant: montant,
          articles: vente.articles?.length || 0
        });

        // Grouper par semaine
        const weekNumber = getWeekNumber(date);
        const semaineKey = `${date.getFullYear()}-S${weekNumber}`;
        if (!ventesParSemaine[semaineKey]) {
          ventesParSemaine[semaineKey] = { count: 0, total: 0 };
        }
        ventesParSemaine[semaineKey].count++;
        ventesParSemaine[semaineKey].total += montant;
      }

      // 4. Afficher le résumé global
      console.log('\n📊 RÉSUMÉ GLOBAL:');
      console.log(`   CA Total:         ${caTotal.toFixed(2)} $`);
      console.log(`   Nombre de ventes: ${ventes.length}`);
      console.log(`   Panier moyen:     ${(caTotal / ventes.length).toFixed(2)} $`);

      // 5. Afficher par mois
      console.log('\n📅 VENTES PAR MOIS:');
      console.log('─'.repeat(80));
      const moisTries = Object.keys(ventesParMois).sort().reverse();
      for (const mois of moisTries) {
        const data = ventesParMois[mois];
        console.log(`\n   ${mois}: ${data.count} vente(s) - Total: ${data.total.toFixed(2)} $`);
        
        // Afficher le détail des ventes du mois
        if (data.ventes.length <= 10) {
          data.ventes.forEach((v, i) => {
            console.log(`      ${i + 1}. ${v.numero} - ${v.date} - ${v.montant.toFixed(2)} $ (${v.articles} article(s))`);
          });
        } else {
          console.log(`      (${data.ventes.length} ventes - détails masqués pour lisibilité)`);
        }
      }

      // 6. Afficher par semaine (résumé)
      console.log('\n\n📅 VENTES PAR SEMAINE (Résumé):');
      console.log('─'.repeat(80));
      const semainesTries = Object.keys(ventesParSemaine).sort().reverse().slice(0, 10);
      for (const semaine of semainesTries) {
        const data = ventesParSemaine[semaine];
        console.log(`   ${semaine}: ${data.count} vente(s) - Total: ${data.total.toFixed(2)} $`);
      }

      // 7. Afficher les 10 dernières ventes
      console.log('\n\n📝 LES 10 DERNIÈRES VENTES:');
      console.log('─'.repeat(80));
      const dernieresVentes = ventes.slice(0, 10);
      dernieresVentes.forEach((vente, i) => {
        const date = new Date(vente.dateVente);
        console.log(`   ${i + 1}. ${vente.numeroCommande}`);
        console.log(`      Date:     ${date.toLocaleString('fr-FR')}`);
        console.log(`      Montant:  ${(vente.montantTotal || 0).toFixed(2)} $`);
        console.log(`      Articles: ${vente.articles?.length || 0}`);
        if (vente.articles && vente.articles.length > 0) {
          vente.articles.forEach(art => {
            console.log(`         - ${art.nom} x${art.quantite} = ${(art.prixUnitaire * art.quantite).toFixed(2)} $`);
          });
        }
        console.log('');
      });

      // 8. Statistiques supplémentaires
      console.log('\n📈 STATISTIQUES:');
      console.log('─'.repeat(80));
      const montants = ventes.map(v => v.montantTotal || 0);
      const montantMax = Math.max(...montants);
      const montantMin = Math.min(...montants);
      const venteMax = ventes.find(v => v.montantTotal === montantMax);
      const venteMin = ventes.find(v => v.montantTotal === montantMin);

      console.log(`   Vente la plus élevée: ${montantMax.toFixed(2)} $ (${venteMax?.numeroCommande})`);
      console.log(`   Vente la plus basse:  ${montantMin.toFixed(2)} $ (${venteMin?.numeroCommande})`);
      console.log(`   Panier moyen:         ${(caTotal / ventes.length).toFixed(2)} $`);

      console.log('\n' + '='.repeat(80));
    }

    // 9. Résumé global toutes entreprises
    console.log('\n\n📊 RÉSUMÉ GLOBAL TOUTES ENTREPRISES');
    console.log('='.repeat(80));
    
    const toutesVentes = await Vente.find();
    const caGlobal = toutesVentes.reduce((sum, v) => sum + (v.montantTotal || 0), 0);

    console.log(`Total ventes:     ${toutesVentes.length}`);
    console.log(`CA Global:        ${caGlobal.toFixed(2)} $`);
    console.log(`Panier moyen:     ${toutesVentes.length > 0 ? (caGlobal / toutesVentes.length).toFixed(2) : 0} $`);

    console.log('\n✅ Analyse terminée\n');

  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connexion MongoDB fermée');
  }
}

// Fonction pour obtenir le numéro de semaine
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Exécuter l'analyse
analyzeVentes();
