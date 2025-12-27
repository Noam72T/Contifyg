import { calculateSalary } from '../utils/salaryCalculator';

export interface SalaryCalculationResult {
  chiffreAffaires: number;
  normeSalariale: number;
  salaireCalcule: number;
  salaireCalculeFinal: number;
  limiteSalaire?: number;
  salaireBloque?: boolean;
  montantRetenuEntreprise?: number;
}

/**
 * Calcule le salaire d'un employé basé sur son CA et sa norme salariale
 * @param chiffreAffaires - Chiffre d'affaires de l'employé
 * @param normeSalariale - Pourcentage de commission du rôle
 * @param limiteSalaire - Limite maximale de salaire (optionnel)
 * @returns Résultat détaillé du calcul de salaire
 */
export function calculateEmployeeSalary(
  chiffreAffaires: number,
  normeSalariale: number,
  limiteSalaire?: number
): SalaryCalculationResult {
  const salaireCalcule = calculateSalary(chiffreAffaires, normeSalariale);
  
  // Vérifier si une limite de salaire est définie et si elle est dépassée
  let salaireCalculeFinal = salaireCalcule;
  let salaireBloque = false;
  let montantRetenuEntreprise = 0;
  
  if (limiteSalaire && limiteSalaire > 0 && salaireCalcule > limiteSalaire) {
    salaireCalculeFinal = limiteSalaire;
    salaireBloque = true;
    montantRetenuEntreprise = salaireCalcule - limiteSalaire;
  }

  return {
    chiffreAffaires,
    normeSalariale,
    salaireCalcule,
    salaireCalculeFinal,
    limiteSalaire,
    salaireBloque,
    montantRetenuEntreprise
  };
}

/**
 * Calcule les totaux pour un bilan
 * @param employees - Liste des employés avec leurs données
 * @returns Totaux calculés pour le bilan
 */
export function calculateBilanTotals(employees: Array<{
  chiffreAffaires: number;
  normeSalariale: number;
  limiteSalaire?: number;
  avances?: number;
}>) {
  let totalSalaires = 0;
  let totalChiffreAffaires = 0;
  let totalRetenuEntreprise = 0;

  employees.forEach(employee => {
    const result = calculateEmployeeSalary(
      employee.chiffreAffaires,
      employee.normeSalariale,
      employee.limiteSalaire
    );

    totalSalaires += result.salaireCalculeFinal - (employee.avances || 0);
    totalChiffreAffaires += employee.chiffreAffaires;
    totalRetenuEntreprise += result.montantRetenuEntreprise || 0;
  });

  return {
    totalSalaires,
    totalChiffreAffaires,
    totalCANet: totalChiffreAffaires - totalSalaires,
    totalRetenuEntreprise
  };
}
