/**
 * Calcul du salaire simplifié
 * Le salaire est calculé basé sur le CA et la norme salariale du rôle
 */

/**
 * Calcule le salaire basé sur le CA et la norme salariale
 * @param chiffreAffaires - Le chiffre d'affaires de l'employé
 * @param normeSalariale - Le pourcentage de la norme salariale (ex: 70 pour 70%)
 * @returns Le salaire calculé en dollars
 */
export function calculateSalary(
  chiffreAffaires: number,
  normeSalariale: number
): number {
  if (chiffreAffaires < 0 || normeSalariale < 0) {
    return 0;
  }

  return Math.round(chiffreAffaires * (normeSalariale / 100));
}

/**
 * Formate un montant de salaire pour l'affichage
 * @param amount - Le montant en dollars
 * @returns Le montant formaté avec le symbole $
 */
export function formatSalary(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

/**
 * Calcule le salaire total pour une période donnée
 * @param weeklySalary - Salaire hebdomadaire
 * @param weeks - Nombre de semaines
 * @returns Le salaire total pour la période
 */
export function calculatePeriodSalary(weeklySalary: number, weeks: number): number {
  return weeklySalary * weeks;
}
