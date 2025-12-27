import type { User } from '../types/auth';

/**
 * Vérifie si l'utilisateur est un Technicien ou SuperAdmin (permissions complètes)
 */
export const isSuperAdminOrTechnicien = (user: User | null): boolean => {
  return user?.systemRole === 'Technicien' || user?.systemRole === 'SuperAdmin';
};

/**
 * Vérifie si l'utilisateur peut voir toutes les entreprises
 * (Technicien, SuperAdmin, IRS)
 */
export const canViewAllCompanies = (user: User | null): boolean => {
  return user?.systemRole === 'Technicien' || 
         user?.systemRole === 'SuperAdmin' || 
         user?.systemRole === 'IRS';
};

/**
 * Vérifie si l'utilisateur a des permissions de lecture seule
 * (IRS peut voir mais pas modifier)
 */
export const isReadOnlyRole = (user: User | null): boolean => {
  return user?.systemRole === 'IRS';
};

/**
 * Vérifie si l'utilisateur peut effectuer des actions de modification
 * (Technicien et SuperAdmin peuvent modifier, IRS non)
 */
export const canModify = (user: User | null): boolean => {
  return isSuperAdminOrTechnicien(user) && !isReadOnlyRole(user);
};

/**
 * Vérifie si l'utilisateur doit apparaître dans les listes de membres
 * (Technicien n'apparaît jamais, IRS n'apparaît jamais, SuperAdmin apparaît si assigné)
 */
export const shouldAppearInMembers = (user: User | null): boolean => {
  if (user?.systemRole === 'Technicien' || user?.systemRole === 'IRS') {
    return false;
  }
  return true;
};

/**
 * Vérifie si l'utilisateur peut créer des entreprises
 */
export const canCreateCompanies = (user: User | null): boolean => {
  return user?.systemRole === 'Technicien' || user?.systemRole === 'SuperAdmin';
};

/**
 * Vérifie si l'utilisateur peut supprimer des entreprises
 */
export const canDeleteCompanies = (user: User | null): boolean => {
  return user?.systemRole === 'Technicien' || user?.systemRole === 'SuperAdmin';
};

/**
 * Vérifie si l'utilisateur peut modifier les paramètres d'une entreprise
 */
export const canModifyCompanySettings = (user: User | null): boolean => {
  return user?.systemRole === 'Technicien' || user?.systemRole === 'SuperAdmin';
};

/**
 * Obtient le libellé du rôle système pour l'affichage
 */
export const getSystemRoleLabel = (systemRole: string | undefined): string => {
  switch (systemRole) {
    case 'Technicien':
      return 'Technicien';
    case 'SuperAdmin':
      return 'Super Administrateur';
    case 'IRS':
      return 'Auditeur IRS';
    case 'User':
    default:
      return 'Utilisateur';
  }
};

/**
 * Obtient la couleur associée au rôle système
 */
export const getSystemRoleColor = (systemRole: string | undefined): string => {
  switch (systemRole) {
    case 'Technicien':
      return 'text-purple-600';
    case 'SuperAdmin':
      return 'text-red-600';
    case 'IRS':
      return 'text-blue-600';
    case 'User':
    default:
      return 'text-gray-600';
  }
};
