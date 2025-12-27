import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const LoginSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [hasProcessed, setHasProcessed] = useState(false);

  useEffect(() => {
    // Éviter les appels multiples
    if (hasProcessed) return;

    const error = searchParams.get('error');
    const token = searchParams.get('token');
    const userParam = searchParams.get('user');

    if (error) {
      setHasProcessed(true);
      toast.error('Erreur lors de la connexion Discord');
      navigate('/login', { replace: true });
      return;
    }

    if (token && userParam) {
      setHasProcessed(true);
      
      try {
        // Décoder l'URL avant de parser le JSON
        const decodedUser = decodeURIComponent(userParam);
        const userData = JSON.parse(decodedUser);
        
        // Sauvegarder dans localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        updateUser(userData);
        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error('Erreur lors du parsing des données utilisateur:', error);
        toast.error('Erreur lors de la récupération du profil');
        navigate('/login', { replace: true });
      }
    } else {
      setHasProcessed(true);
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate, hasProcessed]); // Suppression de updateUser des dépendances

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-foreground">Connexion en cours...</h2>
        <p className="text-muted-foreground mt-2">Finalisation de votre authentification Discord</p>
      </div>
    </div>
  );
};

export default LoginSuccessPage;
