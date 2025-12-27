/**
 * Vérifie si l'utilisateur est un Technicien ou SuperAdmin (permissions complètes)
 */
const isSuperAdminOrTechnicien = (user) => {
  return user.systemRole === 'Technicien' || user.systemRole === 'SuperAdmin';
};

/**
 * Vérifie si l'utilisateur peut voir toutes les entreprises
 * (Technicien, SuperAdmin, IRS)
 */
const canViewAllCompanies = (user) => {
  return user.systemRole === 'Technicien' || 
         user.systemRole === 'SuperAdmin' || 
         user.systemRole === 'IRS';
};

/**
 * Vérifie si l'utilisateur a des permissions de lecture seule
 * (IRS peut voir mais pas modifier)
 */
const isReadOnlyRole = (user) => {
  return user.systemRole === 'IRS';
};

/**
 * Vérifie si l'utilisateur peut effectuer des actions de modification
 * (Technicien et SuperAdmin peuvent modifier, IRS non)
 */
const canModify = (user) => {
  return isSuperAdminOrTechnicien(user) && !isReadOnlyRole(user);
};

/**
 * Vérifie si l'utilisateur doit apparaître dans les listes de membres
 * (Technicien n'apparaît jamais, IRS n'apparaît jamais, SuperAdmin apparaît si assigné)
 */
const shouldAppearInMembers = (user) => {
  if (user.systemRole === 'Technicien' || user.systemRole === 'IRS') {
    return false;
  }
  return true;
};

/**
 * Vérifie si l'utilisateur peut créer des entreprises
 */
const canCreateCompanies = (user) => {
  return user.systemRole === 'Technicien' || user.systemRole === 'SuperAdmin';
};

/**
 * Vérifie si l'utilisateur peut supprimer des entreprises
 */
const canDeleteCompanies = (user) => {
  return user.systemRole === 'Technicien' || user.systemRole === 'SuperAdmin';
};

/**
 * Vérifie si l'utilisateur peut modifier les paramètres d'une entreprise
 */
const canModifyCompanySettings = (user) => {
  return user.systemRole === 'Technicien' || user.systemRole === 'SuperAdmin';
};

/**
 * Vérifie si l'utilisateur est membre d'une entreprise spécifique
 * (Technicien et IRS n'apparaissent jamais, SuperAdmin apparaît si assigné)
 */
const isMemberOfCompany = (user, companyId) => {
  // Technicien et IRS n'apparaissent jamais dans les membres
  if (user.systemRole === 'Technicien' || user.systemRole === 'IRS') {
    return false;
  }
  
  // SuperAdmin et autres utilisateurs apparaissent s'ils sont assignés
  return user.companies?.some(c => c.company.toString() === companyId);
};

/**
 * Obtient le libellé du rôle système pour l'affichage
 */
const getSystemRoleLabel = (systemRole) => {
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

module.exports = {
  isSuperAdminOrTechnicien,
  canViewAllCompanies,
  isReadOnlyRole,
  canModify,
  shouldAppearInMembers,
  canCreateCompanies,
  canDeleteCompanies,
  canModifyCompanySettings,
  isMemberOfCompany,
  getSystemRoleLabel
};
