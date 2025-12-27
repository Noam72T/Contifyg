import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();


  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-foreground">Chargement...</h2>
        </div>
      </div>
    );
  }

  // Si l'utilisateur est connecté, vérifier s'il a une entreprise assignée
  if (user) {
    
    // Techniciens ont accès direct au dashboard
    if (user.systemRole === 'Technicien') {
      return <Navigate to="/dashboard" replace />;
    }
    
    // Vérifier si l'utilisateur a une entreprise assignée
    const hasCompany = user.isCompanyValidated && (user.company || (user.companies && user.companies.length > 0));
    
    if (hasCompany) {
      return <Navigate to="/dashboard" replace />;
    } else {
      return <Navigate to="/company-code" replace />;
    }
  }

  // Si l'utilisateur n'est pas connecté, afficher la page publique
  return <>{children}</>;
};

export default PublicRoute;
