import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface CompanyCodeGuardProps {
  children: React.ReactNode;
}

const CompanyCodeGuard: React.FC<CompanyCodeGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    // Attendre que l'utilisateur soit chargé
    if (!user) {
      return;
    }

    // Si on est déjà sur la page my-accounts, add-account ou company-code, ne pas rediriger
    if (location.pathname === '/my-accounts' || location.pathname === '/add-account' || location.pathname === '/company-code') {
      return;
    }

    // Forcer une vérification du statut utilisateur à chaque navigation
    refreshUser().catch(console.error);

    // Si l'utilisateur est un Technicien ou SuperAdmin, il peut accéder à toutes les pages sans code
    if (user?.systemRole === 'Technicien' || user?.systemRole === 'SuperAdmin') {
      return; // Pas de redirection pour les Techniciens et SuperAdmins
    }

    // Vérifier si l'utilisateur est déjà assigné à une entreprise
    const isUserAssignedToCompany = user?.isCompanyValidated === true && 
                                   (user?.company || (user?.companies && user.companies.length > 0));

    if (isUserAssignedToCompany) {
      // L'utilisateur est déjà assigné à une entreprise
      return;
    }

    // Si l'utilisateur n'a pas d'entreprise assignée, rediriger vers my-accounts
    navigate('/my-accounts', { replace: true });
  }, [navigate, location.pathname, user, refreshUser]);

  return <>{children}</>;
};

export default CompanyCodeGuard;
