const Vente = require('../models/Vente');
const Partenariat = require('../models/Partenariat');

// Fonction pour générer le numéro de semaine selon ISO 8601
function generateWeekNumber(date = new Date()) {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

// Fonction pour obtenir les dates de début et fin d'une semaine
function getWeekDates(weekNumber, year) {
  // Trouver le premier jeudi de l'année (semaine 1)
  const jan4 = new Date(year, 0, 4);
  const firstThursday = new Date(jan4.getTime() - (jan4.getDay() - 4) * 86400000);
  
  // Calculer le lundi de la semaine demandée
  const targetWeekStart = new Date(firstThursday.getTime() + (weekNumber - 1) * 7 * 86400000);
  targetWeekStart.setDate(targetWeekStart.getDate() - 3); // Revenir au lundi
  targetWeekStart.setHours(0, 0, 0, 0);
  
  // Calculer le dimanche de la semaine
  const targetWeekEnd = new Date(targetWeekStart);
  targetWeekEnd.setDate(targetWeekEnd.getDate() + 6);
  targetWeekEnd.setHours(23, 59, 59, 999);
  
  return { startOfWeek: targetWeekStart, endOfWeek: targetWeekEnd };
}

/**
 * Recalcule les gains d'un partenariat pour une semaine donnée
 * @param {string} partenaritId - ID du partenariat
 * @param {number} weekNumber - Numéro de la semaine
 * @param {number} year - Année
 */
async function recalculatePartenaritGains(partenaritId, weekNumber, year) {
  try {
    console.log(`🔄 Recalcul des gains pour le partenariat ${partenaritId}, semaine ${weekNumber}/${year}`);
    
    // Récupérer le partenariat
    const partenariat = await Partenariat.findById(partenaritId);
    if (!partenariat) {
      console.log(`❌ Partenariat ${partenaritId} non trouvé`);
      return false;
    }

    // Obtenir les dates de la semaine
    const { startOfWeek, endOfWeek } = getWeekDates(weekNumber, year);
    
    console.log(`📅 Période: ${startOfWeek.toISOString()} à ${endOfWeek.toISOString()}`);

    // Récupérer toutes les ventes de cette semaine pour ce partenariat
    const ventes = await Vente.find({
      company: partenariat.company,
      partenariat: partenariat.entreprisePartenaire, // Le nom du partenariat est stocké dans le champ partenariat
      dateVente: {
        $gte: startOfWeek,
        $lte: endOfWeek
      },
      statut: 'confirmee' // Seulement les ventes confirmées
    });

    console.log(`📊 ${ventes.length} ventes trouvées pour ce partenariat cette semaine`);

    // Calculer le total des gains (totalCommission)
    const totalGains = ventes.reduce((sum, vente) => {
      return sum + (vente.totalCommission || 0);
    }, 0);

    console.log(`💰 Total des gains calculé: ${totalGains}`);

    // Mettre à jour ou créer l'entrée de gains pour cette semaine
    const gainIndex = partenariat.gainsParSemaine.findIndex(gain => 
      gain.semaine === weekNumber && 
      new Date(gain.dateCreation).getFullYear() === year
    );

    if (gainIndex !== -1) {
      // Mettre à jour l'entrée existante
      partenariat.gainsParSemaine[gainIndex].montant = totalGains;
      console.log(`✅ Gains mis à jour pour la semaine ${weekNumber}/${year}: ${totalGains}`);
    } else {
      // Créer une nouvelle entrée
      partenariat.gainsParSemaine.push({
        semaine: weekNumber,
        montant: totalGains,
        dateCreation: new Date(year, 0, 1) // Date de référence pour l'année
      });
      console.log(`✅ Nouvelle entrée de gains créée pour la semaine ${weekNumber}/${year}: ${totalGains}`);
    }

    // Sauvegarder les modifications
    await partenariat.save();
    
    return true;
  } catch (error) {
    console.error(`❌ Erreur lors du recalcul des gains du partenariat ${partenaritId}:`, error);
    return false;
  }
}

/**
 * Recalcule les gains de tous les partenariats affectés par une vente
 * @param {Object} vente - L'objet vente (avec partenariat et dateVente)
 */
async function recalculateAllAffectedPartenariats(vente) {
  try {
    if (!vente.partenariat) {
      console.log('🔍 Aucun partenariat associé à cette vente');
      return true;
    }

    console.log(`🔄 Recalcul des gains pour le partenariat: ${vente.partenariat}`);

    // Trouver le partenariat par nom d'entreprise
    const partenariat = await Partenariat.findOne({
      company: vente.company,
      entreprisePartenaire: vente.partenariat
    });

    if (!partenariat) {
      console.log(`❌ Partenariat "${vente.partenariat}" non trouvé pour l'entreprise ${vente.company}`);
      return false;
    }

    // Calculer la semaine et l'année de la vente
    const venteDate = new Date(vente.dateVente);
    const weekNumber = generateWeekNumber(venteDate);
    const year = venteDate.getFullYear();

    console.log(`📅 Vente datée du ${venteDate.toISOString()}, semaine ${weekNumber}/${year}`);

    // Recalculer les gains pour cette semaine
    return await recalculatePartenaritGains(partenariat._id, weekNumber, year);
  } catch (error) {
    console.error('❌ Erreur lors du recalcul des partenariats affectés:', error);
    return false;
  }
}

/**
 * Recalcule les gains de tous les partenariats pour la semaine courante
 * @param {string} companyId - ID de l'entreprise (optionnel, si non fourni recalcule pour toutes)
 */
async function recalculateAllCurrentWeekGains(companyId = null) {
  try {
    console.log('🔄 Recalcul automatique des gains pour la semaine courante...');
    
    const currentWeek = generateWeekNumber();
    const currentYear = new Date().getFullYear();
    
    // Construire le filtre pour les partenariats
    const filter = { statut: 'actif' };
    if (companyId) {
      filter.company = companyId;
    }
    
    // Récupérer tous les partenariats actifs
    const partenariats = await Partenariat.find(filter);
    
    console.log(`📊 ${partenariats.length} partenariats actifs trouvés pour recalcul`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Recalculer les gains pour chaque partenariat
    for (const partenariat of partenariats) {
      try {
        const success = await recalculatePartenaritGains(partenariat._id, currentWeek, currentYear);
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error(`❌ Erreur lors du recalcul pour ${partenariat.entreprisePartenaire}:`, error);
        errorCount++;
      }
    }
    
    console.log(`✅ Recalcul automatique terminé: ${successCount} succès, ${errorCount} erreurs`);
    return { successCount, errorCount, total: partenariats.length };
  } catch (error) {
    console.error('❌ Erreur lors du recalcul automatique global:', error);
    return { successCount: 0, errorCount: 0, total: 0, error: error.message };
  }
}

/**
 * Recalcule les gains de tous les partenariats d'une entreprise pour une période donnée
 * @param {string} companyId - ID de l'entreprise
 * @param {number} weekNumber - Numéro de la semaine
 * @param {number} year - Année
 */
async function recalculateCompanyWeekGains(companyId, weekNumber, year) {
  try {
    console.log(`🔄 Recalcul des gains pour l'entreprise ${companyId}, semaine ${weekNumber}/${year}`);
    
    // Récupérer tous les partenariats actifs de cette entreprise
    const partenariats = await Partenariat.find({ 
      company: companyId, 
      statut: 'actif' 
    });
    
    console.log(`📊 ${partenariats.length} partenariats actifs trouvés`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Recalculer les gains pour chaque partenariat
    for (const partenariat of partenariats) {
      try {
        const success = await recalculatePartenaritGains(partenariat._id, weekNumber, year);
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error(`❌ Erreur lors du recalcul pour ${partenariat.entreprisePartenaire}:`, error);
        errorCount++;
      }
    }
    
    console.log(`✅ Recalcul terminé pour l'entreprise: ${successCount} succès, ${errorCount} erreurs`);
    return { successCount, errorCount, total: partenariats.length };
  } catch (error) {
    console.error('❌ Erreur lors du recalcul pour l\'entreprise:', error);
    return { successCount: 0, errorCount: 0, total: 0, error: error.message };
  }
}

module.exports = {
  recalculatePartenaritGains,
  recalculateAllAffectedPartenariats,
  recalculateAllCurrentWeekGains,
  recalculateCompanyWeekGains,
  generateWeekNumber,
  getWeekDates
};
