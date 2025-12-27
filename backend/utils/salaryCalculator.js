/**
 * Utilitaire de calcul de salaire simplifié
 * Calcul basé uniquement sur le CA et la norme salariale du rôle
 */

/**
 * Calcule le salaire d'un employé basé sur son CA et sa norme salariale
 * @param {number} chiffreAffaires - Le chiffre d'affaires de l'employé
 * @param {number} normeSalariale - Le pourcentage de la norme salariale (ex: 70 pour 70%)
 * @returns {Object} Résultat du calcul avec le salaire final
 */
function calculateEmployeeSalary(chiffreAffaires, normeSalariale) {
  // Calcul simple : CA × (norme salariale / 100)
  const salaireCalcule = Math.round(chiffreAffaires * (normeSalariale / 100));

  return {
    chiffreAffaires,
    normeSalariale,
    salaireCalcule,
    salaireCalculeFinal: salaireCalcule
  };
}

module.exports = {
  calculateEmployeeSalary
};
