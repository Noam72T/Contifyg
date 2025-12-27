import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    // Attendre que l'authentification soit chargée
    if (isLoading) return;
    
    // Éviter les redirections multiples
    if (hasRedirectedRef.current) return;

    // Vérifier si un token Discord est présent dans l'URL
    const urlParams = new URLSearchParams(location.search);
    const hasDiscordToken = urlParams.has('token') && urlParams.get('discord') === 'success';
    
    // Si un token Discord est présent, laisser le composant le traiter
    if (hasDiscordToken) {
      console.log('🔑 Token Discord détecté dans l\'URL - Pas de redirection');
      return;
    }

    // Si pas d'utilisateur connecté, rediriger vers login
    if (!user) {
      hasRedirectedRef.current = true;
      console.log('❌ Pas d\'utilisateur - Redirection vers /login');
      navigate('/login', { replace: true });
      return;
    }

    // AuthGuard se contente de vérifier l'authentification
    // La gestion du code d'entreprise est déléguée à CompanyCodeGuard

   
  }, [user, isLoading, navigate, location.pathname, location.search]);

  // Afficher un loader pendant le chargement
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

  // Vérifier si un token Discord est présent dans l'URL
  const urlParams = new URLSearchParams(location.search);
  const hasDiscordToken = urlParams.has('token') && urlParams.get('discord') === 'success';
  
  // Si pas d'utilisateur ET pas de token Discord, ne rien afficher (redirection en cours)
  if (!user && !hasDiscordToken) {
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;
