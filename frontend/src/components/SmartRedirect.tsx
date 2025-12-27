import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const SmartRedirect: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    // Attendre que l'authentification soit chargée
    if (isLoading) return;
    
    // Éviter les redirections multiples
    if (hasRedirectedRef.current) return;

    hasRedirectedRef.current = true;
    
    if (user) {
      // Logs détaillés pour debugging
      console.log('🔍 SmartRedirect - Données utilisateur:', {
        username: user.username,
        systemRole: user.systemRole,
        isCompanyValidated: user.isCompanyValidated,
        company: user.company,
        companies: user.companies,
        companiesLength: user.companies?.length
      });
      
      // Si utilisateur connecté, vérifier s'il a une entreprise assignée
      const isUserAssignedToCompany = user?.isCompanyValidated === true && 
                                     (user?.company || (user?.companies && user.companies.length > 0));
      
      console.log('🔍 SmartRedirect - Vérification entreprise:', {
        isCompanyValidated: user?.isCompanyValidated,
        hasCompany: !!user?.company,
        hasCompanies: !!(user?.companies && user.companies.length > 0),
        isUserAssignedToCompany
      });
      
      // Si utilisateur est un technicien ou SuperAdmin, aller au dashboard
      if (user.systemRole === 'Technicien' || user.systemRole === 'SuperAdmin') {
        console.log(`🔧 SmartRedirect: ${user.systemRole} → dashboard`);
        navigate('/dashboard', { replace: true });
      }
      // Si utilisateur a une entreprise assignée, aller au dashboard
      else if (isUserAssignedToCompany) {
        console.log('✅ SmartRedirect: Utilisateur validé → dashboard');
        navigate('/dashboard', { replace: true });
      }
      // Sinon, rediriger vers company-code
      else {
        console.log('🚨 SmartRedirect: Utilisateur non validé → company-code');
        navigate('/company-code', { replace: true });
      }
    } else {
      // Si pas connecté, rediriger vers login
      console.log('❌ SmartRedirect: Non connecté → login');
      navigate('/login', { replace: true });
    }
  }, [user, isLoading, navigate]);

  // Afficher un loader pendant la redirection
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-foreground">Redirection...</h2>
      </div>
    </div>
  );
};

export default SmartRedirect;
