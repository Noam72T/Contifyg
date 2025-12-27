/**
 * Calculateur d'impôts simplifié
 * Utilise un taux d'imposition fixe défini dans l'entreprise
 */

/**
 * Calcule l'impôt basé sur un taux fixe
 * @param {number} beneficeBrut - Le bénéfice brut imposable
 * @param {number} tauxImpot - Le taux d'imposition en pourcentage (ex: 25 pour 25%)
 * @returns {Object} Résultat du calcul avec détails
 */
function calculateSimpleTax(beneficeBrut, tauxImpot = 25) {
  if (beneficeBrut <= 0) {
    return {
      beneficeBrut: 0,
      impotTotal: 0,
      tauxEffectif: 0,
      beneficeNetApresImpot: 0,
      detailCalcul: 'Aucun bénéfice imposable'
    };
  }

  const impotTotal = Math.round(beneficeBrut * (tauxImpot / 100));
  const beneficeNetApresImpot = beneficeBrut - impotTotal;

  return {
    beneficeBrut,
    impotTotal,
    tauxEffectif: tauxImpot,
    beneficeNetApresImpot,
    detailCalcul: `${beneficeBrut.toLocaleString('fr-FR')}$ × ${tauxImpot}% = ${impotTotal.toLocaleString('fr-FR')}$`
  };
}

/**
 * Calcule l'impôt basé sur des paliers progressifs
 * @param {number} beneficeBrut - Le bénéfice brut imposable
 * @param {Array} taxBrackets - Tableau des paliers [{min, max, rate}]
 * @returns {Object} Résultat du calcul avec détails
 */
function calculateProgressiveTax(beneficeBrut, taxBrackets = []) {
  if (beneficeBrut <= 0) {
    return {
      beneficeBrut: 0,
      impotTotal: 0,
      tauxEffectif: 0,
      beneficeNetApresImpot: 0,
      detailCalcul: 'Aucun bénéfice imposable',
      paliers: []
    };
  }

  // Si pas de paliers définis, utiliser un taux fixe de 25%
  if (!taxBrackets || taxBrackets.length === 0) {
    return calculateSimpleTax(beneficeBrut, 25);
  }

  // Trier les paliers par montant minimum
  const sortedBrackets = [...taxBrackets].sort((a, b) => a.min - b.min);

  let impotTotal = 0;
  const paliersDetails = [];
  let montantRestant = beneficeBrut;

  for (const bracket of sortedBrackets) {
    // Si le bénéfice est inférieur au minimum de ce palier, on arrête
    if (beneficeBrut < bracket.min) {
      break;
    }

    // Calculer le montant imposable dans ce palier
    const montantMin = bracket.min;
    const montantMax = bracket.max === null ? beneficeBrut : Math.min(beneficeBrut, bracket.max);
    const montantDansPalier = montantMax - montantMin + 1;

    if (montantDansPalier > 0) {
      const impotPalier = Math.round(montantDansPalier * (bracket.rate / 100));
      impotTotal += impotPalier;

      paliersDetails.push({
        tranche: `${montantMin.toLocaleString('fr-FR')}$ à ${bracket.max === null ? 'illimité' : montantMax.toLocaleString('fr-FR') + '$'}`,
        montant: montantDansPalier,
        taux: bracket.rate,
        impot: impotPalier
      });
    }
  }

  const beneficeNetApresImpot = beneficeBrut - impotTotal;
  const tauxEffectif = beneficeBrut > 0 ? (impotTotal / beneficeBrut * 100).toFixed(2) : 0;

  // Créer le détail du calcul
  let detailCalcul = `Calcul progressif sur ${beneficeBrut.toLocaleString('fr-FR')}$:\n`;
  paliersDetails.forEach(p => {
    detailCalcul += `• ${p.tranche}: ${p.montant.toLocaleString('fr-FR')}$ × ${p.taux}% = ${p.impot.toLocaleString('fr-FR')}$\n`;
  });
  detailCalcul += `Total: ${impotTotal.toLocaleString('fr-FR')}$ (taux effectif: ${tauxEffectif}%)`;

  return {
    beneficeBrut,
    impotTotal,
    tauxEffectif: parseFloat(tauxEffectif),
    beneficeNetApresImpot,
    detailCalcul,
    paliers: paliersDetails
  };
}

module.exports = {
  calculateSimpleTax,
  calculateProgressiveTax
};
